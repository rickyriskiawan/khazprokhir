import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getAllTargetTahunan,
  getTargetTahunanById,
  createTargetTahunan,
  updateTargetTahunan,
  updateTargetTahunanGroup,
  deleteTargetTahunan,
  deleteTargetTahunanGroup,
  getAllTargetBulanan,
  getTargetBulananById,
  createTargetBulanan,
  updateTargetBulanan,
  deleteTargetBulanan,
} from '../controllers/target.controller.js';

import {
  createTargetTahunanSchema,
  updateTargetTahunanSchema,
  updateTargetTahunanGroupSchema,
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
  '/group/:tahun_anggaran/:tahun_emisi',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateTargetTahunanGroupSchema),
  updateTargetTahunanGroup
);
targetTahunanRouter.delete(
  '/group/:tahun_anggaran/:tahun_emisi',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteTargetTahunanGroup
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

