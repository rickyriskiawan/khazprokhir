import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

// ==========================================
// A. Transaksi Mutasi HCTS
// ==========================================

/**
 * Mengambil daftar data transaksi mutasi HCTS
 * Filter query: tanggal, denominasi_id
 * GET /api/hcts
 */
export async function getAllTransaksiHcts(req, res) {
  try {
    const { tanggal, denominasi_id } = req.query;
    const where = {};

    if (tanggal) {
      where.tanggal = new Date(`${tanggal}T00:00:00.000Z`);
    }
    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }

    const data = await prisma.transaksiHcts.findMany({
      where,
      include: {
        denominasi: true,
      },
      orderBy: [
        { tanggal: 'desc' },
        { id: 'desc' },
      ],
    });

    return successResponse(res, {
      message: 'Data transaksi HCTS berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data transaksi HCTS.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail transaksi HCTS berdasarkan ID
 * GET /api/hcts/:id
 */
export async function getTransaksiHctsById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Transaksi HCTS tidak valid.' });
    }

    const data = await prisma.transaksiHcts.findUnique({
      where: { id },
      include: { denominasi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Data transaksi HCTS tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail transaksi HCTS berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail transaksi HCTS.',
      error: err.message,
    });
  }
}

/**
 * Input transaksi mutasi HCTS baru
 * POST /api/hcts
 */
export async function createTransaksiHcts(req, res) {
  try {
    const {
      tanggal,
      denominasi_id,
      penerimaan_bilyet,
      penyerahan_bilyet,
      akumulasi_penyerahan_bi,
      persediaan_hcts,
      jumlah_ct_siap_hitung,
      catatan,
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

    const created = await prisma.transaksiHcts.create({
      data: {
        tanggal,
        denominasi_id,
        penerimaan_bilyet: BigInt(penerimaan_bilyet || 0),
        penyerahan_bilyet: BigInt(penyerahan_bilyet || 0),
        akumulasi_penyerahan_bi: BigInt(akumulasi_penyerahan_bi || 0),
        persediaan_hcts: BigInt(persediaan_hcts || 0),
        jumlah_ct_siap_hitung: jumlah_ct_siap_hitung || 0,
        catatan: catatan || null,
      },
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'planning',
      tableName: 'transaksi_hcts',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Data transaksi HCTS berhasil dicatat.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mencatat data transaksi HCTS.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui transaksi HCTS
 * PUT /api/hcts/:id
 */
export async function updateTransaksiHcts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Transaksi HCTS tidak valid.' });
    }

    const existing = await prisma.transaksiHcts.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Data transaksi HCTS tidak ditemukan.' });
    }

    const {
      tanggal,
      denominasi_id,
      penerimaan_bilyet,
      penyerahan_bilyet,
      akumulasi_penyerahan_bi,
      persediaan_hcts,
      jumlah_ct_siap_hitung,
      catatan,
    } = req.body;

    const updateData = {};
    if (tanggal !== undefined) updateData.tanggal = tanggal;
    if (denominasi_id !== undefined) updateData.denominasi_id = denominasi_id;
    if (penerimaan_bilyet !== undefined) updateData.penerimaan_bilyet = BigInt(penerimaan_bilyet);
    if (penyerahan_bilyet !== undefined) updateData.penyerahan_bilyet = BigInt(penyerahan_bilyet);
    if (akumulasi_penyerahan_bi !== undefined) updateData.akumulasi_penyerahan_bi = BigInt(akumulasi_penyerahan_bi);
    if (persediaan_hcts !== undefined) updateData.persediaan_hcts = BigInt(persediaan_hcts);
    if (jumlah_ct_siap_hitung !== undefined) updateData.jumlah_ct_siap_hitung = jumlah_ct_siap_hitung;
    if (catatan !== undefined) updateData.catatan = catatan;

    const updated = await prisma.transaksiHcts.update({
      where: { id },
      data: updateData,
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'planning',
      tableName: 'transaksi_hcts',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Data transaksi HCTS berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui transaksi HCTS.',
      error: err.message,
    });
  }
}

/**
 * Menghapus transaksi HCTS
 * DELETE /api/hcts/:id
 */
export async function deleteTransaksiHcts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Transaksi HCTS tidak valid.' });
    }

    const existing = await prisma.transaksiHcts.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Data transaksi HCTS tidak ditemukan.' });
    }

    await prisma.transaksiHcts.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'planning',
      tableName: 'transaksi_hcts',
      recordId: id,
      oldValue: existing,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Data transaksi HCTS berhasil dihapus.',
      data: { id },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghapus transaksi HCTS.',
      error: err.message,
    });
  }
}

// ==========================================
// B. Rencana Penyerahan
// ==========================================

