import { Router } from 'express';
import { getServiceBillingFull, settleServiceBilling } from '../controller/billingController.js';

const router = Router();

router.post('/settle',   settleServiceBilling);
router.get('/:id/full',  getServiceBillingFull);

export default router;
