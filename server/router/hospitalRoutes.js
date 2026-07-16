import { Router } from 'express';
import { createHospital, listHospitals, getHospital, updateHospital } from '../controller/hospitalController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadLogo, safeUpload } from '../config/multer.js';

const router = Router();
const SUPERADMIN = authorize('SuperAdmin');

router.use(authenticate, SUPERADMIN);

router.get('/',     listHospitals);
router.post('/',    safeUpload(uploadLogo.single('logo')), createHospital);
router.get('/:id',  getHospital);
router.put('/:id',  safeUpload(uploadLogo.single('logo')), updateHospital);

export default router;
