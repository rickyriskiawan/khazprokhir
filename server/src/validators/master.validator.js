import { z } from 'zod';

// ==========================================
// 1. Validasi Master Denominasi
// ==========================================
export const createDenominasiSchema = z.object({
  nama: z.string().trim().min(1, 'Nama denominasi wajib diisi (contoh: "Y", "X", "W", "V", "U", "T", "S")'),
  nilai: z.number().int().positive('Nilai nominal harus berupa angka bulat positif (contoh: 100000)'),
  is_active: z.boolean().optional().default(true),
});

export const updateDenominasiSchema = z.object({
  nama: z.string().trim().min(1, 'Nama denominasi tidak boleh kosong').optional(),
  nilai: z.number().int().positive('Nilai nominal harus berupa angka bulat positif').optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// 2. Validasi Master Emisi
// ==========================================
export const createEmisiSchema = z.object({
  kode_emisi: z.string().trim().min(1, 'Kode emisi wajib diisi (contoh: "TE 2022")'),
  sandi: z.string().trim().min(1, 'Sandi emisi wajib diisi (contoh: "Y\'22")'),
  tahun: z.string().trim().regex(/^\d{4}$/, 'Format tahun harus 4 digit angka (contoh: "2022")'),
  denominasi_id: z.number().int().positive('ID Denominasi wajib dipilih dan bernilai positif'),
  is_active: z.boolean().optional().default(true),
});

export const updateEmisiSchema = z.object({
  kode_emisi: z.string().trim().min(1, 'Kode emisi tidak boleh kosong').optional(),
  sandi: z.string().trim().min(1, 'Sandi emisi tidak boleh kosong').optional(),
  tahun: z.string().trim().regex(/^\d{4}$/, 'Format tahun harus 4 digit angka').optional(),
  denominasi_id: z.number().int().positive('ID Denominasi harus bernilai positif').optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// 3. Validasi Master Shift
// ==========================================
export const createShiftSchema = z.object({
  nama: z.string().trim().min(1, 'Nama shift wajib diisi (contoh: "Shift 1")'),
  jam_mulai: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam mulai harus HH:mm (contoh: "06:00")'),
  jam_selesai: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam selesai harus HH:mm (contoh: "14:00")'),
  is_active: z.boolean().optional().default(true),
});

export const updateShiftSchema = z.object({
  nama: z.string().trim().min(1, 'Nama shift tidak boleh kosong').optional(),
  jam_mulai: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam mulai harus HH:mm').optional(),
  jam_selesai: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam selesai harus HH:mm').optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// 4. Validasi Master User
// ==========================================
export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh berisi huruf, angka, underscore (_), titik (.), dan dash (-)'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  role: z.enum(['OPERATOR', 'SUPERVISOR', 'MANAGEMENT', 'AUDITOR'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: OPERATOR, SUPERVISOR, MANAGEMENT, AUDITOR' }),
  }),
  is_active: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z
    .enum(['OPERATOR', 'SUPERVISOR', 'MANAGEMENT', 'AUDITOR'], {
      errorMap: () => ({ message: 'Role harus salah satu dari: OPERATOR, SUPERVISOR, MANAGEMENT, AUDITOR' }),
    })
    .optional(),
  is_active: z.boolean().optional(),
});

