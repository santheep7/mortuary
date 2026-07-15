import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery, generateBodyNumber, hospitalClause } from '../config/db.js';

export async function getBodyTypes(req, res) {
  try {
    const types = await queryAll('SELECT * FROM body_types');
    res.json(types);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getBodies(req, res) {
  try {
    const { status, bodyType, search } = req.query;
    // LEFT JOIN LATERAL fetches each body's latest allocation in the same
    // query instead of one extra round-trip per body (was O(n) queries).
    let query = `
      SELECT b.*, to_jsonb(alloc) AS allocation
      FROM bodies b
      LEFT JOIN LATERAL (
        SELECT ca.*, c."cabinNumber"
        FROM cabin_allocations ca
        JOIN cabins c ON ca."cabinId" = c.id
        WHERE ca."bodyId" = b.id
        ORDER BY ca."createdAt" DESC
        LIMIT 1
      ) alloc ON true
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status)   { query += ` AND b.status = $${idx++}`;     params.push(status); }
    if (bodyType) { query += ` AND b."bodyType" = $${idx++}`; params.push(bodyType); }
    if (search) {
      query += ` AND (b."patientName" ILIKE $${idx} OR b."bodyNumber" ILIKE $${idx+1} OR b."hospitalNumber" ILIKE $${idx+2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      idx += 3;
    }
    const hc = hospitalClause(req.hospitalId, idx, 'b.hospital_id');
    query += hc.sql; params.push(...hc.params);
    query += ' ORDER BY b."createdAt" DESC';

    const bodies = await queryAll(query, params);
    res.json(bodies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getBodyById(req, res) {
  try {
    const { id } = req.params;
    const hc = hospitalClause(req.hospitalId, 2);
    const body = await queryOne(`SELECT * FROM bodies WHERE id = $1${hc.sql}`, [id, ...hc.params]);
    if (!body) return res.status(404).json({ error: 'Body not found' });

    const allocation = await queryOne(`
      SELECT ca.*, c."cabinNumber"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      WHERE ca."bodyId" = $1
      ORDER BY ca."createdAt" DESC LIMIT 1
    `, [id]);

    const billing = await queryOne('SELECT * FROM billing WHERE "bodyId" = $1', [id]);
    res.json({ ...body, allocation, billing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getBodyAllocation(req, res) {
  try {
    const { id } = req.params;
    const hc = hospitalClause(req.hospitalId, 2, 'ca.hospital_id');
    const allocation = await queryOne(`
      SELECT ca.*, c."cabinNumber"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      WHERE ca."bodyId" = $1${hc.sql}
      ORDER BY ca."createdAt" DESC LIMIT 1
    `, [id, ...hc.params]);

    if (!allocation) return res.status(404).json({ error: 'No allocation found for this body' });
    res.json(allocation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function createBody(req, res) {
  try {
    const {
      bodyType, hospitalNumber, patientName, gender, age, locality,
      dateOfDeath, timeOfDeath, declaredBy, reasonOfDeath, deathIntimationNo, mlcNo,
      estimatedDaysOfStay,
      witness1Name, witness1Address, witness1Contact,
      witness2Name, witness2Address, witness2Contact,
      policeStationName, stationSiName, presentPoliceOfficerName, nocCertificateUrl, freezerRequired
    } = req.body;

    if (bodyType === 'MLC') {
      if (!policeStationName || !stationSiName || !presentPoliceOfficerName) {
        return res.status(400).json({ error: 'Police Station Name, SI Name, and Officer Name are mandatory for MLC cases.' });
      }
    }

    // SuperAdmin has no single hospital scope of their own (req.hospitalId is
    // null) - a body write on their behalf must say which hospital it's for.
    const hospitalId = req.hospitalId ?? req.body.hospitalId;
    if (!hospitalId) return res.status(400).json({ error: 'hospitalId is required' });

    const id         = uuidv4();
    const bodyNumber = await generateBodyNumber();
    const freezerReqValue = bodyType === 'MLC'
      ? (freezerRequired === false || freezerRequired === 0 || freezerRequired === '0' || freezerRequired === 'false' ? 0 : 1)
      : null;

    await runQuery(`
      INSERT INTO bodies (
        id, "bodyNumber", "bodyType", "hospitalNumber", "patientName", gender, age, locality,
        "dateOfDeath", "timeOfDeath", "declaredBy", "reasonOfDeath", "deathIntimationNo", "mlcNo",
        "estimatedDaysOfStay", "witness1Name", "witness1Address", "witness1Contact",
        "witness2Name", "witness2Address", "witness2Contact",
        "policeStationName", "stationSiName", "presentPoliceOfficerName",
        "nocCertificateUrl", "freezerRequired", hospital_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      )
    `, [
      id, bodyNumber, bodyType, hospitalNumber, patientName, gender, age, locality,
      dateOfDeath, timeOfDeath, declaredBy, reasonOfDeath, deathIntimationNo, mlcNo,
      estimatedDaysOfStay,
      witness1Name, witness1Address, witness1Contact,
      witness2Name, witness2Address, witness2Contact,
      policeStationName || null, stationSiName || null, presentPoliceOfficerName || null,
      nocCertificateUrl || null, freezerReqValue, hospitalId
    ]);

    const body = await queryOne('SELECT * FROM bodies WHERE id = $1', [id]);
    res.json(body);
  } catch (error) {
    console.error('Error registering body:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function updateBody(req, res) {
  try {
    const { id } = req.params;
    const fields = req.body;
    const setClauses = [];
    const values    = [];
    let idx = 1;

    // Map camelCase keys to quoted PG column names
    const pgKey = (key) => {
      // columns that are stored lowercase in PG
      const lower = ['status', 'gender', 'age', 'locality', 'address', 'billing_status'];
      return lower.includes(key) ? key : `"${key}"`;
    };

    for (const [key, value] of Object.entries(fields)) {
      // id and hospital_id are never client-settable - hospital_id especially
      // must not be overwritable here, or a request could move a body to a
      // different hospital and defeat tenant isolation entirely.
      if (key !== 'id' && key !== 'hospital_id') {
        setClauses.push(`${pgKey(key)} = $${idx++}`);
        values.push(value);
      }
    }

    if (setClauses.length > 0) {
      setClauses.push(`"updatedAt" = NOW()`);
      values.push(id);
      const hc = hospitalClause(req.hospitalId, idx + 1);
      values.push(...hc.params);
      await runQuery(`UPDATE bodies SET ${setClauses.join(', ')} WHERE id = $${idx}${hc.sql}`, values);
    }

    const hc2 = hospitalClause(req.hospitalId, 2);
    const body = await queryOne(`SELECT * FROM bodies WHERE id = $1${hc2.sql}`, [id, ...hc2.params]);
    res.json(body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function deleteBody(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Body ID is required' });

    const hc = hospitalClause(req.hospitalId, 2);
    const body = await queryOne(`SELECT id FROM bodies WHERE id = $1${hc.sql} LIMIT 1`, [id, ...hc.params]);
    if (!body) return res.status(404).json({ error: 'Body not found' });

    const allocation = await queryOne('SELECT id FROM cabin_allocations WHERE "bodyId" = $1 LIMIT 1', [id]);
    if (allocation) {
      return res.status(400).json({ error: 'Cannot delete body with active allocations. Please release the cabin first.' });
    }

    const result = await runQuery('DELETE FROM bodies WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(500).json({ error: 'Delete failed' });

    res.json({ message: 'Body deleted successfully' });
  } catch (error) {
    console.error('DELETE BODY ERROR:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getMlcRegistration(req, res) {
  try {
    const { bodyId } = req.params;
    const hc = hospitalClause(req.hospitalId, 2);
    const body = await queryOne(`SELECT * FROM bodies WHERE id = $1${hc.sql}`, [bodyId, ...hc.params]);
    if (!body) return res.status(404).json({ error: 'Body not found' });
    if (body.bodyType !== 'MLC') {
      return res.status(400).json({ error: 'This body is not an MLC case.' });
    }
    res.json(body);
  } catch (error) {
    console.error('MLC REGISTRATION ERROR:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getConcessionAuthorities(req, res) {
  try {
    const hc = hospitalClause(req.hospitalId, 1);
    const authorities = await queryAll(`SELECT * FROM concession_authorities WHERE "isActive" = 1${hc.sql}`, hc.params);
    res.json(authorities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function createConcessionAuthority(req, res) {
  try {
    const { name, designation, department, maxDiscountPercent } = req.body;
    const hospitalId = req.hospitalId ?? req.body.hospitalId;
    if (!hospitalId) return res.status(400).json({ error: 'hospitalId is required' });

    const id = uuidv4();
    await runQuery(
      'INSERT INTO concession_authorities (id, name, designation, department, "maxDiscountPercent", hospital_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, designation, department, maxDiscountPercent || 100, hospitalId]
    );
    const authority = await queryOne('SELECT * FROM concession_authorities WHERE id = $1', [id]);
    res.json(authority);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function deleteConcessionAuthority(req, res) {
  try {
    const { id } = req.params;
    const hc = hospitalClause(req.hospitalId, 2);
    await runQuery(`UPDATE concession_authorities SET "isActive" = 0 WHERE id = $1${hc.sql}`, [id, ...hc.params]);
    res.json({ message: 'Concession authority deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
