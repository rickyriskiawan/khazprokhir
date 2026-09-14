import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  createSortir,
  getAllSortir,
  getSortirById,
  getAvailablePacks,
  updateSortir,
  completeSortir,
  deleteSortir,
  getSortirSummaryToday,
} from '../controllers/sortir.controller.js';

import {
  createSortirSchema,
  updateSortirSchema,
} from '../validators/sortir.validator.js';

const router = Router();

// =============================================================================
// Routes Modul Sortir & Penataan Pack (/api/sortir)
// =============================================================================

// Ringkasan harian & available packs harus didefinisikan sebelum route param /:id
router.get('/summary/today', authenticateToken, getSortirSummaryToday);
router.get('/available-packs/:batchId', authenticateToken, getAvailablePacks);

router.get('/', authenticateToken, getAllSortir);
router.get('/:id', authenticateToken, getSortirById);

router.post(
  '/',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(createSortirSchema),
  createSortir
);

router.put(
  '/:id',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(updateSortirSchema),
  updateSortir
);

router.post(
  '/:id/complete',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  completeSortir
);

router.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteSortir
);

export default router;
