import { Router } from 'express';
import { getReleaseHistory } from '../controller/releaseController.js';

const router = Router();

router.get('/', getReleaseHistory);

export default router;
