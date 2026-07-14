import { Router } from 'express';
import { getBillingSettings, updateBillingSettings, getMortuaryName, updateMortuaryName, uploadMortuaryLogo, getMortuaryLogo } from '../controller/settingsController.js';
import upload from '../config/multer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const ADMIN = authorize('Admin', 'SuperAdmin');

// Mortuary name/logo are shown in the app header/sidebar for every role — public read is fine.
router.get('/mortuary-name', getMortuaryName);
router.post('/mortuary-name', authenticate, ADMIN, updateMortuaryName);

router.get('/mortuary-logo', getMortuaryLogo);
router.post('/mortuary-logo', authenticate, ADMIN, upload.single('logo'), uploadMortuaryLogo);

router.get('/',  authenticate, ADMIN, getBillingSettings);
router.post('/', authenticate, ADMIN, updateBillingSettings);

export default router;
