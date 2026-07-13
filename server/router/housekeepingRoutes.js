import { Router } from 'express';
import { getTasks, assignTask, completeTask, verifyTask } from '../controller/housekeepingController.js';

const router = Router();

router.get('/tasks',      getTasks);
router.post('/assign',    assignTask);
router.post('/complete',  completeTask);
router.post('/verify',    verifyTask);

export default router;
