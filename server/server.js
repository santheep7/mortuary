import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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
app.use(express.json());
// Uploaded documents (NOC/legal/MLC files, mortuary logo). NOT gated behind
// authenticate: the frontend loads these via plain <img src> and <a href>,
// which are native browser requests that cannot carry a custom Authorization
// header - gating this route broke every image/document display in the app
// (discovered when the SuperAdmin logo upload succeeded but never rendered).
// Protection instead relies on filenames being random/unguessable
// (timestamp-random.ext, not sequential) combined with the file *listing*
// endpoint (GET /api/upload) staying locked to Admin/SuperAdmin, so there's
// no way to discover a filename to exploit in the first place. Revisit this
// properly (e.g. HttpOnly cookie auth, which does ride along with native
// requests) if that trade-off ever stops being acceptable.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
