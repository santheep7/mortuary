import { Router } from 'express';
import {
  registerUser,
  loginUser,
  loginAdmin,
  loginSuperAdmin,
  registerAdmin,
  listAdmins,
  deleteAdmin,
  requireAdmin,
  listUsers,
  getUserById,
  approveUser,
  rejectUser
} from '../controller/authController.js';

const router = Router();

// User auth
router.post('/user_register', registerUser);
router.post('/login',         loginUser);

// Admin auth
router.post('/admin/login',    loginAdmin);
router.post('/admin/register', registerAdmin);

// SuperAdmin auth
router.post('/superadmin/login', loginSuperAdmin);

// SuperAdmin admin management
router.get('/admin/list', listAdmins);
router.delete('/admin/:id', deleteAdmin);

// Admin user management (requires admin header)
router.get('/admin/users',             requireAdmin, listUsers);
router.get('/admin/users/:id',         requireAdmin, getUserById);
router.post('/admin/users/:id/approve', requireAdmin, approveUser);
router.post('/admin/users/:id/reject',  requireAdmin, rejectUser);

export default router;
