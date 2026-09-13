import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getAllTransaksiHcts,
  getTransaksiHctsById,
  createTransaksiHcts,
  updateTransaksiHcts,
  deleteTransaksiHcts,
  getAllRencanaPenyerahan,
  getRencanaPenyerahanById,
  createRencanaPenyerahan,
  updateRencanaPenyerahan,
  deleteRencanaPenyerahan,
} from '../controllers/planning.controller.js';

import {
  createTransaksiHctsSchema,
  updateTransaksiHctsSchema,
  createRencanaPenyerahanSchema,
  updateRencanaPenyerahanSchema,
} from '../validators/target.validator.js';

export const hctsRouter = Router();
export const rencanaPenyerahanRouter = Router();

// =============================================================================
// Routes Transaksi HCTS (/api/hcts)
// =============================================================================
hctsRouter.get('/', authenticateToken, getAllTransaksiHcts);
hctsRouter.get('/:id', authenticateToken, getTransaksiHctsById);
hctsRouter.post(
  '/',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createTransaksiHctsSchema),
  createTransaksiHcts
);
hctsRouter.put(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateTransaksiHctsSchema),
  updateTransaksiHcts
);
hctsRouter.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteTransaksiHcts
);

// =============================================================================
// Routes Rencana Penyerahan (/api/rencana-penyerahan)
// =============================================================================
rencanaPenyerahanRouter.get('/', authenticateToken, getAllRencanaPenyerahan);
rencanaPenyerahanRouter.get('/:id', authenticateToken, getRencanaPenyerahanById);
rencanaPenyerahanRouter.post(
  '/',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(createRencanaPenyerahanSchema),
  createRencanaPenyerahan
);
rencanaPenyerahanRouter.put(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  validate(updateRencanaPenyerahanSchema),
  updateRencanaPenyerahan
);
rencanaPenyerahanRouter.delete(
  '/:id',
  authenticateToken,
  authorize('SUPERVISOR'),
  deleteRencanaPenyerahan
);
