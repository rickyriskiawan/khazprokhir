import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getAllTargetTahunan,
  getTargetTahunanById,
  createTargetTahunan,
  updateTargetTahunan,
  deleteTargetTahunan,
  getAllTargetBulanan,
  getTargetBulananById,
  createTargetBulanan,
  updateTargetBulanan,
  deleteTargetBulanan,
} from '../controllers/target.controller.js';

import {
  createTargetTahunanSchema,
  updateTargetTahunanSchema,
  createTargetBulananSchema,
  updateTargetBulananSchema,
} from '../validators/target.validator.js';

export const targetTahunanRouter = Router();
export const targetBulananRouter = Router();

// =============================================================================
// Routes Target Tahunan (/api/target-tahunan)
// =============================================================================
targetTahunanRouter.get('/', authenticateToken, getAllTargetTahunan);
targetTahunanRouter.get('/:id', authenticateToken, getTargetTahunanById);
targetTahunanRouter.post(
  '/',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createTargetTahunanSchema),
  createTargetTahunan
);
targetTahunanRouter.put(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateTargetTahunanSchema),
  updateTargetTahunan
);
targetTahunanRouter.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteTargetTahunan
);

// =============================================================================
// Routes Target Bulanan (/api/target-bulanan)
// =============================================================================
targetBulananRouter.get('/', authenticateToken, getAllTargetBulanan);
targetBulananRouter.get('/:id', authenticateToken, getTargetBulananById);
targetBulananRouter.post(
  '/',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createTargetBulananSchema),
  createTargetBulanan
);
targetBulananRouter.put(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateTargetBulananSchema),
  updateTargetBulanan
);
targetBulananRouter.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteTargetBulanan
);

