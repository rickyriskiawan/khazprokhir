import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'khazprokhir-dev-secret-key-do-not-use-in-production-12345';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Controller Autentikasi Pengguna
 */

/**
 * Login Pengguna
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, {
        status: 400,
        error: 'ValidationError',
        message: 'Username dan password wajib diisi.',
      });
    }

    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username: String(username).trim() },
    });

    if (!user) {
      return errorResponse(res, {
        status: 401,
        error: 'InvalidCredentials',
        message: 'Username atau password tidak sesuai.',
      });
    }

    if (!user.is_active) {
      return errorResponse(res, {
        status: 403,
        error: 'AccountDisabled',
        message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.',
      });
    }

    // Verifikasi password hash bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, {
        status: 401,
        error: 'InvalidCredentials',
        message: 'Username atau password tidak sesuai.',
      });
    }

    // Generate JWT Token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Catat riwayat login ke audit log
    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      module: 'auth',
      tableName: 'users',
      recordId: user.id,
      newValue: { event: 'LOGIN_SUCCESS', username: user.username },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return successResponse(res, {
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('[AuthController.login Error]', err);
    return errorResponse(res, {
      status: 500,
      message: 'Terjadi kesalahan pada server saat proses login.',
      error: err.message,
    });
  }
}

/**
 * Mendapatkan profil pengguna yang sedang login
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    return successResponse(res, {
      message: 'Data profil berhasil diambil.',
      data: req.user,
    });
  } catch (err) {
    console.error('[AuthController.getMe Error]', err);
    return errorResponse(res, {
      status: 500,
      message: 'Terjadi kesalahan pada server saat mengambil profil pengguna.',
      error: err.message,
    });
  }
}

/**
 * Logout Pengguna
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  try {
    // Pada JWT stateless, logout ditangani dengan membuang token di sisi client
    // Catat ke audit log untuk keamanan
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        module: 'auth',
        tableName: 'users',
        recordId: req.user.id,
        newValue: { event: 'LOGOUT_SUCCESS', username: req.user.username },
        ipAddress: req.ip || req.socket.remoteAddress,
      });
    }

    return successResponse(res, {
      message: 'Logout berhasil.',
      data: null,
    });
  } catch (err) {
    console.error('[AuthController.logout Error]', err);
    return errorResponse(res, {
      status: 500,
      message: 'Terjadi kesalahan pada server saat logout.',
      error: err.message,
    });
  }
}
