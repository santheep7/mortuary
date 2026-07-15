import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { pool, queryOne, runQuery, queryAll } from '../config/db.js';
import { signToken } from '../middleware/auth.js';

const ALLOWED_DEPARTMENTS = ['House Keeping', 'M Staff'];

// ── User registration ────────────────────────────────────────────────────────

export async function registerUser(req, res) {
  try {
    const { fullname, employee_id, department, phone1, phone2, email, password } = req.body;

    if (!fullname || typeof fullname !== 'string' || !fullname.trim())
      return res.status(400).json({ message: 'Full name is required.' });
    if (!employee_id || typeof employee_id !== 'string' || !employee_id.trim())
      return res.status(400).json({ message: 'Employee ID is required.' });
    if (!/^[A-Za-z0-9]+$/.test(employee_id.trim()))
      return res.status(400).json({ message: 'Employee ID must be alphanumeric.' });
    if (!department || !ALLOWED_DEPARTMENTS.includes(department))
      return res.status(400).json({ message: 'Invalid department selected.' });
    if (!phone1 || !/^[6-9]\d{9}$/.test(phone1.trim()))
      return res.status(400).json({ message: 'Valid 10-digit phone number required.' });
    if (phone2 && phone2.trim() && !/^[6-9]\d{9}$/.test(phone2.trim()))
      return res.status(400).json({ message: 'Secondary phone number is invalid.' });
    if (!email || typeof email !== 'string' || !email.trim())
      return res.status(400).json({ message: 'Email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ message: 'Invalid email format.' });
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const cleanEmployeeId = employee_id.trim();
    const cleanEmail      = email.trim().toLowerCase();
    const cleanFullname   = fullname.trim();
    const cleanPhone1     = phone1.trim();
    const cleanPhone2     = phone2 ? phone2.trim() : null;

    const existingByEmpId = await queryOne('SELECT id FROM users WHERE employee_id = $1', [cleanEmployeeId]);
    if (existingByEmpId) return res.status(400).json({ message: 'Employee ID is already registered.' });

    const existingByEmail = await queryOne('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existingByEmail) return res.status(400).json({ message: 'Email address is already registered.' });

    const hash = await bcrypt.hash(password, 12);
    await runQuery(
      `INSERT INTO users (full_name, employee_id, department, phone1, phone2, email, password, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [cleanFullname, cleanEmployeeId, department, cleanPhone1, cleanPhone2, cleanEmail, hash]
    );

    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (error) {
    console.error('Registration error:', error.code || error.message);
    if (error.code === '23505') { // PG unique violation
      return res.status(400).json({ message: 'Employee ID or email already registered.' });
    }
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ── User login ───────────────────────────────────────────────────────────────

export async function loginUser(req, res) {
  try {
    let { employeeId, password } = req.body;

    if (!employeeId || !password)
      return res.status(400).json({ message: 'Employee ID and password are required.' });

    employeeId = String(employeeId).trim();
    if (!/^[A-Za-z0-9]+$/.test(employeeId))
      return res.status(401).json({ message: 'Invalid credentials.' });

    const user = await queryOne('SELECT * FROM users WHERE employee_id = $1', [employeeId]);
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    const status = user.approval_status || 'approved';
    if (status === 'pending') {
      return res.status(403).json({ message: 'Your registration is pending admin approval. Please contact the admin.' });
    }
    if (status === 'rejected') {
      return res.status(403).json({ message: 'Your registration has been rejected. Please contact the admin for further assistance.' });
    }

    const token = signToken({ id: user.id, role: user.department });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, fullname: user.full_name, email: user.email, role: user.department }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ── Admin login ──────────────────────────────────────────────────────────────

export async function loginAdmin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const user = await queryOne('SELECT * FROM admin WHERE username = $1', [username]);
    if (!user) return res.status(401).json({ message: 'Invalid username' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = signToken({ id: user.id, role: user.role });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── SuperAdmin login ───────────────────────────────────────────────────────────

const SUPERADMIN_CREDENTIALS = {
  username: 'superadmin',
  password: 'superadmin123'
};

export async function loginSuperAdmin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    if (username !== SUPERADMIN_CREDENTIALS.username || password !== SUPERADMIN_CREDENTIALS.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: 'superadmin', role: 'SuperAdmin' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: 'superadmin', username: SUPERADMIN_CREDENTIALS.username, role: 'SuperAdmin' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── Admin register ───────────────────────────────────────────────────────────

export async function registerAdmin(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });

    const existing = await queryOne('SELECT id FROM admin WHERE username = $1', [username]);
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await runQuery(
      'INSERT INTO admin (id, username, email, password) VALUES ($1, $2, $3, $4)',
      [uuidv4(), username, email || null, hashedPassword]
    );

    res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── List admins (SuperAdmin only) ────────────────────────────────────────────

export async function listAdmins(req, res) {
  try {
    const admins = await queryAll(
      'SELECT id, username, email, role, status, "createdAt" FROM admin ORDER BY "createdAt" DESC'
    );
    res.json(admins);
  } catch (error) {
    console.error('List admins error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── Delete admin (SuperAdmin only) ────────────────────────────────────────────

export async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Admin ID required' });

    const admin = await queryOne('SELECT * FROM admin WHERE id = $1', [id]);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.role === 'SuperAdmin') {
      return res.status(403).json({ message: 'Cannot delete SuperAdmin' });
    }

    await runQuery('DELETE FROM admin WHERE id = $1', [id]);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── Admin user management ────────────────────────────────────────────────────

export async function listUsers(req, res) {
  try {
    // PostgreSQL CASE replaces MySQL FIELD() for ordering
    const users = await queryAll(
      `SELECT id, full_name, employee_id, department, phone1, phone2, email,
              approval_status, admin_remarks, created_at
       FROM users
       ORDER BY
         CASE approval_status
           WHEN 'pending'  THEN 1
           WHEN 'approved' THEN 2
           WHEN 'rejected' THEN 3
           ELSE 4
         END,
         created_at DESC`
    );
    res.json(users);
  } catch (error) {
    console.error('Admin users list error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    // users.id is SERIAL (integer) in PG
    if (!id || !/^\d+$/.test(id))
      return res.status(400).json({ message: 'Invalid user ID.' });

    const user = await queryOne(
      `SELECT id, full_name, employee_id, department, phone1, phone2, email,
              approval_status, admin_remarks, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    console.error('Admin user detail error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
}

export async function approveUser(req, res) {
  try {
    const { id } = req.params;
    if (!id || !/^\d+$/.test(id))
      return res.status(400).json({ message: 'Invalid user ID.' });

    const user = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await runQuery(
      "UPDATE users SET approval_status = 'approved', admin_remarks = NULL, updated_at = NOW() WHERE id = $1",
      [id]
    );
    res.json({ message: 'User approved successfully.' });
  } catch (error) {
    console.error('Approve error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
}

export async function rejectUser(req, res) {
  try {
    const { id } = req.params;
    if (!id || !/^\d+$/.test(id))
      return res.status(400).json({ message: 'Invalid user ID.' });

    const remarks = req.body.remarks ? String(req.body.remarks).substring(0, 500) : null;
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await runQuery(
      "UPDATE users SET approval_status = 'rejected', admin_remarks = $1, updated_at = NOW() WHERE id = $2",
      [remarks, id]
    );
    res.json({ message: 'User rejected.' });
  } catch (error) {
    console.error('Reject error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
}
