import 'dotenv/config';
import { pool, queryAll, queryOne } from '../config/db.js';

const hospitalId = process.argv[2];

async function benchOldN1() {
  const t0 = performance.now();
  const bodies = await queryAll('SELECT * FROM bodies WHERE hospital_id = $1 ORDER BY "createdAt" DESC', [hospitalId]);
  for (const body of bodies) {
    body.allocation = await queryOne(`
      SELECT ca.*, c."cabinNumber"
      FROM cabin_allocations ca
      JOIN cabins c ON ca."cabinId" = c.id
      WHERE ca."bodyId" = $1
      ORDER BY ca."createdAt" DESC LIMIT 1
    `, [body.id]);
  }
  const t1 = performance.now();
  return { ms: t1 - t0, rowCount: bodies.length, queryCount: 1 + bodies.length };
}

async function benchNewJoin() {
  const t0 = performance.now();
  const bodies = await queryAll(`
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
  `, [hospitalId]);
  const t1 = performance.now();
  return { ms: t1 - t0, rowCount: bodies.length, queryCount: 1 };
}

console.log('Running old N+1 pattern (this will be slow - that is the point)...');
const oldResult = await benchOldN1();
console.log(`  OLD: ${oldResult.ms.toFixed(1)} ms, ${oldResult.queryCount} DB round-trips, ${oldResult.rowCount} rows`);

console.log('Running current single JOIN LATERAL query...');
const newResult = await benchNewJoin();
console.log(`  NEW: ${newResult.ms.toFixed(1)} ms, ${newResult.queryCount} DB round-trip, ${newResult.rowCount} rows`);

console.log(`\nSpeedup: ${(oldResult.ms / newResult.ms).toFixed(1)}x faster`);
console.log(`Round-trips avoided: ${oldResult.queryCount - newResult.queryCount}`);

await pool.end();
