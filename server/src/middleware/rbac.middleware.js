import { errorResponse } from '../utils/response.js';

/**
 * Middleware Otorisasi Role-Based Access Control (RBAC)
 * Membatasi akses rute berdasarkan role pengguna
 * 
 * @param  {...string} allowedRoles - Role yang diperbolehkan mengakses endpoint
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        status: 401,
        error: 'Unauthorized',
        message: 'Pengguna belum terautentikasi.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, {
        status: 403,
        error: 'Forbidden',
        message: `Akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk mengakses sumber daya ini.`,
      });
    }

    next();
  };
}
