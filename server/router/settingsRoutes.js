import { Router } from 'express';
import { getBillingSettings, updateBillingSettings, getMortuaryName, updateMortuaryName } from '../controller/settingsController.js';

const router = Router();

router.get('/',  getBillingSettings);
router.post('/', updateBillingSettings);

// Mortuary name management
router.get('/mortuary-name', getMortuaryName);
router.post('/mortuary-name', updateMortuaryName);

export default router;
