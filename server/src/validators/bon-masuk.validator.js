import { z } from 'zod';
import { parsePackRange } from '../utils/packParser.js';

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

// Item dalam Bon Masuk Multi-Batch
export const bonMasukItemSchema = z.object({
  batch_id: z.number().int().positive().optional(),
  nomor_batch: z.string().trim().min(1).max(50).optional(),
  seri: z.string().trim().max(20).optional(),
  kepala: z.string().trim().max(10).optional(),
  emisi_id: z.number().int().positive().optional(),
  nomor_pack_list: z.string().trim().min(1, 'Daftar nomor pack wajib diisi (contoh: "1-10, 13, 16")'),
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
    no_bon: z.string().trim().max(50).optional(),
    no_segel: z
      .string()
      .trim()
      .min(1, 'Nomor segel wajib diisi (contoh: "SGL-20260915-001")')
      .max(50, 'Nomor segel maksimal 50 karakter'),
    tanggal_masuk: dateStringSchema,
    jam_masuk: timeStringSchema,
    jenis_mesin_sortir: z.string().trim().nullable().optional(),
    kategori_penerimaan: z
      .enum(['MASINAL', 'PARSIAL'], {
        errorMap: () => ({ message: 'Kategori penerimaan harus salah satu dari: MASINAL, PARSIAL' }),
      })
      .optional()
      .default('MASINAL'),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)'),
    petugas_khazai: z.string().trim().max(100).optional(),
    petugas_khazprokhir: z.string().trim().max(100).optional(),
    catatan: z.string().trim().nullable().optional(),

    // Dukungan multi-batch (baru)
    items: z.array(bonMasukItemSchema).min(1, 'Minimal satu batch harus dimasukkan').optional(),

    // Dukungan legacy (single-batch flat)
    nomor_batch: z.string().trim().min(1).max(50).optional(),
    seri: z.string().trim().max(20).optional(),
    kepala: z.string().trim().max(10).optional(),
    emisi_id: z.number().int().positive().optional(),
    pack_dari: z.number().int().min(1).max(100).optional(),
    pack_sampai: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.items && data.items.length > 0) {
      // Validasi ketiadaan duplikasi batch dalam 1 formulir segel
      const seenBatches = new Set();
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const key = item.batch_id ? `id_${item.batch_id}` : `batch_${item.nomor_batch}`;
        if (seenBatches.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Batch "${item.nomor_batch || item.batch_id}" duplikat dalam segel yang sama.`,
            path: ['items', i],
          });
        }
        seenBatches.add(key);

        try {
          parsePackRange(item.nomor_pack_list);
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['items', i, 'nomor_pack_list'],
          });
        }
      }
    } else {
      // Legacy single-batch validation
      if (!data.nomor_batch) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor batch atau items wajib diisi.',
          path: ['nomor_batch'],
        });
      }
      if (data.pack_dari === undefined || data.pack_sampai === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rentang pack (pack_dari dan pack_sampai) wajib diisi jika tidak menggunakan items.',
          path: ['pack_dari'],
        });
      } else if (data.pack_dari > data.pack_sampai) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
          path: ['pack_dari'],
        });
      }
    }
  });

// ==========================================
// 3. Validasi Pembaruan Bon Masuk Khazai
// ==========================================
export const updateBonMasukSchema = z
  .object({
    tahun_anggaran: z
      .number()
      .int()
      .min(2000, 'Tahun anggaran minimal 2000')
      .max(2100, 'Tahun anggaran maksimal 2100')
      .optional(),
    no_bon: z.string().trim().max(50).optional(),
    no_segel: z
      .string()
      .trim()
      .min(1, 'Nomor segel wajib diisi (contoh: "SGL-20260915-001")')
      .max(50, 'Nomor segel maksimal 50 karakter')
      .optional(),
    tanggal_masuk: dateStringSchema.optional(),
    jam_masuk: timeStringSchema.optional(),
    jenis_mesin_sortir: z.string().trim().nullable().optional(),
    kategori_penerimaan: z
      .enum(['MASINAL', 'PARSIAL'], {
        errorMap: () => ({ message: 'Kategori penerimaan harus salah satu dari: MASINAL, PARSIAL' }),
      })
      .optional(),
    shift_id: z.number().int().positive('Shift kerja wajib dipilih (ID bulat positif)').optional(),
    petugas_khazai: z.string().trim().max(100).optional(),
    petugas_khazprokhir: z.string().trim().max(100).optional(),
    catatan: z.string().trim().nullable().optional(),

    // Dukungan multi-batch (baru)
    items: z.array(bonMasukItemSchema).min(1).optional(),

    // Dukungan legacy
    nomor_batch: z.string().trim().min(1).max(50).optional(),
    seri: z.string().trim().max(20).optional(),
    kepala: z.string().trim().max(10).optional(),
    emisi_id: z.number().int().positive().optional(),
    pack_dari: z.number().int().min(1).max(100).optional(),
    pack_sampai: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.items && data.items.length > 0) {
      const seenBatches = new Set();
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const key = item.batch_id ? `id_${item.batch_id}` : `batch_${item.nomor_batch}`;
        if (seenBatches.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Batch "${item.nomor_batch || item.batch_id}" duplikat dalam segel yang sama.`,
            path: ['items', i],
          });
        }
        seenBatches.add(key);

        try {
          parsePackRange(item.nomor_pack_list);
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['items', i, 'nomor_pack_list'],
          });
        }
      }
    } else if (data.pack_dari !== undefined && data.pack_sampai !== undefined) {
      if (data.pack_dari > data.pack_sampai) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor pack awal (pack_dari) tidak boleh lebih besar dari nomor pack akhir (pack_sampai)',
          path: ['pack_dari'],
        });
      }
    }
  });

