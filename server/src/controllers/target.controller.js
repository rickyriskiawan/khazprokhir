import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

// ==========================================
// A. Target Produksi Tahunan
// ==========================================

/**
 * Mengambil daftar target tahunan
 * Filter query: tahun_anggaran, denominasi_id
 * GET /api/target-tahunan
 */
export async function getAllTargetTahunan(req, res) {
  try {
    const { tahun_anggaran, denominasi_id } = req.query;
    const where = {};

    if (tahun_anggaran) {
      where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    }
    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }

    const data = await prisma.targetTahunan.findMany({
      where,
      include: {
        denominasi: true,
      },
      orderBy: [
        { tahun_anggaran: 'desc' },
        { denominasi_id: 'asc' },
      ],
    });

    return successResponse(res, {
      message: 'Data target tahunan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data target tahunan.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail target tahunan berdasarkan ID
 * GET /api/target-tahunan/:id
 */
export async function getTargetTahunanById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Tahunan tidak valid.' });
    }

    const data = await prisma.targetTahunan.findUnique({
      where: { id },
      include: { denominasi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Target tahunan tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail target tahunan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail target tahunan.',
      error: err.message,
    });
  }
}

/**
 * Membuat target tahunan baru
 * Auto kalkulasi:
 * - target_brood = target_bilyet / 1000
 * - target_pack = target_brood / 45
 * POST /api/target-tahunan
 */
export async function createTargetTahunan(req, res) {
  try {
    const { tahun_anggaran, denominasi_id, target_bilyet, catatan } = req.body;

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

    // Cek keunikan target tahunan (tahun_anggaran + denominasi_id)
    const existing = await prisma.targetTahunan.findUnique({
      where: {
        tahun_anggaran_denominasi_id: {
          tahun_anggaran,
          denominasi_id,
        },
      },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Target tahunan untuk denominasi ${denominasi.nama} pada tahun anggaran ${tahun_anggaran} sudah terdaftar.`,
      });
    }

    // Kalkulasi otomatis rasio hierarki bilyet -> brood -> pack
    const bilyetBigInt = BigInt(target_bilyet);
    const target_brood = bilyetBigInt / 1000n;
    const target_pack = Number(target_brood / 45n);

    const created = await prisma.targetTahunan.create({
      data: {
        tahun_anggaran,
        denominasi_id,
        target_bilyet: bilyetBigInt,
        target_brood,
        target_pack,
        catatan: catatan || null,
      },
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'target',
      tableName: 'target_tahunan',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Target tahunan berhasil dibuat.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat target tahunan.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui target tahunan
 * PUT /api/target-tahunan/:id
 */
export async function updateTargetTahunan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Tahunan tidak valid.' });
    }

    const existing = await prisma.targetTahunan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Target tahunan tidak ditemukan.' });
    }

    const { target_bilyet, catatan } = req.body;
    const updateData = {};

    if (catatan !== undefined) {
      updateData.catatan = catatan;
    }

    if (target_bilyet !== undefined) {
      const bilyetBigInt = BigInt(target_bilyet);
      const target_brood = bilyetBigInt / 1000n;
      const target_pack = Number(target_brood / 45n);

      updateData.target_bilyet = bilyetBigInt;
      updateData.target_brood = target_brood;
      updateData.target_pack = target_pack;
    }

    const updated = await prisma.targetTahunan.update({
      where: { id },
      data: updateData,
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'target',
      tableName: 'target_tahunan',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Target tahunan berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui target tahunan.',
      error: err.message,
    });
  }
}

/**
 * Menghapus target tahunan
 * DELETE /api/target-tahunan/:id
 */
export async function deleteTargetTahunan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Tahunan tidak valid.' });
    }

    const existing = await prisma.targetTahunan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Target tahunan tidak ditemukan.' });
    }

    await prisma.targetTahunan.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'target',
      tableName: 'target_tahunan',
      recordId: id,
      oldValue: existing,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Target tahunan berhasil dihapus.',
      data: { id },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghapus target tahunan.',
      error: err.message,
    });
  }
}

// ==========================================
// B. Target Produksi Bulanan
// ==========================================

/**
 * Mengambil daftar target bulanan
 * Filter query: tahun_anggaran, bulan, denominasi_id
 * GET /api/target-bulanan
 */
export async function getAllTargetBulanan(req, res) {
  try {
    const { tahun_anggaran, bulan, denominasi_id } = req.query;
    const where = {};

    if (tahun_anggaran) {
      where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    }
    if (bulan) {
      where.bulan = parseInt(bulan, 10);
    }
    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }

    const data = await prisma.targetBulanan.findMany({
      where,
      include: {
        denominasi: true,
      },
      orderBy: [
        { tahun_anggaran: 'desc' },
        { bulan: 'asc' },
        { denominasi_id: 'asc' },
      ],
    });

    return successResponse(res, {
      message: 'Data target bulanan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data target bulanan.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail target bulanan berdasarkan ID
 * GET /api/target-bulanan/:id
 */
export async function getTargetBulananById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Bulanan tidak valid.' });
    }

    const data = await prisma.targetBulanan.findUnique({
      where: { id },
      include: { denominasi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Target bulanan tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail target bulanan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail target bulanan.',
      error: err.message,
    });
  }
}

/**
 * Membuat target bulanan baru
 * POST /api/target-bulanan
 */
export async function createTargetBulanan(req, res) {
  try {
    const {
      tahun_anggaran,
      bulan,
      denominasi_id,
      target_penyerahan_bilyet,
      target_pengemasan_bilyet,
      sisa_hari_kerja,
    } = req.body;

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

    // Cek keunikan target bulanan (tahun_anggaran + bulan + denominasi_id)
    const existing = await prisma.targetBulanan.findUnique({
      where: {
        tahun_anggaran_bulan_denominasi_id: {
          tahun_anggaran,
          bulan,
          denominasi_id,
        },
      },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Target bulanan untuk ${denominasi.nama} periode bulan ${bulan} tahun ${tahun_anggaran} sudah terdaftar.`,
      });
    }

    const created = await prisma.targetBulanan.create({
      data: {
        tahun_anggaran,
        bulan,
        denominasi_id,
        target_penyerahan_bilyet: BigInt(target_penyerahan_bilyet),
        target_pengemasan_bilyet: BigInt(target_pengemasan_bilyet),
        sisa_hari_kerja,
      },
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'target',
      tableName: 'target_bulanan',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Target bulanan berhasil dibuat.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat target bulanan.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui target bulanan
 * PUT /api/target-bulanan/:id
 */
export async function updateTargetBulanan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Bulanan tidak valid.' });
    }

    const existing = await prisma.targetBulanan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Target bulanan tidak ditemukan.' });
    }

    const { target_penyerahan_bilyet, target_pengemasan_bilyet, sisa_hari_kerja } = req.body;
    const updateData = {};

    if (target_penyerahan_bilyet !== undefined) {
      updateData.target_penyerahan_bilyet = BigInt(target_penyerahan_bilyet);
    }
    if (target_pengemasan_bilyet !== undefined) {
      updateData.target_pengemasan_bilyet = BigInt(target_pengemasan_bilyet);
    }
    if (sisa_hari_kerja !== undefined) {
      updateData.sisa_hari_kerja = sisa_hari_kerja;
    }

    const updated = await prisma.targetBulanan.update({
      where: { id },
      data: updateData,
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'target',
      tableName: 'target_bulanan',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Target bulanan berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui target bulanan.',
      error: err.message,
    });
  }
}

/**
 * Menghapus target bulanan
 * DELETE /api/target-bulanan/:id
 */
export async function deleteTargetBulanan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Target Bulanan tidak valid.' });
    }

    const existing = await prisma.targetBulanan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Target bulanan tidak ditemukan.' });
    }

    await prisma.targetBulanan.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'target',
      tableName: 'target_bulanan',
      recordId: id,
      oldValue: existing,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Target bulanan berhasil dihapus.',
      data: { id },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghapus target bulanan.',
      error: err.message,
    });
  }
}
