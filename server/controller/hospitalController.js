import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { queryAll, queryOne, runQuery } from '../config/db.js';
import { compressImage } from '../config/imageCompress.js';

const PRICING_MODELS = ['tiered_flat_hourly', 'flat_daily', 'free'];

// defaults: what to fall back to for any field the caller omits. Creation
// falls back to fixed sane defaults; updates must fall back to the
// hospital's own existing settings, or an omitted field would silently reset
// to a hardcoded default instead of staying unchanged.
function validatePricing(body, defaults) {
  const pricing_model = body.pricing_model ?? defaults.pricing_model;
  if (!PRICING_MODELS.includes(pricing_model)) {
    return { error: 'Invalid pricing_model' };
  }
  const first_day_charge          = parseFloat(body.first_day_charge ?? defaults.first_day_charge);
  const hourly_charge_after_24hrs = parseFloat(body.hourly_charge_after_24hrs ?? defaults.hourly_charge_after_24hrs);
  const daily_rate                = parseFloat(body.daily_rate ?? defaults.daily_rate);
  const staff_discount_percent    = parseFloat(body.staff_discount_percent ?? defaults.staff_discount_percent);

  if ([first_day_charge, hourly_charge_after_24hrs, daily_rate].some(n => isNaN(n) || n < 0)) {
    return { error: 'Pricing charges must be non-negative numbers' };
  }
  if (isNaN(staff_discount_percent) || staff_discount_percent < 0 || staff_discount_percent > 100) {
    return { error: 'staff_discount_percent must be between 0 and 100' };
  }
  return { pricing_model, first_day_charge, hourly_charge_after_24hrs, daily_rate, staff_discount_percent };
}

const CREATION_PRICING_DEFAULTS = {
  pricing_model: 'tiered_flat_hourly', first_day_charge: 2100, hourly_charge_after_24hrs: 130,
  daily_rate: 500, staff_discount_percent: 100,
};

// ── Create hospital + its first Admin account (one no-code onboarding step) ──
export async function createHospital(req, res) {
  try {
    const { name, contact_email, contact_phone, address, adminUsername, adminPassword } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ error: 'Hospital name is required' });
    if (!adminUsername || !adminPassword)
      return res.status(400).json({ error: 'An initial Admin username and password are required' });
    if (adminPassword.length < 8)
      return res.status(400).json({ error: 'Admin password must be at least 8 characters' });

    const pricing = validatePricing(req.body, CREATION_PRICING_DEFAULTS);
    if (pricing.error) return res.status(400).json({ error: pricing.error });

    const existingAdmin = await queryOne('SELECT id FROM admin WHERE username = $1', [adminUsername]);
    if (existingAdmin) return res.status(400).json({ error: 'That admin username is already taken' });

    let logoUrl = null;
    if (req.file) {
      await compressImage(req.file.path, 400);
      logoUrl = `/uploads/${req.file.filename}`;
    }

    const hospitalId = uuidv4();
    await runQuery(
      'INSERT INTO hospitals (id, name, logo, contact_email, contact_phone, address) VALUES ($1,$2,$3,$4,$5,$6)',
      [hospitalId, name.trim(), logoUrl, contact_email || null, contact_phone || null, address || null]
    );

    await runQuery(
      `INSERT INTO system_settings
         (id, hospital_id, mortuary_name, first_day_charge, hourly_charge_after_24hrs,
          pricing_model, daily_rate, staff_discount_percent, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(), hospitalId, name.trim(), pricing.first_day_charge, pricing.hourly_charge_after_24hrs,
        pricing.pricing_model, pricing.daily_rate, pricing.staff_discount_percent, 'SuperAdmin',
      ]
    );

    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await runQuery(
      'INSERT INTO admin (id, username, email, password, hospital_id) VALUES ($1,$2,$3,$4,$5)',
      [adminId, adminUsername, contact_email || null, hashedPassword, hospitalId]
    );

    const hospital = await queryOne('SELECT * FROM hospitals WHERE id = $1', [hospitalId]);
    res.status(201).json({ message: 'Hospital onboarded successfully', hospital, adminUsername });
  } catch (error) {
    console.error('Create hospital error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'That admin username is already taken' });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

// ── List hospitals (SuperAdmin overview) ─────────────────────────────────────
export async function listHospitals(req, res) {
  try {
    const hospitals = await queryAll(`
      SELECT
        h.*,
        COALESCE(b."bodyCount", 0)  AS "bodyCount",
        COALESCE(a."adminCount", 0) AS "adminCount",
        s.pricing_model, s.first_day_charge, s.hourly_charge_after_24hrs,
        s.daily_rate, s.staff_discount_percent
      FROM hospitals h
      LEFT JOIN system_settings s ON s.hospital_id = h.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS "bodyCount" FROM bodies WHERE hospital_id = h.id
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS "adminCount" FROM admin WHERE hospital_id = h.id
      ) a ON true
      ORDER BY h."createdAt" DESC
    `);
    res.json(hospitals);
  } catch (error) {
    console.error('List hospitals error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

// ── Hospital detail (edit form) ───────────────────────────────────────────────
export async function getHospital(req, res) {
  try {
    const { id } = req.params;
    const hospital = await queryOne('SELECT * FROM hospitals WHERE id = $1', [id]);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const settings = await queryOne('SELECT * FROM system_settings WHERE hospital_id = $1', [id]);
    res.json({ ...hospital, settings });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

// ── Update hospital info + pricing (and optionally deactivate) ───────────────
export async function updateHospital(req, res) {
  try {
    const { id } = req.params;
    const { name, contact_email, contact_phone, address, is_active } = req.body;

    const hospital = await queryOne('SELECT id FROM hospitals WHERE id = $1', [id]);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const existingSettings = await queryOne('SELECT * FROM system_settings WHERE hospital_id = $1', [id]);
    const pricing = validatePricing(req.body, existingSettings || CREATION_PRICING_DEFAULTS);
    if (pricing.error) return res.status(400).json({ error: pricing.error });

    let logoUrl = null;
    if (req.file) {
      await compressImage(req.file.path, 400);
      logoUrl = `/uploads/${req.file.filename}`;
    }

    await runQuery(
      `UPDATE hospitals SET
         name = COALESCE($1, name),
         contact_email = COALESCE($2, contact_email),
         contact_phone = COALESCE($3, contact_phone),
         address = COALESCE($4, address),
         is_active = COALESCE($5, is_active),
         logo = COALESCE($6, logo),
         "updatedAt" = NOW()
       WHERE id = $7`,
      [name?.trim() || null, contact_email || null, contact_phone || null, address || null,
       is_active === undefined ? null : (is_active === true || is_active === 'true'),
       logoUrl, id]
    );

    await runQuery(
      `UPDATE system_settings SET
         first_day_charge = $1, hourly_charge_after_24hrs = $2,
         pricing_model = $3, daily_rate = $4, staff_discount_percent = $5,
         updated_by = $6, updated_at = NOW()
       WHERE hospital_id = $7`,
      [pricing.first_day_charge, pricing.hourly_charge_after_24hrs, pricing.pricing_model,
       pricing.daily_rate, pricing.staff_discount_percent, 'SuperAdmin', id]
    );

    const updated = await queryOne('SELECT * FROM hospitals WHERE id = $1', [id]);
    const settings = await queryOne('SELECT * FROM system_settings WHERE hospital_id = $1', [id]);
    res.json({ message: 'Hospital updated successfully', hospital: updated, settings });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
