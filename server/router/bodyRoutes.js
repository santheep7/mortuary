import { Router } from 'express';
import upload from '../config/multer.js';
import {
  getBodyTypes,
  getBodies,
  getBodyById,
  getBodyAllocation,
  createBody,
  updateBody,
  deleteBody,
  getMlcRegistration,
  getConcessionAuthorities,
  createConcessionAuthority,
  deleteConcessionAuthority
} from '../controller/bodyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const STAFF = authorize('M Staff', 'House Keeping', 'Admin', 'SuperAdmin');
const ADMIN = authorize('Admin', 'SuperAdmin');

router.use(authenticate);

// Body types
router.get('/body-types', STAFF, getBodyTypes);

// Concession authorities (discount approval setup — administrative)
router.get('/concession-authorities',        STAFF, getConcessionAuthorities);
router.post('/concession-authorities',       ADMIN, createConcessionAuthority);
router.delete('/concession-authorities/:id', ADMIN, deleteConcessionAuthority);

// MLC registration document
router.get('/mlc-registration/:bodyId', STAFF, getMlcRegistration);

// NOC upload
router.post('/upload/noc', STAFF, upload.single('noc'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bodies CRUD
router.get('/',               STAFF, getBodies);
router.get('/:id',            STAFF, getBodyById);
router.get('/:id/allocation', STAFF, getBodyAllocation);
router.post('/',              STAFF, createBody);
router.put('/:id',            STAFF, updateBody);
router.delete('/:id',         ADMIN, deleteBody);

export default router;
