// Smoke tests run in CI against a fresh, empty Postgres database and a
// live server instance. Each test here maps to a real bug found this week -
// this is not a general test suite, just a guard against those specific
// regressions coming back:
//   - tenant isolation (multi-tenancy rework)
//   - case-insensitive employee_id login
//   - the unauthenticated /admin/register hole + missing hospital_id scoping
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { pool, queryOne, runQuery } from '../config/db.js';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001/api';

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`PASS: ${message}`);
  } else {
    failed = true;
    console.error(`FAIL: ${message}`);
  }
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Server did not become healthy within 30s');
}

async function login(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : null;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, cookie, data };
}

async function setupFixtures() {
  const hospA = uuidv4();
  const hospB = uuidv4();
  await runQuery('INSERT INTO hospitals (id, name, client_id, is_active) VALUES ($1,$2,$3,true)', [hospA, 'CI Hospital A', 'CIHOSA']);
  await runQuery('INSERT INTO hospitals (id, name, client_id, is_active) VALUES ($1,$2,$3,true)', [hospB, 'CI Hospital B', 'CIHOSB']);

  const hash = await bcrypt.hash('smoketest123', 12);

  await runQuery(
    `INSERT INTO users (full_name, employee_id, department, phone1, email, password, approval_status, hospital_id)
     VALUES ($1,$2,$3,$4,$5,$6,'approved',$7)`,
    ['CI Staff A', 'CISTAFFA', 'M Staff', '9000000000', 'cistaffa@example.com', hash, hospA]
  );
  // Stored lowercase on purpose - test 2 logs in with the uppercase form.
  await runQuery(
    `INSERT INTO users (full_name, employee_id, department, phone1, email, password, approval_status, hospital_id)
     VALUES ($1,$2,$3,$4,$5,$6,'approved',$7)`,
    ['CI Staff B', 'cistaffb', 'M Staff', '9000000001', 'cistaffb@example.com', hash, hospB]
  );
  await runQuery(
    'INSERT INTO admin (id, username, email, password, hospital_id) VALUES ($1,$2,$3,$4,$5)',
    [uuidv4(), 'ciadmina', 'ciadmina@example.com', hash, hospA]
  );

  return { hospA, hospB };
}

async function testTenantIsolation() {
  const staffA = await login('/login', { employeeId: 'CISTAFFA', password: 'smoketest123' });
  assert(staffA.status === 200, 'Tenant isolation: Hospital A staff can log in');

  const createRes = await fetch(`${BASE}/bodies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: staffA.cookie },
    body: JSON.stringify({ bodyType: 'Non-MLC', patientName: 'CI-MARKER-PATIENT', hospitalNumber: 'CI-1' }),
  });
  assert(createRes.status === 200, 'Tenant isolation: Hospital A staff can register a body');

  const staffB = await login('/login', { employeeId: 'CISTAFFB', password: 'smoketest123' });
  const listRes = await fetch(`${BASE}/bodies`, { headers: { Cookie: staffB.cookie } });
  const bodies = await listRes.json();
  const leaked = bodies.some((b) => b.patientName === 'CI-MARKER-PATIENT');
  assert(!leaked, 'Tenant isolation: Hospital B cannot see Hospital A\'s body');
}

async function testCaseInsensitiveLogin() {
  // stored as 'cistaffb', logging in with the uppercase form the login form sends
  const res = await login('/login', { employeeId: 'CISTAFFB', password: 'smoketest123' });
  assert(res.status === 200, 'Case-insensitive login: uppercase employee_id matches lowercase-stored account');
}

async function testAdminRegistrationLockdown() {
  const registerRes = await fetch(`${BASE}/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'shouldnotwork', password: 'whatever123' }),
  });
  assert(registerRes.status === 404, 'Admin lockdown: public /admin/register endpoint no longer exists');

  const coAdminNoAuthRes = await fetch(`${BASE}/admin/co-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'shouldnotwork', password: 'whatever123' }),
  });
  assert(coAdminNoAuthRes.status === 401, 'Admin lockdown: /admin/co-admin requires authentication');

  const adminLogin = await login('/admin/login', { username: 'ciadmina', password: 'smoketest123' });
  assert(adminLogin.status === 200, 'Admin lockdown: Hospital A admin can log in');

  const coAdminRes = await fetch(`${BASE}/admin/co-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminLogin.cookie },
    body: JSON.stringify({ username: 'cicoadmin', email: '', password: 'smoketest123' }),
  });
  assert(coAdminRes.status === 200, 'Admin lockdown: an authenticated admin can add a co-admin');

  const created = await queryOne('SELECT hospital_id FROM admin WHERE username = $1', ['cicoadmin']);
  assert(created?.hospital_id, 'Admin lockdown: new co-admin has a hospital_id at all');
}

async function main() {
  await waitForServer();
  const { hospA } = await setupFixtures();

  await testTenantIsolation();
  await testCaseInsensitiveLogin();
  await testAdminRegistrationLockdown();

  const coAdmin = await queryOne('SELECT hospital_id FROM admin WHERE username = $1', ['cicoadmin']);
  assert(coAdmin?.hospital_id === hospA, 'Admin lockdown: co-admin lands on the inviting admin\'s own hospital, not a default');

  await pool.end();

  if (failed) {
    console.error('\nSmoke tests FAILED');
    process.exit(1);
  }
  console.log('\nAll smoke tests passed');
}

main().catch(async (err) => {
  console.error('Smoke tests crashed:', err);
  await pool.end();
  process.exit(1);
});
