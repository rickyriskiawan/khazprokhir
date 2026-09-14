import { z } from 'zod';
import { isKelipatanEmpat } from '../utils/businessRules.js';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-15")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

// ==========================================
// 1. Validasi Pembuatan Hasil Kemas Doos
// ==========================================
export const createKemasSchema = z
  .object({
    batch_id: z.number().int().positive('ID Batch harus berupa angka bulat positif'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    tanggal_kemas: dateStringSchema,
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
    no_doos_awal: z
      .number()
      .int()
      .min(1, 'Nomor doos awal minimal 1'),
    no_ba_pengemasan: z
      .string()
      .trim()
      .min(1, 'Nomor Berita Acara (BA) Pengemasan wajib diisi')
      .max(50, 'Nomor BA Pengemasan maksimal 50 karakter'),
    proses_sortir_id: z.number().int().positive().nullable().optional(),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.pack_dari <= data.pack_sampai, {
    message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
    path: ['pack_dari'],
  })
  .refine((data) => isKelipatanEmpat(data.pack_sampai - data.pack_dari + 1), {
    message: 'Total pack yang dikemas harus kelipatan 4 (contoh: 4, 8, 12, 16 pack, dst) untuk memenuhi rasio 4 pack = 9 doos',
    path: ['pack_sampai'],
  });

// ==========================================
// 2. Validasi Update Hasil Kemas Doos
// ==========================================
export const updateKemasSchema = z.object({
  shift_id: z.number().int().positive('Shift kerja harus berupa angka bulat positif').optional(),
  tanggal_kemas: dateStringSchema.optional(),
  no_ba_pengemasan: z
    .string()
    .trim()
    .min(1, 'Nomor BA Pengemasan tidak boleh kosong')
    .max(50, 'Nomor BA Pengemasan maksimal 50 karakter')
    .optional(),
  catatan: z.string().trim().nullable().optional(),
});
