import { z } from 'zod';
import { isKelipatanEmpat } from '../utils/businessRules.js';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-15")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

// ==========================================
// 1. Validasi Pembuatan Sesi Sortir (ADR 0007)
// ==========================================
export const createSortirSchema = z
  .object({
    batch_id: z.number().int().positive('ID Batch harus berupa angka bulat positif'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    tanggal_sortir: dateStringSchema,
    // Non-contiguous pack list (ADR 0007)
    selected_packs: z
      .array(z.number().int().min(1, 'Nomor pack minimal 1').max(100, 'Nomor pack maksimal 100'))
      .optional(),
    nomor_pack_list: z.string().trim().optional(),
    // Backward compatibility: pack_dari & pack_sampai
    pack_dari: z.number().int().min(1).max(100).optional(),
    pack_sampai: z.number().int().min(1).max(100).optional(),
    penyortir_1: z
      .string()
      .trim()
      .min(1, 'Nama Petugas Penyortir 1 wajib diisi')
      .max(100, 'Nama Penyortir 1 maksimal 100 karakter'),
    penyortir_2: z
      .string()
      .trim()
      .max(100, 'Nama Penyortir 2 maksimal 100 karakter')
      .nullable()
      .optional(),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      if (Array.isArray(data.selected_packs) && data.selected_packs.length > 0) {
        return true;
      }
      return data.pack_dari !== undefined && data.pack_sampai !== undefined;
    },
    {
      message: 'Harap berikan daftar pack (selected_packs) atau rentang pack (pack_dari dan pack_sampai)',
      path: ['selected_packs'],
    }
  )
  .refine(
    (data) => {
      if (Array.isArray(data.selected_packs) && data.selected_packs.length > 0) {
        return isKelipatanEmpat(data.selected_packs.length);
      }
      if (data.pack_dari !== undefined && data.pack_sampai !== undefined) {
        return isKelipatanEmpat(data.pack_sampai - data.pack_dari + 1);
      }
      return true;
    },
    {
      message: 'Total pack yang disortir harus berupa kelipatan 4 (contoh: 4, 8, 12, 16 pack, dst)',
      path: ['selected_packs'],
    }
  )
  .refine(
    (data) => {
      if (data.pack_dari !== undefined && data.pack_sampai !== undefined) {
        return data.pack_dari <= data.pack_sampai;
      }
      return true;
    },
    {
      message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
      path: ['pack_dari'],
    }
  );

// ==========================================
// 2. Validasi Update Sesi Sortir
// ==========================================
export const updateSortirSchema = z.object({
  shift_id: z.number().int().positive('Shift kerja harus berupa angka bulat positif').optional(),
  tanggal_sortir: dateStringSchema.optional(),
  penyortir_1: z.string().trim().min(1, 'Nama Penyortir 1 tidak boleh kosong').max(100).optional(),
  penyortir_2: z.string().trim().max(100).nullable().optional(),
  catatan: z.string().trim().nullable().optional(),
});
