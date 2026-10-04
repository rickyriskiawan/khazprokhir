import { z } from 'zod';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-15")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

// ==========================================
// 1. Validasi Pembuatan Hasil Kemas Doos
// Pengemasan berbasis sesi sortir: daftar pack diturunkan dari proses_sortir_id,
// operator hanya menentukan rentang nomor doos.
// ==========================================
export const createKemasSchema = z
  .object({
    proses_sortir_id: z.number().int().positive('Sesi sortir wajib dipilih'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    tanggal_kemas: dateStringSchema,
    no_doos_awal: z
      .number()
      .int()
      .min(1, 'Nomor doos awal minimal 1'),
    no_doos_akhir: z
      .number()
      .int()
      .min(1, 'Nomor doos akhir minimal 1'),
    // Nomor BA Pengemasan ditunda sampai modul pengiriman BI diimplementasikan.
    no_ba_pengemasan: z
      .string()
      .trim()
      .max(50, 'Nomor BA Pengemasan maksimal 50 karakter')
      .nullable()
      .optional(),
    status: z.enum(['SIAP_KEMAS', 'READY']).optional().default('SIAP_KEMAS'),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.no_doos_awal <= data.no_doos_akhir, {
    message: 'Nomor doos awal tidak boleh lebih besar dari nomor doos akhir',
    path: ['no_doos_awal'],
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

// ==========================================
// 3. Validasi Konfirmasi Selesai Fisik Kemas
// ==========================================
export const completeKemasSchema = z.object({
  shift_id: z.number().int().positive('Shift kerja harus berupa angka bulat positif').optional(),
  tanggal_kemas: dateStringSchema.optional(),
  catatan: z.string().trim().nullable().optional(),
});

