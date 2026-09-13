import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

// ==========================================
// A. Controller Denominasi
// ==========================================

export async function getAllDenominasi(req, res) {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const data = await prisma.denominasi.findMany({
      where,
      include: {
        emisi: true,
      },
      orderBy: { nilai: 'desc' },
    });

    return successResponse(res, {
      message: 'Data denominasi berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data denominasi.',
      error: err.message,
    });
  }
}

export async function getDenominasiById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Denominasi tidak valid.' });
    }

    const data = await prisma.denominasi.findUnique({
      where: { id },
      include: { emisi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Denominasi tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail denominasi berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail denominasi.',
      error: err.message,
    });
  }
}

export async function createDenominasi(req, res) {
  try {
    const { nama, nilai, is_active } = req.body;

    // Cek apakah sudah ada denominasi dengan nama atau nilai yang sama
    const existing = await prisma.denominasi.findFirst({
      where: {
        OR: [{ nama }, { nilai }],
      },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Denominasi dengan nama "${nama}" atau nilai Rp${nilai.toLocaleString('id-ID')} sudah terdaftar.`,
      });
    }

    const created = await prisma.denominasi.create({
      data: {
        nama,
        nilai,
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'master',
      tableName: 'denominasi',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Denominasi baru berhasil ditambahkan.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat denominasi baru.',
      error: err.message,
    });
  }
}

export async function updateDenominasi(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Denominasi tidak valid.' });
    }

    const existing = await prisma.denominasi.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Denominasi tidak ditemukan.' });
    }

    const updated = await prisma.denominasi.update({
      where: { id },
      data: req.body,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'master',
      tableName: 'denominasi',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Denominasi berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui denominasi.',
      error: err.message,
    });
  }
}

export async function deleteDenominasi(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Denominasi tidak valid.' });
    }

    const existing = await prisma.denominasi.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Denominasi tidak ditemukan.' });
    }

    // Soft delete dengan menonaktifkan status
    const updated = await prisma.denominasi.update({
      where: { id },
      data: { is_active: false },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'master',
      tableName: 'denominasi',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Denominasi berhasil dinonaktifkan.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menonaktifkan denominasi.',
      error: err.message,
    });
  }
}

// ==========================================
// B. Controller Emisi
// ==========================================

export async function getAllEmisi(req, res) {
  try {
    const { denominasi_id, is_active } = req.query;
    const where = {};

    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const data = await prisma.emisi.findMany({
      where,
      include: {
        denominasi: true,
      },
      orderBy: { id: 'asc' },
    });

    return successResponse(res, {
      message: 'Data emisi berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data emisi.',
      error: err.message,
    });
  }
}

export async function getEmisiById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Emisi tidak valid.' });
    }

    const data = await prisma.emisi.findUnique({
      where: { id },
      include: { denominasi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Emisi tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail emisi berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail emisi.',
      error: err.message,
    });
  }
}

export async function createEmisi(req, res) {
  try {
    const { kode_emisi, sandi, tahun, denominasi_id, is_active } = req.body;

    // Pastikan denominasi exists
    const denominasi = await prisma.denominasi.findUnique({
      where: { id: denominasi_id },
    });

    if (!denominasi) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Denominasi dengan ID ${denominasi_id} tidak ditemukan.`,
      });
    }

    const created = await prisma.emisi.create({
      data: {
        kode_emisi,
        sandi,
        tahun,
        denominasi_id,
        is_active: is_active !== undefined ? is_active : true,
      },
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'master',
      tableName: 'emisi',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Data emisi baru berhasil ditambahkan.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat emisi baru.',
      error: err.message,
    });
  }
}

export async function updateEmisi(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Emisi tidak valid.' });
    }

    const existing = await prisma.emisi.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Emisi tidak ditemukan.' });
    }

    if (req.body.denominasi_id) {
      const denominasi = await prisma.denominasi.findUnique({
        where: { id: req.body.denominasi_id },
      });
      if (!denominasi) {
        return errorResponse(res, { status: 404, message: 'Denominasi tujuan tidak ditemukan.' });
      }
    }

    const updated = await prisma.emisi.update({
      where: { id },
      data: req.body,
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'master',
      tableName: 'emisi',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Data emisi berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui emisi.',
      error: err.message,
    });
  }
}

export async function deleteEmisi(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Emisi tidak valid.' });
    }

    const existing = await prisma.emisi.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Emisi tidak ditemukan.' });
    }

    // Soft delete
    const updated = await prisma.emisi.update({
      where: { id },
      data: { is_active: false },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'master',
      tableName: 'emisi',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Emisi berhasil dinonaktifkan.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menonaktifkan emisi.',
      error: err.message,
    });
  }
}

// ==========================================
// C. Controller Shift
// ==========================================

export async function getAllShift(req, res) {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const data = await prisma.shift.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return successResponse(res, {
      message: 'Data shift berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data shift.',
      error: err.message,
    });
  }
}

export async function getShiftById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Shift tidak valid.' });
    }

    const data = await prisma.shift.findUnique({ where: { id } });
    if (!data) {
      return errorResponse(res, { status: 404, message: 'Shift tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail shift berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail shift.',
      error: err.message,
    });
  }
}

export async function createShift(req, res) {
  try {
    const { nama, jam_mulai, jam_selesai, is_active } = req.body;

    const existing = await prisma.shift.findFirst({ where: { nama } });
    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Shift dengan nama "${nama}" sudah terdaftar.`,
      });
    }

    const created = await prisma.shift.create({
      data: {
        nama,
        jam_mulai,
        jam_selesai,
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'master',
      tableName: 'shift',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Shift baru berhasil ditambahkan.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat shift baru.',
      error: err.message,
    });
  }
}

export async function updateShift(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Shift tidak valid.' });
    }

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Shift tidak ditemukan.' });
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: req.body,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'master',
      tableName: 'shift',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Data shift berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui data shift.',
      error: err.message,
    });
  }
}

export async function deleteShift(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Shift tidak valid.' });
    }

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Shift tidak ditemukan.' });
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: { is_active: false },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'master',
      tableName: 'shift',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Shift berhasil dinonaktifkan.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menonaktifkan shift.',
      error: err.message,
    });
  }
}
