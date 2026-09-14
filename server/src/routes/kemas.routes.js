import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  createKemas,
  getAllKemas,
  getKemasById,
  getAvailableSortedPacks,
  getNextDoosNumber,
  updateKemas,
  deleteKemas,
  getKemasSummaryToday,
} from '../controllers/kemas.controller.js';

import {
  createKemasSchema,
  updateKemasSchema,
} from '../validators/kemas.validator.js';

const router = Router();

// =============================================================================
// Routes Modul Pengemasan Doos (/api/kemas)
// =============================================================================

// Route statis / spesifik harus didefinisikan sebelum route param /:id
router.get('/summary/today', authenticateToken, getKemasSummaryToday);
router.get('/next-doos-number', authenticateToken, getNextDoosNumber);
router.get('/available-packs/:batchId', authenticateToken, getAvailableSortedPacks);

router.get('/', authenticateToken, getAllKemas);
router.get('/:id', authenticateToken, getKemasById);

router.post(
  '/',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(createKemasSchema),
  createKemas
);

router.put(
  '/:id',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(updateKemasSchema),
  updateKemas
);

router.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteKemas
);

export default router;
