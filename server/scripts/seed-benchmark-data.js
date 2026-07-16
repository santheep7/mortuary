import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { pool, queryOne, queryAll, runQuery } from '../config/db.js';

// Isolated fake hospital used only for CPU/latency benchmarking. Every table
// touched here is scoped to this one hospital_id, so it never mixes with
// MOSC's or Sun Hospital's real data on the shared team database - cleanup
// afterward is a single DELETE WHERE hospital_id = <this id> per table.
const CLIENT_ID = 'BENCH01';
const BODY_COUNT = 800;

const FIRST_NAMES = ['Ravi', 'Anitha', 'Suresh', 'Priya', 'Manoj', 'Deepa', 'Arjun', 'Kavya'];
const LAST_NAMES  = ['Kumar', 'Nair', 'Menon', 'Pillai', 'Varma', 'Das', 'Iyer', 'Rao'];
const STATUSES    = ['Registered', 'Allocated', 'Released'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  let hospital = await queryOne('SELECT id FROM hospitals WHERE client_id = $1', [CLIENT_ID]);
  let hospitalId = hospital?.id;

  if (!hospitalId) {
    hospitalId = uuidv4();
    await runQuery(
      'INSERT INTO hospitals (id, name, client_id, is_active) VALUES ($1, $2, $3, true)',
      [hospitalId, 'Benchmark Test Hospital (safe to delete)', CLIENT_ID]
    );
    console.log(`Created benchmark hospital ${hospitalId}`);
  } else {
    console.log(`Reusing existing benchmark hospital ${hospitalId}`);
  }

  const settings = await queryOne('SELECT id FROM system_settings WHERE hospital_id = $1', [hospitalId]);
  if (!settings) {
    await runQuery(
      'INSERT INTO system_settings (id, hospital_id, first_day_charge, hourly_charge_after_24hrs) VALUES ($1, $2, $3, $4)',
      [uuidv4(), hospitalId, 2100.00, 130.00]
    );
  }

  const existingUser = await queryOne('SELECT id FROM users WHERE employee_id = $1', ['BENCHSTAFF01']);
  if (!existingUser) {
    const hash = await bcrypt.hash('benchmark123', 12);
    await runQuery(
      `INSERT INTO users (full_name, employee_id, department, phone1, email, password, approval_status, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7)`,
      ['Benchmark Staff', 'BENCHSTAFF01', 'Testing', '9999999999', 'benchstaff01@example.com', hash, hospitalId]
    );
    console.log('Created login: employee_id=BENCHSTAFF01 password=benchmark123');
  }

  const cabinIds = [];
  const existingCabins = await queryAll('SELECT id FROM cabins WHERE hospital_id = $1', [hospitalId]);
  if (existingCabins.length > 0) {
    cabinIds.push(...existingCabins.map(c => c.id));
  } else {
    for (let i = 1; i <= 20; i++) {
      const id = uuidv4();
      await runQuery(
        'INSERT INTO cabins (id, "cabinNumber", status, tariff, hospital_id) VALUES ($1, $2, $3, $4, $5)',
        [id, `BENCH-CAB-${i.toString().padStart(3, '0')}`, 'Available', 500, hospitalId]
      );
      cabinIds.push(id);
    }
  }

  const { rows: countRows } = await pool.query('SELECT COUNT(*) AS count FROM bodies WHERE hospital_id = $1', [hospitalId]);
  const already = parseInt(countRows[0].count, 10);
  const toCreate = Math.max(0, BODY_COUNT - already);
  console.log(`Bodies already seeded: ${already}. Creating ${toCreate} more...`);

  for (let i = 0; i < toCreate; i++) {
    const bodyId = uuidv4();
    const num = already + i + 1;
    const status = pick(STATUSES);
    await runQuery(
      `INSERT INTO bodies (
        id, "bodyNumber", "bodyType", "hospitalNumber", "patientName", gender, age, locality,
        "dateOfDeath", "timeOfDeath", "declaredBy", "reasonOfDeath",
        "witness1Name", "witness1Address", "witness1Contact",
        "witness2Name", "witness2Address", "witness2Contact",
        status, billing_status, hospital_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        bodyId, `${CLIENT_ID}-BENCH-${num.toString().padStart(5, '0')}`, 'Non-MLC', `HN-${num}`,
        `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, pick(['Male', 'Female']), 40 + (num % 50), 'Test Locality',
        '2026-01-01', '10:00', 'Dr. Test', 'Natural causes',
        'Witness One', '123 Test Street, benchmark data only', '9000000000',
        'Witness Two', '456 Test Street, benchmark data only', '9000000001',
        status, pick(['PENDING', 'PAID']), hospitalId
      ]
    );

    if (status !== 'Registered') {
      const cabinId = pick(cabinIds);
      await runQuery(
        `INSERT INTO cabin_allocations (id, "bodyId", "cabinId", "hourlyRate", status, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), bodyId, cabinId, 50, status === 'Released' ? 'Released' : 'Allocated', hospitalId]
      );
      await runQuery(
        `INSERT INTO billing (id, "bodyId", "totalAmount", "netAmount", status, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), bodyId, 2500, 2500, status === 'Released' ? 'Settled' : 'Pending', hospitalId]
      );
    }

    if ((i + 1) % 100 === 0) console.log(`  ...${i + 1}/${toCreate}`);
  }

  console.log('\nDone.');
  console.log(`hospitalId = ${hospitalId}`);
  console.log(`clientId   = ${CLIENT_ID}`);
  console.log(`login      = BENCHSTAFF01 / benchmark123`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await pool.end();
  process.exit(1);
});
