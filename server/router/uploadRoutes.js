import { Router } from 'express';
import upload from '../config/multer.js';
import { uploadMultiple, uploadSingle, listUploads } from '../controller/uploadController.js';

const router = Router();

router.post('/',        upload.array('files', 10), uploadMultiple);
router.post('/single',  upload.single('file'),     uploadSingle);
router.get('/',         listUploads);

export default router;
