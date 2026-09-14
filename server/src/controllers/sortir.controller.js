import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { packToBrood, packToBilyet } from '../utils/converter.js';
import { isKelipatanEmpat, checkSortirSafetyLock } from '../utils/businessRules.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

const SORTIR_LOCK_CHECK_INCLUDE = {
  sortir_pack_details: {
    include: { pack_detail: true },
  },
  hasil_kemas: true,
};

/**
 * Membuat sesi sortir baru (Zero Reject, Kelipatan 4 Pack)
 * POST /api/sortir
 */
export async function createSortir(req, res) {
  try {
    const {
      batch_id,
      shift_id,
      tanggal_sortir,
      pack_dari,
      pack_sampai,
      penyortir_1,
      penyortir_2,
      catatan,
    } = req.body;

    // 1. Validasi Keberadaan Shift
    const shift = await prisma.shift.findUnique({
      where: { id: shift_id },
    });

    if (!shift) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Shift dengan ID ${shift_id} tidak ditemukan.`,
      });
    }

    // 2. Validasi Keberadaan Batch
    const batch = await prisma.batch.findUnique({
      where: { id: batch_id },
      include: {
        emisi: {
          include: { denominasi: true },
        },
      },
    });

    if (!batch) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Batch dengan ID ${batch_id} tidak ditemukan.`,
      });
    }

    // 3. Validasi Aturan Kelipatan 4 Pack
    const totalPack = pack_sampai - pack_dari + 1;
    if (!isKelipatanEmpat(totalPack)) {
      return errorResponse(res, {
        status: 400,
        error: 'InvalidPackQuantity',
        message: `Total pack yang disortir harus kelipatan 4 (diterima: ${totalPack} pack). Sortir di Khazprokhir wajib kelipatan 4 untuk rasio pengemasan doos.`,
      });
    }

    // 4. Validasi Ketersediaan Pack dalam Batch
    const requestedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id,
        nomor_pack: {
          gte: pack_dari,
          lte: pack_sampai,
        },
      },
      orderBy: { nomor_pack: 'asc' },
    });

    // Pastikan seluruh pack dalam rentang terdaftar di database
    if (requestedPacks.length !== totalPack) {
      const foundNumbers = new Set(requestedPacks.map((p) => p.nomor_pack));
      const missingNumbers = [];
      for (let i = pack_dari; i <= pack_sampai; i++) {
        if (!foundNumbers.has(i)) missingNumbers.push(i);
      }
      return errorResponse(res, {
        status: 400,
        error: 'PackNotFound',
        message: `Nomor pack ${missingNumbers.join(', ')} tidak ditemukan dalam batch ${batch.nomor_batch}.`,
      });
    }

    // Periksa status pack: WAJIB berstatus RECEIVED
    const notReceivedPacks = requestedPacks.filter((p) => p.status !== 'RECEIVED');
    if (notReceivedPacks.length > 0) {
      const invalidDetails = notReceivedPacks
        .map((p) => `#${p.nomor_pack} (${p.status})`)
        .join(', ');
      return errorResponse(res, {
        status: 400,
        error: 'InvalidPackStatus',
        message: `Gagal memulai sesi sortir: Pack berikut belum berstatus RECEIVED atau sudah diproses: ${invalidDetails}. Pastikan pack sudah diterima dari Khazai dan belum pernah disortir.`,
      });
    }

    // 5. Kalkulasi Zero Reject
    const totalBrood = packToBrood(totalPack);
    const totalBilyet = packToBilyet(totalPack, true);

    // 6. Database Transaction
    const createdSortir = await prisma.$transaction(async (tx) => {
      // A. Buat record ProsesSortir
      const proses = await tx.prosesSortir.create({
        data: {
          batch_id,
          pack_dari,
          pack_sampai,
          total_pack: totalPack,
          shift_id,
          operator_id: req.user.id,
          penyortir_1,
          penyortir_2,
          tanggal_sortir,
          total_brood: totalBrood,
          total_bilyet: totalBilyet,
          status: 'IN_PROGRESS',
          catatan: catatan || null,
        },
        include: {
          batch: {
            include: {
              emisi: {
                include: { denominasi: true },
              },
            },
          },
          shift: true,
          operator: {
            select: USER_SAFE_SELECT,
          },
        },
      });

      // B. Buat relasi di SortirPackDetail
      const sortirDetailsData = requestedPacks.map((p) => ({
        proses_sortir_id: proses.id,
        pack_detail_id: p.id,
      }));

      await tx.sortirPackDetail.createMany({
        data: sortirDetailsData,
      });

      // C. Update status seluruh pack menjadi SORTED
      await tx.packDetail.updateMany({
        where: {
          batch_id,
          nomor_pack: {
            gte: pack_dari,
            lte: pack_sampai,
          },
        },
        data: {
          status: 'SORTED',
        },
      });

      return proses;
    });

    // 7. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'sortir',
      tableName: 'proses_sortir',
      recordId: createdSortir.id,
      newValue: {
        id: createdSortir.id,
        batch_id: createdSortir.batch_id,
        pack_dari: createdSortir.pack_dari,
        pack_sampai: createdSortir.pack_sampai,
        total_pack: createdSortir.total_pack,
        penyortir_1: createdSortir.penyortir_1,
        penyortir_2: createdSortir.penyortir_2,
        total_brood: createdSortir.total_brood,
        total_bilyet: createdSortir.total_bilyet.toString(),
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: `Sesi sortir berhasil dicatat untuk ${totalPack} pack (Pack #${pack_dari} s/d #${pack_sampai}) oleh penyortir ${penyortir_1} & ${penyortir_2}.`,
      data: createdSortir,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mencatat sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Mengambil daftar sesi sortir dengan pagination & filter
 * GET /api/sortir
 */
export async function getAllSortir(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      batch_id,
      shift_id,
      status,
      tanggal_sortir,
      operator_id,
      penyortir,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (batch_id) where.batch_id = parseInt(batch_id, 10);
    if (shift_id) where.shift_id = parseInt(shift_id, 10);
    if (status) where.status = status;
    if (operator_id) where.operator_id = parseInt(operator_id, 10);

    if (tanggal_sortir) {
      where.tanggal_sortir = new Date(`${tanggal_sortir}T00:00:00.000Z`);
    }

    if (penyortir) {
      where.OR = [
        { penyortir_1: { contains: penyortir, mode: 'insensitive' } },
        { penyortir_2: { contains: penyortir, mode: 'insensitive' } },
      ];
    }

    if (search) {
      where.OR = [
        { batch: { nomor_batch: { contains: search, mode: 'insensitive' } } },
        { penyortir_1: { contains: search, mode: 'insensitive' } },
        { penyortir_2: { contains: search, mode: 'insensitive' } },
        { catatan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.prosesSortir.count({ where }),
      prisma.prosesSortir.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ tanggal_sortir: 'desc' }, { id: 'desc' }],
        include: {
          batch: {
            include: {
              emisi: {
                include: { denominasi: true },
              },
            },
          },
          shift: true,
          operator: {
            select: USER_SAFE_SELECT,
          },
          _count: {
            select: { sortir_pack_details: true },
          },
        },
      }),
    ]);

    return successResponse(res, {
      status: 200,
      message: 'Berhasil mengambil daftar sesi sortir.',
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail lengkap sesi sortir berdasar ID
 * GET /api/sortir/:id
 */
export async function getSortirById(req, res) {
  try {
    const { id } = req.params;
    const sortirId = parseInt(id, 10);

    if (isNaN(sortirId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID sesi sortir harus berupa angka.',
      });
    }

    const proses = await prisma.prosesSortir.findUnique({
      where: { id: sortirId },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        shift: true,
        operator: {
          select: USER_SAFE_SELECT,
        },
        sortir_pack_details: {
          include: {
            pack_detail: true,
          },
          orderBy: {
            pack_detail: { nomor_pack: 'asc' },
          },
        },
        hasil_kemas: true,
      },
    });

    if (!proses) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Sesi sortir dengan ID ${sortirId} tidak ditemukan.`,
      });
    }

    return successResponse(res, {
      status: 200,
      message: `Detail sesi sortir #${sortirId} berhasil diambil.`,
      data: proses,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Mengambil daftar nomor pack dalam suatu batch yang saat ini berstatus RECEIVED
 * dan siap untuk disortir
 * GET /api/sortir/available-packs/:batchId
 */
export async function getAvailablePacks(req, res) {
  try {
    const { batchId } = req.params;
    const bId = parseInt(batchId, 10);

    if (isNaN(bId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID batch harus berupa angka.',
      });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: bId },
      include: {
        emisi: {
          include: { denominasi: true },
        },
      },
    });

    if (!batch) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Batch dengan ID ${bId} tidak ditemukan.`,
      });
    }

    const availablePacks = await prisma.packDetail.findMany({
      where: {
        batch_id: bId,
        status: 'RECEIVED',
      },
      orderBy: { nomor_pack: 'asc' },
    });

    const packNumbers = availablePacks.map((p) => p.nomor_pack);

    return successResponse(res, {
      status: 200,
      message: `Ditemukan ${availablePacks.length} pack yang siap disortir pada batch ${batch.nomor_batch}.`,
      data: {
        batch_id: batch.id,
        nomor_batch: batch.nomor_batch,
        tahun_anggaran: batch.tahun_anggaran,
        total_available: availablePacks.length,
        available_pack_numbers: packNumbers,
        packs: availablePacks,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar pack yang siap disortir.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui metadata sesi sortir (penyortir, shift, tanggal, catatan)
 * PUT /api/sortir/:id
 */
export async function updateSortir(req, res) {
  try {
    const { id } = req.params;
    const sortirId = parseInt(id, 10);

    if (isNaN(sortirId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID sesi sortir harus berupa angka.',
      });
    }

    const existing = await prisma.prosesSortir.findUnique({
      where: { id: sortirId },
      include: SORTIR_LOCK_CHECK_INCLUDE,
    });

    if (!existing) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Sesi sortir dengan ID ${sortirId} tidak ditemukan.`,
      });
    }

    // Safety Locking
    const lockCheck = checkSortirSafetyLock(existing, 'diperbarui');
    if (lockCheck.isLocked) {
      return errorResponse(res, {
        status: 400,
        error: 'LockedSortirSession',
        message: lockCheck.message,
      });
    }

    const { shift_id, tanggal_sortir, penyortir_1, penyortir_2, catatan } = req.body;

    if (shift_id) {
      const shift = await prisma.shift.findUnique({ where: { id: shift_id } });
      if (!shift) {
        return errorResponse(res, {
          status: 404,
          error: 'NotFound',
          message: `Shift dengan ID ${shift_id} tidak ditemukan.`,
        });
      }
    }

    const updated = await prisma.prosesSortir.update({
      where: { id: sortirId },
      data: {
        ...(shift_id && { shift_id }),
        ...(tanggal_sortir && { tanggal_sortir }),
        ...(penyortir_1 && { penyortir_1 }),
        ...(penyortir_2 && { penyortir_2 }),
        ...(catatan !== undefined && { catatan }),
      },
      include: {
        batch: {
          include: { emisi: { include: { denominasi: true } } },
        },
        shift: true,
        operator: { select: USER_SAFE_SELECT },
      },
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'sortir',
      tableName: 'proses_sortir',
      recordId: updated.id,
      oldValue: {
        shift_id: existing.shift_id,
        penyortir_1: existing.penyortir_1,
        penyortir_2: existing.penyortir_2,
        catatan: existing.catatan,
      },
      newValue: {
        shift_id: updated.shift_id,
        penyortir_1: updated.penyortir_1,
        penyortir_2: updated.penyortir_2,
        catatan: updated.catatan,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Data sesi sortir #${sortirId} berhasil diperbarui.`,
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Menyelesaikan sesi sortir (IN_PROGRESS -> COMPLETED)
 * POST /api/sortir/:id/complete
 */
export async function completeSortir(req, res) {
  try {
    const { id } = req.params;
    const sortirId = parseInt(id, 10);

    if (isNaN(sortirId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID sesi sortir harus berupa angka.',
      });
    }

    const existing = await prisma.prosesSortir.findUnique({
      where: { id: sortirId },
    });

    if (!existing) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Sesi sortir dengan ID ${sortirId} tidak ditemukan.`,
      });
    }

    if (existing.status === 'COMPLETED') {
      return errorResponse(res, {
        status: 400,
        error: 'AlreadyCompleted',
        message: `Sesi sortir #${sortirId} sudah dalam status COMPLETED sebelumnya.`,
      });
    }

    const completed = await prisma.prosesSortir.update({
      where: { id: sortirId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
      },
      include: {
        batch: {
          include: { emisi: { include: { denominasi: true } } },
        },
        shift: true,
        operator: { select: USER_SAFE_SELECT },
      },
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'sortir',
      tableName: 'proses_sortir',
      recordId: completed.id,
      oldValue: { status: 'IN_PROGRESS' },
      newValue: { status: 'COMPLETED', completed_at: completed.completed_at },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Sesi sortir #${sortirId} berhasil diselesaikan (status: COMPLETED).`,
      data: completed,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menyelesaikan sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Membatalkan / menghapus sesi sortir (Koreksi oleh SUPERVISOR)
 * Mengembalikan status seluruh pack di dalamnya dari SORTED kembali ke RECEIVED
 * DELETE /api/sortir/:id
 */
export async function deleteSortir(req, res) {
  try {
    const { id } = req.params;
    const sortirId = parseInt(id, 10);

    if (isNaN(sortirId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID sesi sortir harus berupa angka.',
      });
    }

    const existing = await prisma.prosesSortir.findUnique({
      where: { id: sortirId },
      include: SORTIR_LOCK_CHECK_INCLUDE,
    });

    if (!existing) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Sesi sortir dengan ID ${sortirId} tidak ditemukan.`,
      });
    }

    // Safety Locking
    const lockCheck = checkSortirSafetyLock(existing, 'dibatalkan');
    if (lockCheck.isLocked) {
      return errorResponse(res, {
        status: 400,
        error: 'LockedSortirSession',
        message: lockCheck.message,
      });
    }

    const packDetailIds = existing.sortir_pack_details.map((spd) => spd.pack_detail_id);

    // Revert status pack dan hapus proses sortir dalam transaksi
    await prisma.$transaction(async (tx) => {
      // 1. Revert status pack_detail dari SORTED kembali ke RECEIVED
      if (packDetailIds.length > 0) {
        await tx.packDetail.updateMany({
          where: {
            id: { in: packDetailIds },
          },
          data: {
            status: 'RECEIVED',
          },
        });
      }

      // 2. Hapus proses sortir (sortir_pack_detail terhapus otomatis via onDelete: Cascade)
      await tx.prosesSortir.delete({
        where: { id: sortirId },
      });
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'sortir',
      tableName: 'proses_sortir',
      recordId: sortirId,
      oldValue: {
        id: existing.id,
        batch_id: existing.batch_id,
        pack_dari: existing.pack_dari,
        pack_sampai: existing.pack_sampai,
        total_pack: existing.total_pack,
        penyortir_1: existing.penyortir_1,
        penyortir_2: existing.penyortir_2,
        reverted_pack_count: packDetailIds.length,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Sesi sortir #${sortirId} berhasil dibatalkan. Status ${packDetailIds.length} pack telah dikembalikan ke status RECEIVED.`,
      data: {
        id: sortirId,
        reverted_pack_count: packDetailIds.length,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membatalkan sesi sortir.',
      error: err.message,
    });
  }
}

/**
 * Ringkasan proses sortir hari ini
 * GET /api/sortir/summary/today
 */
export async function getSortirSummaryToday(req, res) {
  try {
    const queryDate = req.query.tanggal;
    let targetDate;
    let dateStr;

    if (queryDate) {
      dateStr = queryDate;
      targetDate = new Date(`${queryDate}T00:00:00.000Z`);
    } else {
      const now = new Date();
      dateStr = now.toISOString().split('T')[0];
      targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    }

    const sessions = await prisma.prosesSortir.findMany({
      where: {
        tanggal_sortir: targetDate,
      },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
      },
    });

    let totalSesi = sessions.length;
    let totalPack = 0;
    let totalBrood = 0;
    let totalBilyet = 0n;

    const perDenominasi = {};

    for (const s of sessions) {
      totalPack += s.total_pack;
      totalBrood += s.total_brood;
      totalBilyet += BigInt(s.total_bilyet);

      const denomName = s.batch?.emisi?.denominasi?.nama || 'UNKNOWN';
      const denomNilai = s.batch?.emisi?.denominasi?.nilai || 0;

      if (!perDenominasi[denomName]) {
        perDenominasi[denomName] = {
          denominasi: denomName,
          nilai: denomNilai,
          total_pack: 0,
          total_brood: 0,
          total_bilyet: 0n,
          total_sesi: 0,
        };
      }

      perDenominasi[denomName].total_pack += s.total_pack;
      perDenominasi[denomName].total_brood += s.total_brood;
      perDenominasi[denomName].total_bilyet += BigInt(s.total_bilyet);
      perDenominasi[denomName].total_sesi += 1;
    }

    const rincianDenominasi = Object.values(perDenominasi).map((item) => ({
      ...item,
      total_bilyet: item.total_bilyet.toString(),
    }));

    return successResponse(res, {
      status: 200,
      message: 'Ringkasan sortir hari ini berhasil diambil.',
      data: {
        tanggal: dateStr,
        total_sesi: totalSesi,
        total_pack: totalPack,
        total_brood: totalBrood,
        total_bilyet: totalBilyet.toString(),
        rincian_denominasi: rincianDenominasi,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil ringkasan sortir hari ini.',
      error: err.message,
    });
  }
}
