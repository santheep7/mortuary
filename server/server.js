import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import { initDatabase } from './config/db.js';

import cabinRoutes       from './router/cabinRoutes.js';
import bodyRoutes        from './router/bodyRoutes.js';
import allocationRoutes  from './router/allocationRoutes.js';
import billingRoutes        from './router/billingRoutes.js';
import serviceBillingRoutes from './router/serviceBillingRoutes.js';
import releaseRoutes        from './router/releaseRoutes.js';
import releaseHistoryRoutes from './router/releaseHistoryRoutes.js';
import housekeepingRoutes from './router/housekeepingRoutes.js';
import reportsRoutes     from './router/reportsRoutes.js';
import serviceRoutes     from './router/serviceRoutes.js';
import settingsRoutes    from './router/settingsRoutes.js';
import authRoutes        from './router/authRoutes.js';
import uploadRoutes      from './router/uploadRoutes.js';
import { getDashboardStats } from './controller/dashboardController.js';
import { authenticate, authorize } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3001;
const STAFF = authorize('M Staff', 'House Keeping', 'Admin', 'SuperAdmin');

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(cookieParser());
app.use(express.json());
// Serve uploaded files (logos, images) with authentication
app.use('/uploads', authenticate, express.static(path.join(__dirname, 'uploads')));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/cabins',             cabinRoutes);
app.use('/api/bodies',             bodyRoutes);
app.use('/api/cabin-allocations',  allocationRoutes);
app.use('/api/billing',            billingRoutes);
app.use('/api/service-billing',    serviceBillingRoutes);
app.use('/api/body-releases',      releaseRoutes);
app.use('/api/release-history',    releaseHistoryRoutes);
app.use('/api/housekeeping',       housekeepingRoutes);
app.use('/api/reports',            reportsRoutes);
app.use('/api/services',           serviceRoutes);
app.use('/api/billing-settings',   settingsRoutes);
app.use('/api',                    authRoutes);
app.use('/api/upload',             uploadRoutes);
app.use('/api/uploads',            uploadRoutes);

// Dashboard & health
app.get('/api/dashboard/stats', authenticate, STAFF, getDashboardStats);
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Start ────────────────────────────────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mortuary Management System running on port ${PORT}`);
    console.log(`Connected to PostgreSQL database: ${process.env.PG_DATABASE}`);
    console.log(`Access on LAN: http://<SERVER_IP>:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
