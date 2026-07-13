import { Router } from 'express';
import {
  createAllocation,
  getAllocations,
  releaseAllocation,
  extendAllocation,
  calculateAllocation
} from '../controller/allocationController.js';

const router = Router();

router.post('/',                  createAllocation);
router.get('/',                   getAllocations);
router.put('/:id/release',        releaseAllocation);
router.put('/:id/extend',         extendAllocation);
router.get('/:id/calculate',      calculateAllocation);

export default router;
