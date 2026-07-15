import { Router } from 'express';
import {
  createClient,
  listClients,
  getClientById,
  getClientByEmployeeId,
  updateClient,
  deleteClient
} from '../controller/clientController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Client management (SuperAdmin only)
router.post('/', authenticate, authorize('SuperAdmin'), createClient);
router.get('/', authenticate, authorize('SuperAdmin'), listClients);
router.get('/:clientId', authenticate, authorize('SuperAdmin'), getClientById);
router.get('/employee/:employeeId', getClientByEmployeeId);
router.put('/:id', authenticate, authorize('SuperAdmin'), updateClient);
router.delete('/:id', authenticate, authorize('SuperAdmin'), deleteClient);

export default router;