/**
 * Mengambil daftar data rencana penyerahan
 * Filter query: tanggal_rencana, denominasi_id
 * GET /api/rencana-penyerahan
 */
export async function getAllRencanaPenyerahan(req, res) {
  try {
    const { tanggal_rencana, denominasi_id } = req.query;
    const where = {};

    if (tanggal_rencana) {
      where.tanggal_rencana = new Date(`${tanggal_rencana}T00:00:00.000Z`);
    }
    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }

    const data = await prisma.rencanaPenyerahan.findMany({
      where,
      include: {
        denominasi: true,
      },
      orderBy: [
        { tanggal_rencana: 'desc' },
        { id: 'desc' },
      ],
    });

    return successResponse(res, {
      message: 'Data rencana penyerahan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil data rencana penyerahan.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail rencana penyerahan berdasarkan ID
 * GET /api/rencana-penyerahan/:id
 */
export async function getRencanaPenyerahanById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Rencana Penyerahan tidak valid.' });
    }

    const data = await prisma.rencanaPenyerahan.findUnique({
      where: { id },
      include: { denominasi: true },
    });

    if (!data) {
      return errorResponse(res, { status: 404, message: 'Rencana penyerahan tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail rencana penyerahan berhasil diambil.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail rencana penyerahan.',
      error: err.message,
    });
  }
}

/**
 * Input rencana penyerahan baru
 * POST /api/rencana-penyerahan
 */
export async function createRencanaPenyerahan(req, res) {
  try {
    const {
      tanggal_rencana,
      denominasi_id,
      kurang_pengemasan_bilyet,
      kurang_pengemasan_doos,
      kurang_penerimaan_bilyet,
      kurang_penerimaan_vell,
      catatan,
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

    const created = await prisma.rencanaPenyerahan.create({
      data: {
        tanggal_rencana,
        denominasi_id,
        kurang_pengemasan_bilyet: BigInt(kurang_pengemasan_bilyet || 0),
        kurang_pengemasan_doos: kurang_pengemasan_doos || 0,
        kurang_penerimaan_bilyet: BigInt(kurang_penerimaan_bilyet || 0),
        kurang_penerimaan_vell: kurang_penerimaan_vell || 0,
        catatan: catatan || null,
      },
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'planning',
      tableName: 'rencana_penyerahan',
      recordId: created.id,
      newValue: created,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: 'Rencana penyerahan berhasil ditambahkan.',
      data: created,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menambahkan rencana penyerahan.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui data rencana penyerahan
 * PUT /api/rencana-penyerahan/:id
 */
export async function updateRencanaPenyerahan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Rencana Penyerahan tidak valid.' });
    }

    const existing = await prisma.rencanaPenyerahan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Rencana penyerahan tidak ditemukan.' });
    }

    const {
      tanggal_rencana,
      denominasi_id,
      kurang_pengemasan_bilyet,
      kurang_pengemasan_doos,
      kurang_penerimaan_bilyet,
      kurang_penerimaan_vell,
      catatan,
    } = req.body;

    const updateData = {};
    if (tanggal_rencana !== undefined) updateData.tanggal_rencana = tanggal_rencana;
    if (denominasi_id !== undefined) updateData.denominasi_id = denominasi_id;
    if (kurang_pengemasan_bilyet !== undefined) updateData.kurang_pengemasan_bilyet = BigInt(kurang_pengemasan_bilyet);
    if (kurang_pengemasan_doos !== undefined) updateData.kurang_pengemasan_doos = kurang_pengemasan_doos;
    if (kurang_penerimaan_bilyet !== undefined) updateData.kurang_penerimaan_bilyet = BigInt(kurang_penerimaan_bilyet);
    if (kurang_penerimaan_vell !== undefined) updateData.kurang_penerimaan_vell = kurang_penerimaan_vell;
    if (catatan !== undefined) updateData.catatan = catatan;

    const updated = await prisma.rencanaPenyerahan.update({
      where: { id },
      data: updateData,
      include: { denominasi: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'planning',
      tableName: 'rencana_penyerahan',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Rencana penyerahan berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui rencana penyerahan.',
      error: err.message,
    });
  }
}

/**
 * Menghapus rencana penyerahan
 * DELETE /api/rencana-penyerahan/:id
 */
export async function deleteRencanaPenyerahan(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Rencana Penyerahan tidak valid.' });
    }

    const existing = await prisma.rencanaPenyerahan.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, { status: 404, message: 'Rencana penyerahan tidak ditemukan.' });
    }

    await prisma.rencanaPenyerahan.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'planning',
      tableName: 'rencana_penyerahan',
      recordId: id,
      oldValue: existing,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Rencana penyerahan berhasil dihapus.',
      data: { id },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghapus rencana penyerahan.',
      error: err.message,
    });
  }
}

