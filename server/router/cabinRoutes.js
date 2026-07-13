import { Router } from 'express';
import { getCabins, createCabin, updateCabin, deleteCabin } from '../controller/cabinController.js';

const router = Router();

router.get('/',        getCabins);
router.post('/',       createCabin);
router.put('/:id',     updateCabin);
router.delete('/:id',  deleteCabin);

export default router;
