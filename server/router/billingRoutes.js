import { Router } from 'express';
import {
  getBilling,
  getBillingFull,
  getBillingByBodyId,
  generateBilling,
  settleBilling
} from '../controller/billingController.js';

const router = Router();

// Specific named routes must come before param routes
router.post('/generate',  generateBilling);
router.post('/settle',    settleBilling);
router.get('/',           getBilling);
router.get('/:id/full',   getBillingFull);
router.get('/:bodyId',    getBillingByBodyId);

export default router;
