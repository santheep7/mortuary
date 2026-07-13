import { Router } from 'express';
import { getBillingSettings, updateBillingSettings, getMortuaryName, updateMortuaryName, uploadMortuaryLogo, getMortuaryLogo } from '../controller/settingsController.js';
import upload from '../config/multer.js';

const router = Router();

router.get('/',  getBillingSettings);
router.post('/', updateBillingSettings);

// Mortuary name management
router.get('/mortuary-name', getMortuaryName);
router.post('/mortuary-name', updateMortuaryName);

// Mortuary logo management
router.post('/mortuary-logo', upload.single('logo'), uploadMortuaryLogo);
router.get('/mortuary-logo', getMortuaryLogo);

export default router;
