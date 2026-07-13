import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../config/db.js';

function formatPgDateTime(date) {
  // Preserve local timezone instead of converting to UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function createAllocation(req, res) {
  try {
    const { bodyId, cabinId, advanceAmount, estimatedDaysOfStay } = req.body;

    if (!bodyId || !cabinId)
      return res.status(400).json({ error: 'bodyId and cabinId are required' });

    const settings      = await queryOne('SELECT first_day_charge FROM system_settings LIMIT 1');
    const firstDayCharge = settings ? Number(settings.first_day_charge) : 2100;

    const parsedAdvance = parseFloat(advanceAmount);
    if (isNaN(parsedAdvance) || parsedAdvance < firstDayCharge) {
      return res.status(400).json({ error: `Advance collection is mandatory and must be at least ₹${firstDayCharge}` });
    }

    const existing = await queryOne(
      "SELECT * FROM cabin_allocations WHERE \"bodyId\" = $1 AND status = 'Allocated'",
      [bodyId]
    );
    if (existing) return res.status(400).json({ error: 'Body already has an active cabin allocation' });

    const bodyRecord = await queryOne('SELECT "bodyType", "freezerRequired" FROM bodies WHERE id = $1', [bodyId]);
    if (bodyRecord && bodyRecord.bodyType === 'MLC' && bodyRecord.freezerRequired === 0) {
      return res.status(400).json({
        error: 'This MLC case does not require a freezer. Cabin allocation is not applicable.'
      });
    }

    const daysOfStay = parseInt(estimatedDaysOfStay) || 3;

    const admissionDateTime          = new Date();
    const estimatedReleaseDateTime   = new Date(admissionDateTime);
    estimatedReleaseDateTime.setDate(estimatedReleaseDateTime.getDate() + daysOfStay);
    estimatedReleaseDateTime.setHours(23, 59, 0, 0);

    const admissionStr = formatPgDateTime(admissionDateTime);
    const estimatedStr = formatPgDateTime(estimatedReleaseDateTime);

    const id = uuidv4();
    await runQuery(`
      INSERT INTO cabin_allocations
        (id, "bodyId", "cabinId", "admissionDateTime", "advanceAmount",
         "hourlyRate", "minHours", "freeHours", "estimatedReleaseDateTime")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, bodyId, cabinId, admissionStr, advanceAmount || 0, firstDayCharge, 1, 0, estimatedStr]);

    await runQuery("UPDATE cabins SET status = 'Occupied' WHERE id = $1", [cabinId]);
    await runQuery("UPDATE bodies SET status = 'Allocated' WHERE id = $1", [bodyId]);

    const allocation = await queryOne(`
      SELECT ca.*, c."cabinNumber", b."patientName", b."bodyNumber"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      JOIN bodies b ON ca."bodyId" = b.id
      WHERE ca.id = $1
    `, [id]);

    res.json(allocation);
  } catch (error) {
    console.error('Error allocating cabin:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAllocations(req, res) {
  try {
    const { status } = req.query;
    let query = `
      SELECT ca.*, c."cabinNumber", c.status AS "cabinStatus",
             b."patientName", b."bodyNumber", b."bodyType"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      JOIN bodies b ON ca."bodyId" = b.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND ca.status = $1'; params.push(status); }
    query += ' ORDER BY ca."createdAt" DESC';

    const allocations = await queryAll(query, params);
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function releaseAllocation(req, res) {
  try {
    const { id } = req.params;
    const allocation = await queryOne('SELECT * FROM cabin_allocations WHERE id = $1', [id]);
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    const body = await queryOne('SELECT billing_status FROM bodies WHERE id = $1', [allocation.bodyId]);
    if (!body || body.billing_status !== 'SETTLED') {
      return res.status(400).json({ error: 'Bill must be settled before release' });
    }

    await runQuery("UPDATE cabin_allocations SET status = 'Released' WHERE id = $1", [id]);
    res.json({ message: 'Marked as released successfully', releaseDateTime: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function extendAllocation(req, res) {
  try {
    const { id } = req.params;
    const { expectedReleaseDateTime } = req.body;

    const allocation = await queryOne('SELECT * FROM cabin_allocations WHERE id = $1', [id]);
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    // Accept ISO or any parseable date string
    const pgDateTime = expectedReleaseDateTime
      ? new Date(expectedReleaseDateTime).toISOString()
      : null;

    await runQuery('UPDATE cabin_allocations SET "releaseDateTime" = $1 WHERE id = $2', [pgDateTime, id]);
    res.json({ message: 'Release date updated successfully', releaseDateTime: pgDateTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function calculateAllocation(req, res) {
  try {
    const { id } = req.params;
    const allocation = await queryOne('SELECT * FROM cabin_allocations WHERE id = $1', [id]);
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    const settings    = await queryOne('SELECT first_day_charge, hourly_charge_after_24hrs FROM system_settings LIMIT 1');
    const firstDayCharge = settings ? Number(settings.first_day_charge) : 2100;
    const hourlyRate     = settings ? Number(settings.hourly_charge_after_24hrs) : 130;

    const admissionDate = new Date(allocation.admissionDateTime);
    const endDate       = allocation.releaseDateTime ? new Date(allocation.releaseDateTime) : new Date();
    const diffMs        = endDate - admissionDate;
    const totalHours    = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

    let extraHours = 0, additionalHourCharges = 0, totalAmount = 0;

    if (totalHours <= 24) {
      totalAmount = firstDayCharge;
    } else {
      extraHours             = totalHours - 24;
      additionalHourCharges  = extraHours * hourlyRate;
      totalAmount            = firstDayCharge + additionalHourCharges;
    }

    const advance     = Number(allocation.advanceAmount) || 0;
    const finalAmount = Math.max(0, totalAmount - advance);

    // Format currentDateTime in local timezone
    const currentDateTimeStr = formatPgDateTime(endDate);

    res.json({
      admissionDateTime: allocation.admissionDateTime,
      currentDateTime:   currentDateTimeStr,
      totalHours,
      firstDayCharge,
      extraHours,
      hourlyRate,
      additionalHourCharges,
      totalAmount:   totalAmount.toFixed(2),
      advanceAmount: advance,
      finalAmount:   finalAmount.toFixed(2),
      days:          Math.ceil(totalHours / 24),
      dailyRate:     firstDayCharge
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
