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

const router = Router();

// Body types
router.get('/body-types', getBodyTypes);

// Concession authorities
router.get('/concession-authorities',        getConcessionAuthorities);
router.post('/concession-authorities',       createConcessionAuthority);
router.delete('/concession-authorities/:id', deleteConcessionAuthority);

// MLC registration document
router.get('/mlc-registration/:bodyId', getMlcRegistration);

// NOC upload
router.post('/upload/noc', upload.single('noc'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bodies CRUD
router.get('/',               getBodies);
router.get('/:id',            getBodyById);
router.get('/:id/allocation', getBodyAllocation);
router.post('/',              createBody);
router.put('/:id',            updateBody);
router.delete('/:id',         deleteBody);

export default router;
