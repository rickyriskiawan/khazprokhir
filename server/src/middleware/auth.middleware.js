import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { errorResponse } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'khazprokhir-dev-secret-key-do-not-use-in-production-12345';

/**
 * Middleware Autentikasi JWT
 * Memverifikasi token pada header Authorization: Bearer <token>
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return errorResponse(res, {
      status: 401,
      error: 'Unauthorized',
      message: 'Akses ditolak. Token otentikasi tidak ditemukan.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifikasi apakah user masih aktif di database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return errorResponse(res, {
        status: 401,
        error: 'Unauthorized',
        message: 'Pengguna tidak ditemukan atau akun dinonaktifkan.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, {
        status: 401,
        error: 'TokenExpired',
        message: 'Sesi telah berakhir. Silakan login kembali.',
      });
    }

    return errorResponse(res, {
      status: 401,
      error: 'InvalidToken',
      message: 'Token otentikasi tidak valid.',
    });
  }
}
