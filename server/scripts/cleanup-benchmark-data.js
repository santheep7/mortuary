import 'dotenv/config';
import { pool, queryOne } from '../config/db.js';

const CLIENT_ID = 'BENCH01';

async function main() {
  const hospital = await queryOne('SELECT id FROM hospitals WHERE client_id = $1', [CLIENT_ID]);
  if (!hospital) {
    console.log('No benchmark hospital found, nothing to clean up.');
    await pool.end();
    return;
  }
  const hospitalId = hospital.id;

  const tables = [
    'billing', 'cabin_allocations', 'bodies', 'cabins',
    'system_settings', 'users',
  ];
  for (const table of tables) {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE hospital_id = $1`, [hospitalId]);
    console.log(`Deleted ${rowCount} row(s) from ${table}`);
  }
  await pool.query('DELETE FROM hospitals WHERE id = $1', [hospitalId]);
  console.log(`Deleted benchmark hospital ${hospitalId}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error('Cleanup failed:', err);
  await pool.end();
  process.exit(1);
});
