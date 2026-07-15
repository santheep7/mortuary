import { Router } from 'express';
import { getBillingSettings, updateBillingSettings, getMortuaryName, updateMortuaryName, uploadMortuaryLogo, getMortuaryLogo } from '../controller/settingsController.js';
import { uploadLogo, safeUpload } from '../config/multer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const ADMIN = authorize('Admin', 'SuperAdmin');
const STAFF = authorize('M Staff', 'House Keeping', 'Admin', 'SuperAdmin');

// Mortuary name/logo are shown in the app header/sidebar for every role — public read is fine.
router.get('/mortuary-name', getMortuaryName);
router.post('/mortuary-name', authenticate, ADMIN, updateMortuaryName);

router.get('/mortuary-logo', getMortuaryLogo);
router.post('/mortuary-logo', authenticate, ADMIN, safeUpload(uploadLogo.single('logo')), uploadMortuaryLogo);

// Staff need to read pricing (e.g. to validate the advance amount when allocating a
// cabin) even though only Admin/SuperAdmin can change it.
router.get('/',  authenticate, STAFF, getBillingSettings);
router.post('/', authenticate, ADMIN, updateBillingSettings);

export default router;
