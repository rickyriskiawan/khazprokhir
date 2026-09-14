import { z } from 'zod';
import { isKelipatanEmpat } from '../utils/businessRules.js';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-15")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

// ==========================================
// 1. Validasi Pembuatan Sesi Sortir
// ==========================================
export const createSortirSchema = z
  .object({
    batch_id: z.number().int().positive('ID Batch harus berupa angka bulat positif'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    tanggal_sortir: dateStringSchema,
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
    penyortir_1: z
      .string()
      .trim()
      .min(1, 'Nama Petugas Penyortir 1 wajib diisi')
      .max(100, 'Nama Penyortir 1 maksimal 100 karakter'),
    penyortir_2: z
      .string()
      .trim()
      .min(1, 'Nama Petugas Penyortir 2 wajib diisi')
      .max(100, 'Nama Penyortir 2 maksimal 100 karakter'),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.pack_dari <= data.pack_sampai, {
    message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
    path: ['pack_dari'],
  })
  .refine((data) => isKelipatanEmpat(data.pack_sampai - data.pack_dari + 1), {
    message: 'Total pack yang disortir harus berupa kelipatan 4 (contoh: 4, 8, 12, 16 pack, dst)',
    path: ['pack_sampai'],
  });

// ==========================================
// 2. Validasi Update Sesi Sortir
// ==========================================
export const updateSortirSchema = z.object({
  shift_id: z.number().int().positive('Shift kerja harus berupa angka bulat positif').optional(),
  tanggal_sortir: dateStringSchema.optional(),
  penyortir_1: z.string().trim().min(1, 'Nama Penyortir 1 tidak boleh kosong').max(100).optional(),
  penyortir_2: z.string().trim().min(1, 'Nama Penyortir 2 tidak boleh kosong').max(100).optional(),
  catatan: z.string().trim().nullable().optional(),
});
