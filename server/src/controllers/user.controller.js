import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

// Kolom user yang aman untuk diekspos ke client (tanpa password_hash)
const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
  is_active: true,
  created_at: true,
  updated_at: true,
};

/**
 * Mengambil daftar seluruh pengguna
 * Mendukung filter query: role, is_active
 * GET /api/master/users
 */
export async function getAllUsers(req, res) {
  try {
    const { role, is_active } = req.query;
    const where = {};

    if (role) {
      where.role = role.toUpperCase();
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const users = await prisma.user.findMany({
      where,
      select: USER_SAFE_SELECT,
      orderBy: { id: 'asc' },
    });

    return successResponse(res, {
      message: 'Daftar pengguna berhasil diambil.',
      data: users,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar pengguna.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail pengguna berdasarkan ID
 * GET /api/master/users/:id
 */
export async function getUserById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Pengguna tidak valid.' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      return errorResponse(res, { status: 404, message: 'Pengguna tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail pengguna berhasil diambil.',
      data: user,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail pengguna.',
      error: err.message,
    });
  }
}

/**
 * Pendaftaran pengguna baru
 * POST /api/master/users
 */
export async function createUser(req, res) {
  try {
    const { username, password, full_name, role, is_active } = req.body;

    // Cek keunikan username
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Username "${username}" sudah digunakan. Silakan gunakan username lain.`,
      });
    }

    // Hash password menggunakan bcrypt (salt round 10)
    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password_hash,
        full_name,
        role,
        is_active: is_active !== undefined ? is_active : true,
      },
      select: USER_SAFE_SELECT,
    });

    // Catat audit log (tanpa hash password)
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'master',
      tableName: 'users',
      recordId: newUser.id,
      newValue: newUser,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Pengguna baru berhasil dibuat.',
      data: newUser,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat pengguna baru.',
      error: err.message,
    });
  }
}

/**
 * Pembaruan profil, role, atau password pengguna
 * PUT /api/master/users/:id
 */
export async function updateUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Pengguna tidak valid.' });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Pengguna tidak ditemukan.' });
    }

    const { full_name, password, role, is_active } = req.body;
    const updateData = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'master',
      tableName: 'users',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Data pengguna berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui data pengguna.',
      error: err.message,
    });
  }
}

/**
 * Penonaktifan akun pengguna (soft delete)
 * Menjaga integritas referensial relasi data operasional
 * DELETE /api/master/users/:id
 */
export async function deleteUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Pengguna tidak valid.' });
    }

    // Mencegah supervisor menonaktifkan akunnya sendiri secara tidak sengaja
    if (req.user?.id === id) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
      });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Pengguna tidak ditemukan.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { is_active: false },
      select: USER_SAFE_SELECT,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'master',
      tableName: 'users',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Akun pengguna "${existing.username}" berhasil dinonaktifkan.`,
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menonaktifkan pengguna.',
      error: err.message,
    });
  }
}
