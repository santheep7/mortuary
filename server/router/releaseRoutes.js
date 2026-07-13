import { Router } from 'express';
import upload from '../config/multer.js';
import {
  createBodyRelease,
  getBodyRelease,
  getReleaseHistory
} from '../controller/releaseController.js';

const router = Router();

router.post('/', upload.fields([
  { name: 'nocFile', maxCount: 1 },
  { name: 'legalDocumentsFile', maxCount: 1 }
]), createBodyRelease);

router.get('/:bodyId', getBodyRelease);

export default router;
