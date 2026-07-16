import 'dotenv/config';
import { pool } from '../config/db.js';

const hospitalId = process.argv[2];
const ITERATIONS = 20;

const OLD_QUERY = `
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
  WHERE b.hospital_id = $1
  ORDER BY b."createdAt" DESC
`;

const NEW_QUERY = `
  SELECT
    b.id, b."bodyNumber", b."bodyType", b."hospitalNumber", b."patientName",
    b.gender, b.age, b."dateOfDeath", b."timeOfDeath",
    b."mlcNo", b."estimatedDaysOfStay",
    b."witness1Name", b."witness1Contact", b."witness2Name", b."witness2Contact",
    b.billing_status, b.status, b."freezerRequired",
    b."createdAt", b."updatedAt", b.hospital_id,
    to_jsonb(alloc) AS allocation
  FROM bodies b
  LEFT JOIN LATERAL (
    SELECT ca.*, c."cabinNumber"
    FROM cabin_allocations ca
    JOIN cabins c ON ca."cabinId" = c.id
    WHERE ca."bodyId" = b.id
    ORDER BY ca."createdAt" DESC
    LIMIT 1
  ) alloc ON true
  WHERE b.hospital_id = $1
  ORDER BY b."createdAt" DESC
`;

async function bench(label, sql) {
  let totalQueryMs = 0;
  let totalSerializeMs = 0;
  let payloadBytes = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    const { rows } = await pool.query(sql, [hospitalId]);
    const t1 = performance.now();
    const json = JSON.stringify(rows);
    const t2 = performance.now();

    totalQueryMs += (t1 - t0);
    totalSerializeMs += (t2 - t1);
    payloadBytes = json.length; // same every iteration
  }

  console.log(`\n[${label}]`);
  console.log(`  avg query time:      ${(totalQueryMs / ITERATIONS).toFixed(2)} ms`);
  console.log(`  avg serialize time:  ${(totalSerializeMs / ITERATIONS).toFixed(2)} ms`);
  console.log(`  avg total:           ${((totalQueryMs + totalSerializeMs) / ITERATIONS).toFixed(2)} ms`);
  console.log(`  payload size:        ${payloadBytes} bytes`);
}

await bench('OLD - SELECT b.*', OLD_QUERY);
await bench('NEW - explicit columns', NEW_QUERY);

await pool.end();
