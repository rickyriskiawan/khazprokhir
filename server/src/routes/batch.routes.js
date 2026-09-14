import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getAllBatches,
  getBatchById,
  createBatch,
} from '../controllers/batch.controller.js';

import { createBatchSchema } from '../validators/bon-masuk.validator.js';

const router = Router();

// =============================================================================
// Routes Pengelolaan Batch Produksi (/api/batches)
// =============================================================================

router.get('/', authenticateToken, getAllBatches);
router.get('/:id', authenticateToken, getBatchById);
router.post(
  '/',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(createBatchSchema),
  createBatch
);

export default router;
