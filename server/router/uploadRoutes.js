import { Router } from 'express';
import upload from '../config/multer.js';
import { uploadMultiple, uploadSingle, listUploads } from '../controller/uploadController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const STAFF = authorize('M Staff', 'House Keeping', 'Admin', 'SuperAdmin');
const ADMIN = authorize('Admin', 'SuperAdmin');

router.use(authenticate);

router.post('/',        STAFF, upload.array('files', 10), uploadMultiple);
router.post('/single',  STAFF, upload.single('file'),     uploadSingle);
router.get('/',         ADMIN, listUploads);

export default router;
