import { z } from 'zod';

export const createPengirimanSchema = z.object({
  nomor_surat_jalan: z
    .string({ required_error: 'Nomor surat jalan wajib diisi' })
    .trim()
    .min(1, 'Nomor surat jalan tidak boleh kosong')
    .max(100, 'Nomor surat jalan maksimal 100 karakter'),
  tanggal_kirim: z
    .string({ required_error: 'Tanggal kirim wajib diisi' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kirim harus YYYY-MM-DD'),
  denominasi_id: z.coerce
    .number({ required_error: 'ID Denominasi wajib diisi' })
    .int('ID Denominasi harus berupa bilangan bulat')
    .positive('ID Denominasi harus berupa angka positif'),
  tahun_anggaran: z.coerce
    .number({ required_error: 'Tahun anggaran wajib diisi' })
    .int('Tahun anggaran harus berupa bilangan bulat')
    .min(2000, 'Tahun anggaran minimal 2000')
    .max(2100, 'Tahun anggaran maksimal 2100'),
  sandi_emisi: z.string().trim().max(20).optional().nullable(),
  hasil_kemas_ids: z
    .array(z.coerce.number().int().positive('ID Hasil Kemas harus berupa angka positif'), {
      required_error: 'Daftar hasil_kemas_ids wajib diisi',
    })
    .min(1, 'Minimal sertakan 1 ID hasil kemas untuk dikirim'),
  no_ba_penyerahan: z.string().trim().max(100).optional().nullable(),
  no_ba_pengemasan_rekap: z.string().trim().max(100).optional().nullable(),
  keterangan: z.string().trim().max(100).default('UTAS'),
  tujuan: z.string().trim().max(100).default('Bank Indonesia'),
  lokasi_penyerahan: z.string().trim().max(100).default('Karawang'),
  penyerah_nama: z
    .string({ required_error: 'Nama penyerah wajib diisi' })
    .trim()
    .min(1, 'Nama penyerah tidak boleh kosong')
    .max(100, 'Nama penyerah maksimal 100 karakter'),
  penyerah_jabatan: z.string().trim().max(100).default('Kepala Seksi'),
  penerima_nama: z.string().trim().max(100).optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'SHIPPED']).default('SHIPPED'),
  catatan: z.string().trim().max(1000).optional().nullable(),
});

export const getPengirimanSchema = z.object({
  page: z.coerce.number().int().positive('Halaman minimal 1').default(1),
  limit: z.coerce.number().int().positive('Limit minimal 1').max(100, 'Limit maksimal 100').default(20),
  denominasi_id: z.coerce.number().int().positive('ID Denominasi harus berupa angka positif').optional(),
  tahun_anggaran: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'SHIPPED', 'CANCELLED']).optional(),
  tanggal_dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal_dari harus YYYY-MM-DD').optional(),
  tanggal_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal_sampai harus YYYY-MM-DD').optional(),
  search: z.string().trim().optional(),
});

export const getAvailableDoosSchema = z.object({
  denominasi_id: z.coerce.number().int().positive('ID Denominasi harus berupa angka positif').optional(),
  tahun_anggaran: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const updatePengirimanSchema = z.object({
  no_ba_penyerahan: z.string().trim().max(100).optional().nullable(),
  penyerah_nama: z.string().trim().min(1, 'Nama penyerah tidak boleh kosong').max(100).optional(),
  penyerah_jabatan: z.string().trim().max(100).optional(),
  penerima_nama: z.string().trim().max(100).optional().nullable(),
  tujuan: z.string().trim().max(100).optional(),
  lokasi_penyerahan: z.string().trim().max(100).optional(),
  catatan: z.string().trim().max(1000).optional().nullable(),
});
