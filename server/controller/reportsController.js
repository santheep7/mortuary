import { queryAll } from '../config/db.js';

export async function getCabinOccupancy(req, res) {
  try {
    const { startDate, endDate, cabinNo, bodyType } = req.query;
    let query = `
      SELECT
        ca.*,
        c."cabinNumber",
        b."patientName",
        b."bodyNumber",
        b."bodyType",
        ca."admissionDateTime",
        ca."releaseDateTime",
        EXTRACT(EPOCH FROM (COALESCE(ca."releaseDateTime", NOW()) - ca."admissionDateTime")) / 3600
          AS "durationHours"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      JOIN bodies b ON ca."bodyId" = b.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (startDate) { query += ` AND ca."admissionDateTime" >= $${idx++}`; params.push(startDate); }
    if (endDate)   { query += ` AND ca."admissionDateTime" <= $${idx++}`; params.push(endDate); }
    if (cabinNo)   { query += ` AND c."cabinNumber" = $${idx++}`;         params.push(cabinNo); }
    if (bodyType)  { query += ` AND b."bodyType" = $${idx++}`;            params.push(bodyType); }

    query += ' ORDER BY ca."admissionDateTime" DESC';
    const data = await queryAll(query, params);

    const summary = {
      totalAllocations: data.length,
      occupied:    data.filter(d => !d.releaseDateTime).length,
      released:    data.filter(d =>  d.releaseDateTime).length,
      mlcCases:    data.filter(d => d.bodyType === 'MLC').length,
      nonMlcCases: data.filter(d => d.bodyType === 'Non-MLC').length
    };

    res.json({ data, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getInvoiceAnalysis(req, res) {
  try {
    const { startDate, endDate, status } = req.query;
    let query = `
      SELECT b.*, bo."patientName", bo."bodyNumber", bo."bodyType"
      FROM billing b
      JOIN bodies bo ON b."bodyId" = bo.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (startDate) { query += ` AND b."createdAt" >= $${idx++}`; params.push(startDate); }
    if (endDate)   { query += ` AND b."createdAt" <= $${idx++}`; params.push(endDate); }
    if (status)    { query += ` AND b.status = $${idx++}`;        params.push(status); }
    query += ' ORDER BY b."createdAt" DESC';

    const data    = await queryAll(query, params);
    const summary = {
      totalBills:     data.length,
      totalAmount:    data.reduce((s, d) => s + (Number(d.totalAmount)  || 0), 0),
      totalDiscount:  data.reduce((s, d) => s + (Number(d.discountAmount) || 0), 0),
      totalNetAmount: data.reduce((s, d) => s + (Number(d.netAmount)    || 0), 0),
      settled: data.filter(d => d.status === 'Settled').length,
      pending: data.filter(d => d.status === 'Pending').length
    };

    res.json({ data, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function getConcessionReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT
        b.id, b."discountAmount", b."discountReason", b."createdAt",
        bo."patientName", bo."bodyNumber",
        ca.name AS "authorityName", ca.designation
      FROM billing b
      JOIN bodies bo ON b."bodyId" = bo.id
      LEFT JOIN concession_authorities ca ON b."concessionAuthorityId" = ca.id
      WHERE b."discountAmount" > 0
    `;
    const params = [];
    let idx = 1;

    if (startDate) { query += ` AND b."createdAt" >= $${idx++}`; params.push(startDate); }
    if (endDate)   { query += ` AND b."createdAt" <= $${idx++}`; params.push(endDate); }
    query += ' ORDER BY b."createdAt" DESC';

    const data    = await queryAll(query, params);
    const summary = {
      totalConcessions: data.length,
      totalAmount: data.reduce((s, d) => s + (Number(d.discountAmount) || 0), 0)
    };

    res.json({ data, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
