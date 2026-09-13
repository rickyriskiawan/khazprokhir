import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getAllDenominasi,
  getDenominasiById,
  createDenominasi,
  updateDenominasi,
  deleteDenominasi,
  getAllEmisi,
  getEmisiById,
  createEmisi,
  updateEmisi,
  deleteEmisi,
  getAllShift,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} from '../controllers/master.controller.js';

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';

import {
  createDenominasiSchema,
  updateDenominasiSchema,
  createEmisiSchema,
  updateEmisiSchema,
  createShiftSchema,
  updateShiftSchema,
  createUserSchema,
  updateUserSchema,
} from '../validators/master.validator.js';

const router = Router();

// =============================================================================
// 1. Routes Master Denominasi (/api/master/denominasi)
// =============================================================================
router.get('/denominasi', authenticateToken, getAllDenominasi);
router.get('/denominasi/:id', authenticateToken, getDenominasiById);
router.post(
  '/denominasi',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createDenominasiSchema),
  createDenominasi
);
router.put(
  '/denominasi/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateDenominasiSchema),
  updateDenominasi
);
router.delete(
  '/denominasi/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteDenominasi
);

// =============================================================================
// 2. Routes Master Emisi (/api/master/emisi)
// =============================================================================
router.get('/emisi', authenticateToken, getAllEmisi);
router.get('/emisi/:id', authenticateToken, getEmisiById);
router.post(
  '/emisi',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createEmisiSchema),
  createEmisi
);
router.put(
  '/emisi/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateEmisiSchema),
  updateEmisi
);
router.delete(
  '/emisi/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteEmisi
);

// =============================================================================
// 3. Routes Master Shift (/api/master/shift)
// =============================================================================
router.get('/shift', authenticateToken, getAllShift);
router.get('/shift/:id', authenticateToken, getShiftById);
router.post(
  '/shift',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createShiftSchema),
  createShift
);
router.put(
  '/shift/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateShiftSchema),
  updateShift
);
router.delete(
  '/shift/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteShift
);

// =============================================================================
// 4. Routes Master Pengguna (/api/master/users)
// =============================================================================
router.get(
  '/users',
  authenticateToken,
  authorize('SUPERVISOR', 'MANAGEMENT', 'AUDITOR'),
  getAllUsers
);
router.get(
  '/users/:id',
  authenticateToken,
  authorize('SUPERVISOR', 'MANAGEMENT', 'AUDITOR'),
  getUserById
);
router.post(
  '/users',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createUserSchema),
  createUser
);
router.put(
  '/users/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateUserSchema),
  updateUser
);
router.delete(
  '/users/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteUser
);

export default router;

