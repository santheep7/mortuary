import { v4 as uuidv4 } from 'uuid';
import { queryOne, runQuery } from '../config/db.js';

export async function getBillingSettings(req, res) {
  try {
    const settings = await queryOne('SELECT * FROM system_settings LIMIT 1');
    if (!settings) {
      return res.json({
        mortuary_name: 'MOSC Medical College Mortuary',
        first_day_charge: 2100.00,
        hourly_charge_after_24hrs: 130.00,
        updated_by: 'System',
        updated_at: new Date().toISOString()
      });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getMortuaryName(req, res) {
  try {
    const settings = await queryOne('SELECT mortuary_name FROM system_settings LIMIT 1');
    if (!settings) {
      return res.json({ mortuary_name: 'MOSC Medical College Mortuary' });
    }
    res.json({ mortuary_name: settings.mortuary_name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function updateMortuaryName(req, res) {
  try {
    const { mortuary_name, updated_by } = req.body;

    if (!mortuary_name || typeof mortuary_name !== 'string' || !mortuary_name.trim())
      return res.status(400).json({ error: 'mortuary_name is required' });

    const cleanName = mortuary_name.trim();

    let settings = await queryOne('SELECT id FROM system_settings LIMIT 1');
    const id = settings ? settings.id : uuidv4();

    if (settings) {
      await runQuery(
        'UPDATE system_settings SET mortuary_name=$1, updated_by=$2, updated_at=NOW() WHERE id=$3',
        [cleanName, updated_by || 'SuperAdmin', id]
      );
    } else {
      await runQuery(
        'INSERT INTO system_settings (id, mortuary_name, updated_by) VALUES ($1,$2,$3)',
        [id, cleanName, updated_by || 'SuperAdmin']
      );
    }

    const updatedSettings = await queryOne('SELECT mortuary_name FROM system_settings WHERE id = $1', [id]);
    res.json({ message: 'Mortuary name updated successfully', mortuary_name: updatedSettings.mortuary_name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function uploadMortuaryLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    const updated_by = req.body.updated_by || 'SuperAdmin';

    let settings = await queryOne('SELECT id FROM system_settings LIMIT 1');
    const id = settings ? settings.id : uuidv4();

    if (settings) {
      await runQuery(
        'UPDATE system_settings SET mortuary_logo=$1, updated_by=$2, updated_at=NOW() WHERE id=$3',
        [logoUrl, updated_by, id]
      );
    } else {
      await runQuery(
        'INSERT INTO system_settings (id, mortuary_logo, updated_by) VALUES ($1,$2,$3)',
        [id, logoUrl, updated_by]
      );
    }

    const updatedSettings = await queryOne('SELECT mortuary_logo FROM system_settings WHERE id = $1', [id]);
    res.json({ message: 'Logo uploaded successfully', mortuary_logo: updatedSettings.mortuary_logo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getMortuaryLogo(req, res) {
  try {
    const settings = await queryOne('SELECT mortuary_logo FROM system_settings LIMIT 1');
    if (!settings || !settings.mortuary_logo) {
      return res.json({ mortuary_logo: null });
    }
    res.json({ mortuary_logo: settings.mortuary_logo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function updateBillingSettings(req, res) {
  try {
    const { first_day_charge, hourly_charge_after_24hrs, updated_by } = req.body;

    if (first_day_charge === undefined || hourly_charge_after_24hrs === undefined)
      return res.status(400).json({ error: 'first_day_charge and hourly_charge_after_24hrs are required' });

    const firstDay = parseFloat(first_day_charge);
    const hourly   = parseFloat(hourly_charge_after_24hrs);

    if (isNaN(firstDay) || isNaN(hourly) || firstDay < 0 || hourly < 0)
      return res.status(400).json({ error: 'Charges must be non-negative numbers' });

    let settings = await queryOne('SELECT id FROM system_settings LIMIT 1');
    const id = settings ? settings.id : uuidv4();

    if (settings) {
      await runQuery(
        'UPDATE system_settings SET first_day_charge=$1, hourly_charge_after_24hrs=$2, updated_by=$3, updated_at=NOW() WHERE id=$4',
        [firstDay, hourly, updated_by || 'Admin', id]
      );
    } else {
      await runQuery(
        'INSERT INTO system_settings (id, first_day_charge, hourly_charge_after_24hrs, updated_by) VALUES ($1,$2,$3,$4)',
        [id, firstDay, hourly, updated_by || 'Admin']
      );
    }

    const updatedSettings = await queryOne('SELECT * FROM system_settings WHERE id = $1', [id]);
    res.json({ message: 'Settings updated successfully', settings: updatedSettings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
