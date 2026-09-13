import { errorResponse } from '../utils/response.js';

/**
 * Middleware untuk validasi request menggunakan Zod schema
 * Mendukung validasi untuk req.body, req.query, atau req.params
 *
 * @param {import('zod').ZodSchema} schema - Zod schema yang akan divalidasi
 * @param {'body' | 'query' | 'params'} [source='body'] - Bagian request yang divalidasi
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));

    return errorResponse(res, {
      status: 400,
      error: 'ValidationError',
      message: 'Validasi input gagal. Silakan periksa kembali data yang Anda kirim.',
      details,
    });
  }

  // Simpan data yang telah diparse/ditransformasi kembali ke request
  req[source] = result.data;
  next();
};
