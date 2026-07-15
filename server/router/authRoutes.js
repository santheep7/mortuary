import { Router } from 'express';
import {
  registerUser,
  loginUser,
  loginAdmin,
  loginSuperAdmin,
  registerAdmin,
  listAdmins,
  deleteAdmin,
  listUsers,
  getUserById,
  approveUser,
  rejectUser,
  logout
} from '../controller/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// User auth
router.post('/user_register', registerUser);
router.post('/login',         loginUser);
router.post('/logout',        logout);

// Admin auth
router.post('/admin/login',    loginAdmin);
router.post('/admin/register', registerAdmin);
router.post('/admin/logout',   logout);

// SuperAdmin auth
router.post('/superadmin/login', loginSuperAdmin);
router.post('/superadmin/logout', logout);

// SuperAdmin admin management
router.get('/admin/list',    authenticate, authorize('SuperAdmin'), listAdmins);
router.delete('/admin/:id',  authenticate, authorize('SuperAdmin'), deleteAdmin);

// Admin user management
router.get('/admin/users',              authenticate, authorize('Admin', 'SuperAdmin'), listUsers);
router.get('/admin/users/:id',          authenticate, authorize('Admin', 'SuperAdmin'), getUserById);
router.post('/admin/users/:id/approve', authenticate, authorize('Admin', 'SuperAdmin'), approveUser);
router.post('/admin/users/:id/reject',  authenticate, authorize('Admin', 'SuperAdmin'), rejectUser);

export default router;
