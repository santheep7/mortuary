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
import hospitalRoutes    from './router/hospitalRoutes.js';
import { getDashboardStats } from './controller/dashboardController.js';
import { authenticate, authorize } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3001;
const STAFF = authorize('M Staff', 'House Keeping', 'Admin', 'SuperAdmin');

// Last-resort safety net: an error here means something threw outside any
// request's own try/catch (e.g. a stream-level error Express's normal error
// middleware never sees). For a hospital's on-call mortuary system, staying
// up and logging is better than one bad request taking the app down for
// every other user - this is what actually happened with a rejected file
// upload before safeUpload() in config/multer.js fixed the root cause.
process.on('uncaughtException', (err) => console.error('Uncaught exception (server stayed up):', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection (server stayed up):', err));

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(cookieParser());
app.use(express.json());
// Serve uploaded files (logos, images) with authentication
// Cookies are automatically sent with browser requests, so this works now
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
app.use('/api/superadmin/hospitals', hospitalRoutes);

// Dashboard & health
app.get('/api/dashboard/stats', authenticate, STAFF, getDashboardStats);
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Error handling ───────────────────────────────────────────────────────────
// Final safety net: anything that reaches here would otherwise be Express's
// default HTML/stack-trace error page (or, for stream-based middleware like
// multer, risk crashing the whole process for every user over one bad
// request). Always respond with clean JSON instead.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
});

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
