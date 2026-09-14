import { z } from 'zod';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-15")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:mm 24-jam (contoh: "08:30")');

// ==========================================
// 1. Validasi Pembuatan Batch
// ==========================================
export const createBatchSchema = z.object({
  nomor_batch: z
    .string()
    .trim()
    .min(1, 'Nomor batch / order wajib diisi (contoh: "ORD-001")')
    .max(50, 'Nomor batch maksimal 50 karakter'),
  tahun_anggaran: z
    .number()
    .int()
    .min(2000, 'Tahun anggaran minimal 2000')
    .max(2100, 'Tahun anggaran maksimal 2100'),
  seri: z
    .string()
    .trim()
    .min(1, 'Seri uang kertas wajib diisi (contoh: "AA-BA")')
    .max(20, 'Seri maksimal 20 karakter'),
  kepala: z
    .string()
    .trim()
    .min(1, 'Kepala nomor seri wajib diisi (contoh: "0")')
    .max(10, 'Kepala maksimal 10 karakter'),
  emisi_id: z.number().int().positive('ID Emisi harus berupa angka bulat positif'),
});

// ==========================================
// 2. Validasi Penerimaan Bon Masuk Khazai
// ==========================================
export const createBonMasukSchema = z
  .object({
    tahun_anggaran: z
      .number()
      .int()
      .min(2000, 'Tahun anggaran minimal 2000')
      .max(2100, 'Tahun anggaran maksimal 2100'),
    no_segel: z
      .string()
      .trim()
      .min(1, 'Nomor segel wajib diisi (contoh: "SGL-20260915-001")')
      .max(50, 'Nomor segel maksimal 50 karakter'),
    tanggal_masuk: dateStringSchema,
    jam_masuk: timeStringSchema,
    nomor_batch: z
      .string()
      .trim()
      .min(1, 'Nomor batch / order wajib diisi (contoh: "ORD-001")')
      .max(50, 'Nomor batch maksimal 50 karakter'),
    seri: z.string().trim().max(20).optional(),
    kepala: z.string().trim().max(10).optional(),
    emisi_id: z.number().int().positive().optional(),
    pack_dari: z
      .number()
      .int()
      .min(1, 'Nomor pack awal minimal 1')
      .max(100, 'Nomor pack awal maksimal 100'),
    pack_sampai: z
      .number()
      .int()
      .min(1, 'Nomor pack akhir minimal 1')
      .max(100, 'Nomor pack akhir maksimal 100'),
    jenis_mesin_sortir: z.string().trim().nullable().optional(),
    kategori_penerimaan: z
      .enum(['MASINAL', 'PARSIAL'], {
        errorMap: () => ({ message: 'Kategori penerimaan harus salah satu dari: MASINAL, PARSIAL' }),
      })
      .optional()
      .default('MASINAL'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.pack_dari <= data.pack_sampai, {
    message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
    path: ['pack_dari'],
  });
