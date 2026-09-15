import { z } from 'zod';

/**
 * Skema validasi query param untuk Buku Register Doos
 * GET /api/monitoring-doos/register
 */
export const getDoosRegisterSchema = z.object({
  denominasi_id: z.coerce.number().int().positive('ID Denominasi harus berupa angka bulat positif').optional(),
  tahun_anggaran: z.coerce.number().int().min(2000, 'Tahun anggaran minimal 2000').max(2100, 'Tahun anggaran maksimal 2100').optional(),
  status: z.enum(['SIAP_KEMAS', 'READY', 'SHIPPED'], {
    errorMap: () => ({ message: 'Status harus salah satu dari: SIAP_KEMAS, READY, SHIPPED' }),
  }).optional(),
  view: z.enum(['range', 'individual'], {
    errorMap: () => ({ message: 'Mode tampilan harus "range" atau "individual"' }),
  }).optional().default('range'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1, 'Halaman (page) minimal 1').optional().default(1),
  limit: z.coerce.number().int().min(1, 'Limit minimal 1').max(1000, 'Limit maksimal 1000').optional().default(20),
});

/**
 * Skema validasi query param untuk Pemeriksaan Gap (Celah Nomor Doos)
 * GET /api/monitoring-doos/gap-check
 */
export const getDoosGapCheckSchema = z.object({
  denominasi_id: z.coerce.number().int().positive('ID Denominasi wajib diisi dan berupa angka bulat positif'),
  tahun_anggaran: z.coerce.number().int().min(2000, 'Tahun anggaran minimal 2000').max(2100, 'Tahun anggaran maksimal 2100').optional(),
  start_from_one: z.preprocess((val) => {
    if (val === undefined || val === null) return true;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      return lower === 'true' || lower === '1';
    }
    return Boolean(val);
  }, z.boolean().optional().default(true)),
});

/**
 * Skema validasi query param untuk Ringkasan Statistik Persediaan Doos
 * GET /api/monitoring-doos/summary
 */
export const getDoosSummarySchema = z.object({
  denominasi_id: z.coerce.number().int().positive('ID Denominasi harus berupa angka bulat positif').optional(),
  tahun_anggaran: z.coerce.number().int().min(2000, 'Tahun anggaran minimal 2000').max(2100, 'Tahun anggaran maksimal 2100').optional(),
});
