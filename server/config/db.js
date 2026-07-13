import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

// ── Connection pool ──────────────────────────────────────────────────────────
export const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'root',
  database: process.env.PG_DATABASE || 'mortuary_db',
});

// ── Query helpers ────────────────────────────────────────────────────────────

/**
 * Convert MySQL ? placeholders to PostgreSQL $1, $2, ... placeholders.
 */
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Return all rows */
export async function queryAll(sql, params = []) {
  const { rows } = await pool.query(toPostgres(sql), params);
  return rows;
}

/** Return first row or null */
export async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}

/** INSERT / UPDATE / DELETE — returns the pg result object */
export async function runQuery(sql, params = []) {
  return pool.query(toPostgres(sql), params);
}

// ── Body-number generator ─────────────────────────────────────────────────────
export async function generateBodyNumber() {
  try {
    const year   = new Date().getFullYear();
    const prefix = `MOSC-${year}-`;
    const bodies = await queryAll(
      "SELECT \"bodyNumber\" FROM bodies WHERE \"bodyNumber\" LIKE ?",
      [`${prefix}%`]
    );
    let maxNum = 0;
    for (const body of bodies) {
      const num = parseInt((body.bodyNumber || body['bodyNumber']).replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
  } catch (error) {
    throw new Error('Failed to generate body number: ' + error.message);
  }
}

// ── Column-existence helper ───────────────────────────────────────────────────
async function columnExists(table, column) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table.toLowerCase(), column.toLowerCase()]
  );
  return rows.length > 0;
}

