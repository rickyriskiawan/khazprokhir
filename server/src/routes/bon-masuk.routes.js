import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  createBonMasuk,
  getAllBonMasuk,
  getBonMasukById,
  updateBonMasuk,
  deleteBonMasuk,
  getTodaySummary,
} from '../controllers/bon-masuk.controller.js';

import { createBonMasukSchema, updateBonMasukSchema } from '../validators/bon-masuk.validator.js';

const router = Router();

// =============================================================================
// Routes Penerimaan Bon Masuk Khazai (/api/bon-masuk)
// =============================================================================

// Ringkasan harian harus didefinisikan sebelum route param /:id
router.get('/summary/today', authenticateToken, getTodaySummary);

router.get('/', authenticateToken, getAllBonMasuk);
router.get('/:id', authenticateToken, getBonMasukById);
router.post(
  '/',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(createBonMasukSchema),
  createBonMasuk
);
router.put(
  '/:id',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(updateBonMasukSchema),
  updateBonMasuk
);
router.delete(
  '/:id',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  deleteBonMasuk
);

export default router;
