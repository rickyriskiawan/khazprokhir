import { z } from 'zod';

/**
 * Helper validator untuk BigInt
 */
const bigIntPositiveSchema = z
  .union([z.number(), z.string(), z.bigint()])
  .transform((val, ctx) => {
    try {
      const b = BigInt(val);
      if (b <= 0n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nilai harus lebih besar dari 0',
        });
        return z.NEVER;
      }
      return b;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nilai harus berupa representasi angka bulat yang valid',
      });
      return z.NEVER;
    }
  });

const bigIntNonNegativeSchema = z
  .union([z.number(), z.string(), z.bigint()])
  .transform((val, ctx) => {
    try {
      const b = BigInt(val);
      if (b < 0n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nilai tidak boleh bernilai negatif',
        });
        return z.NEVER;
      }
      return b;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nilai harus berupa representasi angka bulat yang valid',
      });
      return z.NEVER;
    }
  });

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD (contoh: "2026-09-14")')
  .transform((val) => new Date(`${val}T00:00:00.000Z`));

// ==========================================
// 1. Validasi Target Tahunan
// ==========================================
export const createTargetTahunanSchema = z.object({
  tahun_anggaran: z
    .number()
    .int()
    .min(2000, 'Tahun anggaran minimal 2000')
    .max(2100, 'Tahun anggaran maksimal 2100'),
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif'),
  target_bilyet: bigIntPositiveSchema,
  catatan: z.string().trim().nullable().optional(),
});

export const updateTargetTahunanSchema = z.object({
  target_bilyet: bigIntPositiveSchema.optional(),
  catatan: z.string().trim().nullable().optional(),
});

// ==========================================
// 2. Validasi Target Bulanan
// ==========================================
export const createTargetBulananSchema = z.object({
  tahun_anggaran: z
    .number()
    .int()
    .min(2000, 'Tahun anggaran minimal 2000')
    .max(2100, 'Tahun anggaran maksimal 2100'),
  bulan: z
    .number()
    .int()
    .min(1, 'Bulan harus berada dalam rentang 1 s/d 12')
    .max(12, 'Bulan harus berada dalam rentang 1 s/d 12'),
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif'),
  target_penyerahan_bilyet: bigIntPositiveSchema,
  target_pengemasan_bilyet: bigIntPositiveSchema,
  sisa_hari_kerja: z
    .number()
    .int()
    .min(0, 'Sisa hari kerja tidak boleh bernilai negatif')
    .max(31, 'Sisa hari kerja dalam sebulan maksimal 31 hari'),
});

export const updateTargetBulananSchema = z.object({
  target_penyerahan_bilyet: bigIntPositiveSchema.optional(),
  target_pengemasan_bilyet: bigIntPositiveSchema.optional(),
  sisa_hari_kerja: z
    .number()
    .int()
    .min(0, 'Sisa hari kerja tidak boleh bernilai negatif')
    .max(31, 'Sisa hari kerja dalam sebulan maksimal 31 hari')
    .optional(),
});

// ==========================================
// 3. Validasi Transaksi HCTS
// ==========================================
export const createTransaksiHctsSchema = z.object({
  tanggal: dateStringSchema,
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif'),
  penerimaan_bilyet: bigIntNonNegativeSchema.optional().default(0),
  penyerahan_bilyet: bigIntNonNegativeSchema.optional().default(0),
  akumulasi_penyerahan_bi: bigIntNonNegativeSchema.optional().default(0),
  persediaan_hcts: bigIntNonNegativeSchema.optional().default(0),
  jumlah_ct_siap_hitung: z
    .number()
    .int()
    .min(0, 'Jumlah CT siap hitung tidak boleh negatif')
    .optional()
    .default(0),
  catatan: z.string().trim().nullable().optional(),
});

export const updateTransaksiHctsSchema = z.object({
  tanggal: dateStringSchema.optional(),
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif').optional(),
  penerimaan_bilyet: bigIntNonNegativeSchema.optional(),
  penyerahan_bilyet: bigIntNonNegativeSchema.optional(),
  akumulasi_penyerahan_bi: bigIntNonNegativeSchema.optional(),
  persediaan_hcts: bigIntNonNegativeSchema.optional(),
  jumlah_ct_siap_hitung: z
    .number()
    .int()
    .min(0, 'Jumlah CT siap hitung tidak boleh negatif')
    .optional(),
  catatan: z.string().trim().nullable().optional(),
});

// ==========================================
// 4. Validasi Rencana Penyerahan
// ==========================================
export const createRencanaPenyerahanSchema = z.object({
  tanggal_rencana: dateStringSchema,
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif'),
  kurang_pengemasan_bilyet: bigIntNonNegativeSchema.optional().default(0),
  kurang_pengemasan_doos: z
    .number()
    .int()
    .min(0, 'Kurang pengemasan doos tidak boleh negatif')
    .optional()
    .default(0),
  kurang_penerimaan_bilyet: bigIntNonNegativeSchema.optional().default(0),
  kurang_penerimaan_vell: z
    .number()
    .int()
    .min(0, 'Kurang penerimaan vell tidak boleh negatif')
    .optional()
    .default(0),
  catatan: z.string().trim().nullable().optional(),
});

export const updateRencanaPenyerahanSchema = z.object({
  tanggal_rencana: dateStringSchema.optional(),
  denominasi_id: z.number().int().positive('ID Denominasi harus berupa angka bulat positif').optional(),
  kurang_pengemasan_bilyet: bigIntNonNegativeSchema.optional(),
  kurang_pengemasan_doos: z
    .number()
    .int()
    .min(0, 'Kurang pengemasan doos tidak boleh negatif')
    .optional(),
  kurang_penerimaan_bilyet: bigIntNonNegativeSchema.optional(),
  kurang_penerimaan_vell: z
    .number()
    .int()
    .min(0, 'Kurang penerimaan vell tidak boleh negatif')
    .optional(),
  catatan: z.string().trim().nullable().optional(),
});

