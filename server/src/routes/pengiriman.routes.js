import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createPengirimanSchema,
  getPengirimanSchema,
  getAvailableDoosSchema,
  updatePengirimanSchema,
} from '../validators/pengiriman.validator.js';
import {
  createPengiriman,
  getPengiriman,
  getAvailableDoos,
  getPengirimanById,
  getDokumenBi,
  updatePengiriman,
  deletePengiriman,
} from '../controllers/pengiriman.controller.js';

const router = Router();

// Semua rute modul pengiriman memerlukan otentikasi
router.use(authenticateToken);

// 1. Ambil daftar doos siap kirim (status READY)
router.get(
  '/available-doos',
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  validate(getAvailableDoosSchema, 'query'),
  getAvailableDoos
);

// 2. Buat pengiriman baru (Surat Jalan & serah terima doos ke BI)
router.post(
  '/',
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(createPengirimanSchema),
  createPengiriman
);

// 3. Ambil daftar pengiriman dengan pagination dan filter
router.get(
  '/',
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  validate(getPengirimanSchema, 'query'),
  getPengiriman
);

// 4. Ambil payload cetak dokumen resmi BI (Berita Acara & Surat Jalan)
router.get(
  '/:id/dokumen-bi',
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  getDokumenBi
);

// 5. Ambil detail pengiriman berdasarkan ID
router.get(
  '/:id',
  authorize('OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'),
  getPengirimanById
);

// 6. Update metadata pengiriman (catatan, nama penyerah/penerima, nomor BA)
router.put(
  '/:id',
  authorize('OPERATOR', 'SUPERVISOR'),
  validate(updatePengirimanSchema),
  updatePengiriman
);

// 7. Pembatalan pengiriman (revert status doos ke READY) - Khusus SUPERVISOR
router.delete(
  '/:id',
  authorize('SUPERVISOR'),
  deletePengiriman
);

export default router;