// ── initDatabase ─────────────────────────────────────────────────────────────
export async function initDatabase() {
  try {
    // PostgreSQL: the database must already exist (create it manually or via env).
    // We just verify connectivity then create tables.
    await pool.query('SELECT 1');

    // ── Tables ───────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cabins (
        id            VARCHAR(36) PRIMARY KEY,
        "cabinNumber" VARCHAR(50) UNIQUE NOT NULL,
        status        VARCHAR(50) DEFAULT 'Available',
        tariff        REAL DEFAULT 500,
        daily_rate    NUMERIC(10,2) DEFAULT 500.00,
        floor         INTEGER DEFAULT 1,
        cabin_type    VARCHAR(20) DEFAULT 'NORMAL_CABIN'
                        CHECK (cabin_type IN ('FREEZER','NORMAL_CABIN')),
        "createdAt"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id          VARCHAR(36) PRIMARY KEY,
        username    VARCHAR(100) UNIQUE NOT NULL,
        email       VARCHAR(150),
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(50) DEFAULT 'Admin'
                    CHECK (role IN ('Admin', 'SuperAdmin')),
        status      VARCHAR(50) DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive')),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS body_types (
        id          VARCHAR(36) PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS concession_authorities (
        id                  VARCHAR(36) PRIMARY KEY,
        name                VARCHAR(255) NOT NULL,
        designation         VARCHAR(255),
        department          VARCHAR(255),
        "maxDiscountPercent" REAL DEFAULT 100,
        "isActive"          INTEGER DEFAULT 1,
        "createdAt"         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        full_name       VARCHAR(255) NOT NULL,
        employee_id     VARCHAR(100) UNIQUE NOT NULL,
        department      VARCHAR(100),
        phone1          VARCHAR(20),
        phone2          VARCHAR(20),
        email           VARCHAR(150) UNIQUE NOT NULL,
        password        VARCHAR(255) NOT NULL,
        approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (approval_status IN ('pending','approved','rejected')),
        admin_remarks   VARCHAR(500),
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bodies (
        id                        VARCHAR(36) PRIMARY KEY,
        "bodyNumber"              VARCHAR(50) UNIQUE NOT NULL,
        "bodyType"                VARCHAR(50) NOT NULL,
        "hospitalNumber"          VARCHAR(100),
        "patientName"             VARCHAR(255),
        gender                    VARCHAR(20),
        age                       INTEGER,
        locality                  VARCHAR(255),
        "dateOfDeath"             VARCHAR(50),
        "timeOfDeath"             VARCHAR(50),
        "declaredBy"              VARCHAR(255),
        "reasonOfDeath"           TEXT,
        "deathIntimationNo"       VARCHAR(100),
        "mlcNo"                   VARCHAR(100),
        "estimatedDaysOfStay"     INTEGER,
        "witness1Name"            VARCHAR(255),
        "witness1Address"         TEXT,
        "witness1Contact"         VARCHAR(50),
        "witness2Name"            VARCHAR(255),
        "witness2Address"         TEXT,
        "witness2Contact"         VARCHAR(50),
        billing_status            VARCHAR(50) DEFAULT 'PENDING',
        status                    VARCHAR(50) DEFAULT 'Registered',
        "policeStationName"       VARCHAR(255),
        "stationSiName"           VARCHAR(255),
        "presentPoliceOfficerName" VARCHAR(255),
        "nocCertificateUrl"       TEXT,
        "freezerRequired"         SMALLINT DEFAULT 1,
        "createdAt"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cabin_allocations (
        id                        VARCHAR(36) PRIMARY KEY,
        "bodyId"                  VARCHAR(36) NOT NULL,
        "cabinId"                 VARCHAR(36) NOT NULL,
        "admissionDateTime"       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "releaseDateTime"         TIMESTAMP,
        "estimatedReleaseDateTime" TIMESTAMP,
        "advanceAmount"           REAL DEFAULT 0,
        "hourlyRate"              REAL DEFAULT 50,
        "minHours"                INTEGER DEFAULT 4,
        "freeHours"               INTEGER DEFAULT 0,
        status                    VARCHAR(50) DEFAULT 'Allocated',
        "createdAt"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing (
        id                    VARCHAR(36) PRIMARY KEY,
        "bodyId"              VARCHAR(36) NOT NULL,
        "cabinAllocationId"   VARCHAR(36),
        "totalAmount"         REAL DEFAULT 0,
        "discountAmount"      REAL DEFAULT 0,
        "discountReason"      TEXT,
        "concessionAuthorityId" VARCHAR(36),
        "netAmount"           REAL DEFAULT 0,
        "servicesAmount"      REAL DEFAULT 0,
        status                VARCHAR(50) DEFAULT 'Pending',
        "settledAt"           TIMESTAMP,
        "createdAt"           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "firstDayCharge"      NUMERIC(10,2),
        "extraHours"          INTEGER,
        "hourlyRate"          NUMERIC(10,2),
        "additionalHourCharges" NUMERIC(10,2),
        "totalHours"          INTEGER,
        "advanceAmount"       NUMERIC(10,2),
        "staffConcession"     SMALLINT DEFAULT 0,
        "staffName"           VARCHAR(255),
        "staffEmployeeId"     VARCHAR(100),
        "staffAddress"        TEXT,
        "staffPhone"          VARCHAR(20),
        "staffRelation"       VARCHAR(100)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_services (
        id            VARCHAR(36) PRIMARY KEY,
        "billingId"   VARCHAR(36) NOT NULL,
        "serviceId"   VARCHAR(36),
        "serviceName" VARCHAR(255) NOT NULL,
        amount        REAL NOT NULL,
        "createdAt"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_billing (
        id              VARCHAR(36) PRIMARY KEY,
        "bodyId"        VARCHAR(36) NOT NULL,
        "billingId"     VARCHAR(36),
        "serviceId"     VARCHAR(36),
        "serviceName"   VARCHAR(255) NOT NULL,
        "serviceAmount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "discountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "netAmount"     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        status          VARCHAR(50) DEFAULT 'Pending',
        "createdAt"     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_master (
        id           VARCHAR(36) PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        tariff       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS body_releases (
        id                VARCHAR(36) PRIMARY KEY,
        "bodyId"          VARCHAR(36) NOT NULL,
        "releaseType"     VARCHAR(50) NOT NULL,
        "takenBy"         VARCHAR(255),
        relationship      VARCHAR(100),
        address           TEXT,
        "contactNumber"   VARCHAR(50),
        "policeStation"   VARCHAR(255),
        "siName"          VARCHAR(255),
        "nocDocument"     TEXT,
        "legalDocuments"  TEXT,
        "releaseDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt"       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS housekeeping_tasks (
        id          VARCHAR(36) PRIMARY KEY,
        "cabinId"   VARCHAR(36) NOT NULL,
        status      VARCHAR(50) DEFAULT 'PENDING',
        "assignedTo" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id                       VARCHAR(36) PRIMARY KEY,
        mortuary_name            VARCHAR(255) DEFAULT 'MOSC Medical College Mortuary',
        first_day_charge         NUMERIC(10,2) NOT NULL DEFAULT 2100.00,
        hourly_charge_after_24hrs NUMERIC(10,2) NOT NULL DEFAULT 130.00,
        updated_by               VARCHAR(255),
        updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Idempotent column migrations ─────────────────────────────────────────
    const colMigrations = [
      // table, column, pg_type
      ['cabins',                 'cabin_type',               "VARCHAR(20) DEFAULT 'NORMAL_CABIN'"],
      ['cabins',                 'daily_rate',               'NUMERIC(10,2) DEFAULT 500.00'],
      ['bodies',                 'billing_status',           "VARCHAR(50) DEFAULT 'PENDING'"],
      ['bodies',                 'policeStationName',        'VARCHAR(255)'],
      ['bodies',                 'stationSiName',            'VARCHAR(255)'],
      ['bodies',                 'presentPoliceOfficerName', 'VARCHAR(255)'],
      ['bodies',                 'nocCertificateUrl',        'TEXT'],
      ['bodies',                 'freezerRequired',          'SMALLINT DEFAULT 1'],
      ['cabin_allocations',      'estimatedReleaseDateTime', 'TIMESTAMP'],
      ['billing_services',       'serviceId',                'VARCHAR(36)'],
      ['concession_authorities', 'isActive',                 'INTEGER DEFAULT 1'],
      ['users',                  'approval_status',          "VARCHAR(20) NOT NULL DEFAULT 'pending'"],
      ['users',                  'admin_remarks',            'VARCHAR(500)'],
      ['users',                  'updated_at',               'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ];

    for (const [table, column, type] of colMigrations) {
      try {
        // PG column names are case-folded to lowercase unless quoted
        const exists = await columnExists(table, column.toLowerCase());
        if (!exists) {
          await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
          console.log(`Migration: added ${table}."${column}"`);
        }
      } catch (err) {
        console.log(`Migration skip (${table}.${column}):`, err.message);
      }
    }

    // ── Seed defaults ─────────────────────────────────────────────────────────
    const { rows: settingsRows } = await pool.query('SELECT COUNT(*) AS count FROM system_settings');
    if (parseInt(settingsRows[0].count) === 0) {
      await pool.query(
        'INSERT INTO system_settings (id, first_day_charge, hourly_charge_after_24hrs, updated_by) VALUES ($1, $2, $3, $4)',
        [uuidv4(), 2100.00, 130.00, 'System']
      );
      console.log('Seeded default system settings');
    }

    const { rows: cabinRows } = await pool.query('SELECT COUNT(*) AS count FROM cabins');
    if (parseInt(cabinRows[0].count) === 0) {
      for (let i = 1; i <= 10; i++) {
        await pool.query(
          'INSERT INTO cabins (id, "cabinNumber", status, tariff) VALUES ($1, $2, $3, $4)',
          [uuidv4(), `CAB-${i.toString().padStart(3, '0')}`, 'Available', 500]
        );
      }
    }

    const { rows: bodyTypeRows } = await pool.query('SELECT COUNT(*) AS count FROM body_types');
    if (parseInt(bodyTypeRows[0].count) === 0) {
      await pool.query(
        'INSERT INTO body_types (id, name, description) VALUES ($1, $2, $3)',
        [uuidv4(), 'MLC', 'Medico-Legal Case']
      );
      await pool.query(
        'INSERT INTO body_types (id, name, description) VALUES ($1, $2, $3)',
        [uuidv4(), 'Non-MLC', 'Non-Medico-Legal Case']
      );
    }

    const { rows: serviceRows } = await pool.query('SELECT COUNT(*) AS count FROM service_master');
    if (parseInt(serviceRows[0].count) === 0) {
      await pool.query(
        'INSERT INTO service_master (id, service_name, tariff) VALUES ($1, $2, $3)',
        [uuidv4(), 'Body Dressing', 500.00]
      );
      console.log('Seeded default Body Dressing service');
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
