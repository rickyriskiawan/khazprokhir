import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  getDoosRegister,
  getDoosGapCheck,
  getDoosSummary,
} from '../controllers/monitoring-doos.controller.js';

import {
  getDoosRegisterSchema,
  getDoosGapCheckSchema,
  getDoosSummarySchema,
} from '../validators/monitoring-doos.validator.js';

const router = Router();

// =============================================================================
// Routes Modul 4: Monitoring Doos, Buku Register & Deteksi Gap (/api/monitoring-doos)
// Role: OPERATOR, SUPERVISOR, AUDITOR, MANAGEMENT
// =============================================================================

router.get(
  '/register',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  validate(getDoosRegisterSchema, 'query'),
  getDoosRegister
);

router.get(
  '/gap-check',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  validate(getDoosGapCheckSchema, 'query'),
  getDoosGapCheck
);

router.get(
  '/summary',
  authenticateToken,
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  validate(getDoosSummarySchema, 'query'),
  getDoosSummary
);

export default router;
