import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { calculateDoosFromPack, packToBilyet } from '../utils/converter.js';
import { isKelipatanEmpat, checkKemasSafetyLock } from '../utils/businessRules.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

const KEMAS_LOCK_CHECK_INCLUDE = {
  pengiriman_details: true,
  kemas_pack_details: {
    include: { pack_detail: true },
  },
};

/**
 * Mencatat hasil pengemasan doos baru (Rasio 4 Pack = 9 Doos)
 * POST /api/kemas
 */
export async function createKemas(req, res) {
  try {
    const {
      batch_id,
      shift_id,
      tanggal_kemas,
      pack_dari,
      pack_sampai,
      no_doos_awal,
      no_ba_pengemasan,
      proses_sortir_id,
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
        message: `Total pack yang dikemas harus kelipatan 4 (diterima: ${totalPack} pack). Pengemasan doos di Khazprokhir wajib kelipatan 4 sesuai rasio 4 Pack = 9 Doos.`,
      });
    }

    // 4. Validasi Ketersediaan Pack dalam Batch & Status Wajib SORTED
    const requestedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id,
        nomor_pack: {
          gte: pack_dari,
          lte: pack_sampai,
        },
      },
      include: {
        sortir_pack_details: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
      orderBy: { nomor_pack: 'asc' },
    });

    // Pastikan seluruh nomor pack dalam rentang terdaftar di database
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

    // Periksa status pack: WAJIB berstatus SORTED
    const notSortedPacks = requestedPacks.filter((p) => p.status !== 'SORTED');
    if (notSortedPacks.length > 0) {
      const invalidDetails = notSortedPacks
        .map((p) => `#${p.nomor_pack} (${p.status})`)
        .join(', ');
      return errorResponse(res, {
        status: 400,
        error: 'InvalidPackStatus',
        message: `Gagal melakukan pengemasan: Pack berikut belum berstatus SORTED atau sudah diproses: ${invalidDetails}. Pengemasan hanya dapat dilakukan pada pack yang telah selesai disortir.`,
      });
    }

    // 5. Kalkulasi Doos & Bilyet (Rasio 4 Pack = 9 Doos)
    const totalDoos = calculateDoosFromPack(totalPack);
    const noDoosAkhir = no_doos_awal + totalDoos - 1;
    const totalBilyet = packToBilyet(totalPack, true);
    const denominasiId = batch.emisi.denominasi_id;
    const tahunAnggaran = batch.tahun_anggaran;

    // 6. Validasi Pencegahan Overlap Nomor Doos per Denominasi & Tahun Anggaran
    const overlappingKemas = await prisma.hasilKemas.findFirst({
      where: {
        denominasi_id: denominasiId,
        tahun_anggaran: tahunAnggaran,
        no_doos_awal: { lte: noDoosAkhir },
        no_doos_akhir: { gte: no_doos_awal },
      },
      include: { batch: true },
    });

    if (overlappingKemas) {
      return errorResponse(res, {
        status: 400,
        error: 'DoosOverlap',
        message: `Nomor doos ${no_doos_awal} s/d ${noDoosAkhir} bertabrakan dengan hasil kemas ID ${overlappingKemas.id} (Doos ${overlappingKemas.no_doos_awal}-${overlappingKemas.no_doos_akhir}) pada batch ${overlappingKemas.batch.nomor_batch} untuk pecahan ${batch.emisi.denominasi.nama_pecahan} TA ${tahunAnggaran}.`,
      });
    }

    // 7. Resolusi ID Sesi Sortir (jika tidak disediakan, auto-detect dari pack)
    const finalProsesSortirId =
      proses_sortir_id ||
      requestedPacks[0]?.sortir_pack_details?.[0]?.proses_sortir_id ||
      null;

    // 8. Database Transaction
    const createdKemas = await prisma.$transaction(async (tx) => {
      // A. Buat record HasilKemas
      const kemas = await tx.hasilKemas.create({
        data: {
          batch_id,
          proses_sortir_id: finalProsesSortirId,
          denominasi_id: denominasiId,
          tahun_anggaran: tahunAnggaran,
          pack_dari,
          pack_sampai,
          total_pack: totalPack,
          no_doos_awal,
          no_doos_akhir: noDoosAkhir,
          total_doos: totalDoos,
          total_bilyet: totalBilyet,
          no_ba_pengemasan,
          shift_id,
          operator_id: req.user.id,
          tanggal_kemas,
          status: 'READY',
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
          denominasi: true,
          shift: true,
          operator: {
            select: USER_SAFE_SELECT,
          },
          proses_sortir: true,
        },
      });

      // B. Buat relasi di KemasPackDetail
      const kemasDetailsData = requestedPacks.map((p) => ({
        hasil_kemas_id: kemas.id,
        pack_detail_id: p.id,
      }));

      await tx.kemasPackDetail.createMany({
        data: kemasDetailsData,
      });

      // C. Update status seluruh pack menjadi PACKED dan set no_doos_range & hasil_kemas_id
      await tx.packDetail.updateMany({
        where: {
          batch_id,
          nomor_pack: {
            gte: pack_dari,
            lte: pack_sampai,
          },
        },
        data: {
          status: 'PACKED',
          hasil_kemas_id: kemas.id,
          no_doos_range: `Doos ${no_doos_awal}-${noDoosAkhir}`,
        },
      });

      return kemas;
    });

    // 9. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'kemas',
      tableName: 'hasil_kemas',
      recordId: createdKemas.id,
      newValue: {
        id: createdKemas.id,
        batch_id: createdKemas.batch_id,
        denominasi_id: createdKemas.denominasi_id,
        tahun_anggaran: createdKemas.tahun_anggaran,
        pack_dari: createdKemas.pack_dari,
        pack_sampai: createdKemas.pack_sampai,
        total_pack: createdKemas.total_pack,
        no_doos_awal: createdKemas.no_doos_awal,
        no_doos_akhir: createdKemas.no_doos_akhir,
        total_doos: createdKemas.total_doos,
        total_bilyet: createdKemas.total_bilyet.toString(),
        no_ba_pengemasan: createdKemas.no_ba_pengemasan,
        status: createdKemas.status,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: `Hasil pengemasan doos berhasil dicatat (${totalPack} pack = ${totalDoos} doos [Doos ${no_doos_awal}-${noDoosAkhir}]).`,
      data: createdKemas,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mencatat hasil pengemasan doos.',
      error: err.message,
    });
  }
}

/**
 * Mengambil daftar seluruh hasil kemas doos
 * Mendukung filter: batch_id, shift_id, denominasi_id, tahun_anggaran, no_ba_pengemasan, tanggal_kemas, status
 * Mendukung pagination: page, limit
 * GET /api/kemas
 */
export async function getAllKemas(req, res) {
  try {
    const {
      batch_id,
      shift_id,
      denominasi_id,
      tahun_anggaran,
      no_ba_pengemasan,
      tanggal_kemas,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const where = {};

    if (batch_id) where.batch_id = parseInt(batch_id, 10);
    if (shift_id) where.shift_id = parseInt(shift_id, 10);
    if (denominasi_id) where.denominasi_id = parseInt(denominasi_id, 10);
    if (tahun_anggaran) where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    if (status) where.status = status;

    if (no_ba_pengemasan) {
      where.no_ba_pengemasan = {
        contains: no_ba_pengemasan.trim(),
        mode: 'insensitive',
      };
    }

    if (tanggal_kemas) {
      where.tanggal_kemas = new Date(`${tanggal_kemas}T00:00:00.000Z`);
    }

    const [total, data] = await Promise.all([
      prisma.hasilKemas.count({ where }),
      prisma.hasilKemas.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ tanggal_kemas: 'desc' }, { no_doos_awal: 'desc' }],
        include: {
          batch: {
            include: {
              emisi: {
                include: { denominasi: true },
              },
            },
          },
          denominasi: true,
          shift: true,
          operator: {
            select: USER_SAFE_SELECT,
          },
          proses_sortir: true,
          _count: {
            select: {
              kemas_pack_details: true,
              packs_in_kemas: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return successResponse(res, {
      status: 200,
      message: 'Daftar hasil pengemasan doos berhasil diambil.',
      data,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar hasil pengemasan doos.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail hasil kemas doos berdasarkan ID
 * GET /api/kemas/:id
 */
export async function getKemasById(req, res) {
  try {
    const { id } = req.params;
    const kemasId = parseInt(id, 10);

    if (isNaN(kemasId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID hasil kemas harus berupa angka.',
      });
    }

    const kemas = await prisma.hasilKemas.findUnique({
      where: { id: kemasId },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        denominasi: true,
        shift: true,
        operator: {
          select: USER_SAFE_SELECT,
        },
        proses_sortir: true,
        kemas_pack_details: {
          include: {
            pack_detail: true,
          },
          orderBy: {
            pack_detail: {
              nomor_pack: 'asc',
            },
          },
        },
        pengiriman_details: true,
      },
    });

    if (!kemas) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Hasil kemas dengan ID ${kemasId} tidak ditemukan.`,
      });
    }

    return successResponse(res, {
      status: 200,
      message: 'Detail hasil pengemasan doos berhasil diambil.',
      data: kemas,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail hasil pengemasan doos.',
      error: err.message,
    });
  }
}

/**
 * Mengambil daftar pack pada suatu batch yang berstatus SORTED
 * dan siap untuk dikemas ke dalam doos
 * GET /api/kemas/available-packs/:batchId
 */
export async function getAvailableSortedPacks(req, res) {
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
        status: 'SORTED',
      },
      orderBy: { nomor_pack: 'asc' },
    });

    const packNumbers = availablePacks.map((p) => p.nomor_pack);

    return successResponse(res, {
      status: 200,
      message: `Ditemukan ${availablePacks.length} pack yang berstatus SORTED pada batch ${batch.nomor_batch}.`,
      data: {
        batch_id: batch.id,
        nomor_batch: batch.nomor_batch,
        tahun_anggaran: batch.tahun_anggaran,
        denominasi: batch.emisi.denominasi,
        total_available: availablePacks.length,
        available_pack_numbers: packNumbers,
        packs: availablePacks,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar pack berstatus SORTED.',
      error: err.message,
    });
  }
}

/**
 * Mendapatkan rekomendasi nomor doos awal berikutnya untuk denominasi pada tahun anggaran berjalan
 * GET /api/kemas/next-doos-number
 */
export async function getNextDoosNumber(req, res) {
  try {
    const { batch_id, denominasi_id, tahun_anggaran } = req.query;

    let targetDenomId;
    let targetTahun;
    let batchInfo = null;

    if (batch_id) {
      const bId = parseInt(batch_id, 10);
      if (isNaN(bId)) {
        return errorResponse(res, {
          status: 400,
          error: 'BadRequest',
          message: 'Parameter batch_id harus berupa angka.',
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

      targetDenomId = batch.emisi.denominasi_id;
      targetTahun = batch.tahun_anggaran;
      batchInfo = {
        batch_id: batch.id,
        nomor_batch: batch.nomor_batch,
        denominasi: batch.emisi.denominasi.nama_pecahan,
      };
    } else {
      targetDenomId = parseInt(denominasi_id, 10);
      targetTahun = parseInt(tahun_anggaran, 10);

      if (isNaN(targetDenomId) || isNaN(targetTahun)) {
        return errorResponse(res, {
          status: 400,
          error: 'BadRequest',
          message: 'Parameter batch_id atau kombinasi (denominasi_id dan tahun_anggaran) wajib disertakan berupa angka.',
        });
      }
    }

    // Cari doos akhir tertinggi pada denominasi dan tahun anggaran yang bersangkutan
    const lastKemas = await prisma.hasilKemas.findFirst({
      where: {
        denominasi_id: targetDenomId,
        tahun_anggaran: targetTahun,
      },
      orderBy: { no_doos_akhir: 'desc' },
      select: {
        id: true,
        no_doos_awal: true,
        no_doos_akhir: true,
        no_ba_pengemasan: true,
        tanggal_kemas: true,
      },
    });

    const lastNoDoos = lastKemas ? lastKemas.no_doos_akhir : 0;
    const nextNoDoosAwal = lastNoDoos + 1;

    return successResponse(res, {
      status: 200,
      message: 'Rekomendasi nomor doos berikutnya berhasil dihitung.',
      data: {
        denominasi_id: targetDenomId,
        tahun_anggaran: targetTahun,
        last_kemas: lastKemas,
        last_no_doos: lastNoDoos,
        next_no_doos_awal: nextNoDoosAwal,
        ...(batchInfo && { batch: batchInfo }),
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghitung rekomendasi nomor doos berikutnya.',
      error: err.message,
    });
  }
}

/**
 * Memperbarui metadata hasil kemas doos (hanya jika belum SHIPPED)
 * PUT /api/kemas/:id
 */
export async function updateKemas(req, res) {
  try {
    const { id } = req.params;
    const kemasId = parseInt(id, 10);

    if (isNaN(kemasId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID hasil kemas harus berupa angka.',
      });
    }

    // 1. Cari hasil kemas dan periksa safety lock
    const kemas = await prisma.hasilKemas.findUnique({
      where: { id: kemasId },
      include: KEMAS_LOCK_CHECK_INCLUDE,
    });

    if (!kemas) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Hasil kemas dengan ID ${kemasId} tidak ditemukan.`,
      });
    }

    const lockCheck = checkKemasSafetyLock(kemas, 'diperbarui');
    if (lockCheck.isLocked) {
      return errorResponse(res, {
        status: 400,
        error: 'SafetyLockError',
        message: lockCheck.message,
      });
    }

    const { shift_id, tanggal_kemas, no_ba_pengemasan, catatan } = req.body;

    // 2. Validasi shift baru jika diberikan
    if (shift_id) {
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
    }

    const updateData = {};
    if (shift_id !== undefined) updateData.shift_id = shift_id;
    if (tanggal_kemas !== undefined) updateData.tanggal_kemas = tanggal_kemas;
    if (no_ba_pengemasan !== undefined) updateData.no_ba_pengemasan = no_ba_pengemasan;
    if (catatan !== undefined) updateData.catatan = catatan || null;

    const oldValues = {
      shift_id: kemas.shift_id,
      tanggal_kemas: kemas.tanggal_kemas,
      no_ba_pengemasan: kemas.no_ba_pengemasan,
      catatan: kemas.catatan,
    };

    const updatedKemas = await prisma.hasilKemas.update({
      where: { id: kemasId },
      data: updateData,
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        denominasi: true,
        shift: true,
        operator: {
          select: USER_SAFE_SELECT,
        },
        proses_sortir: true,
      },
    });

    // 3. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'kemas',
      tableName: 'hasil_kemas',
      recordId: kemasId,
      oldValue: oldValues,
      newValue: updateData,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: 'Metadata hasil pengemasan doos berhasil diperbarui.',
      data: updatedKemas,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui hasil pengemasan doos.',
      error: err.message,
    });
  }
}

/**
 * Pembatalan hasil kemas doos (Hanya oleh SUPERVISOR)
 * Mengembalikan status pack kembali ke SORTED dan menghapus record kemas
 * DELETE /api/kemas/:id
 */
export async function deleteKemas(req, res) {
  try {
    const { id } = req.params;
    const kemasId = parseInt(id, 10);

    if (isNaN(kemasId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID hasil kemas harus berupa angka.',
      });
    }

    // 1. Cari hasil kemas dan periksa safety lock
    const kemas = await prisma.hasilKemas.findUnique({
      where: { id: kemasId },
      include: {
        ...KEMAS_LOCK_CHECK_INCLUDE,
        batch: true,
        denominasi: true,
      },
    });

    if (!kemas) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Hasil kemas dengan ID ${kemasId} tidak ditemukan.`,
      });
    }

    const lockCheck = checkKemasSafetyLock(kemas, 'dibatalkan');
    if (lockCheck.isLocked) {
      return errorResponse(res, {
        status: 400,
        error: 'SafetyLockError',
        message: lockCheck.message,
      });
    }

    // 2. Eksekusi Rollback dalam Database Transaction
    await prisma.$transaction(async (tx) => {
      const packIds = kemas.kemas_pack_details.map((kpd) => kpd.pack_detail_id);

      // Revert status pack kembali ke SORTED dan hapus relasi hasil_kemas & no_doos_range
      if (packIds.length > 0) {
        await tx.packDetail.updateMany({
          where: {
            id: { in: packIds },
          },
          data: {
            status: 'SORTED',
            hasil_kemas_id: null,
            no_doos_range: null,
          },
        });
      }

      // Hapus relasi di kemas_pack_detail
      await tx.kemasPackDetail.deleteMany({
        where: { hasil_kemas_id: kemasId },
      });

      // Hapus record hasil_kemas
      await tx.hasilKemas.delete({
        where: { id: kemasId },
      });
    });

    // 3. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'kemas',
      tableName: 'hasil_kemas',
      recordId: kemasId,
      oldValue: {
        id: kemas.id,
        batch_id: kemas.batch_id,
        nomor_batch: kemas.batch?.nomor_batch,
        denominasi: kemas.denominasi?.nama_pecahan,
        tahun_anggaran: kemas.tahun_anggaran,
        pack_dari: kemas.pack_dari,
        pack_sampai: kemas.pack_sampai,
        total_pack: kemas.total_pack,
        no_doos_awal: kemas.no_doos_awal,
        no_doos_akhir: kemas.no_doos_akhir,
        total_doos: kemas.total_doos,
        total_bilyet: kemas.total_bilyet.toString(),
        no_ba_pengemasan: kemas.no_ba_pengemasan,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Hasil kemas ID ${kemasId} (Doos ${kemas.no_doos_awal}-${kemas.no_doos_akhir}) berhasil dibatalkan. Status ${kemas.total_pack} pack telah dikembalikan ke status SORTED.`,
      data: {
        id: kemasId,
        batch_id: kemas.batch_id,
        pack_dari: kemas.pack_dari,
        pack_sampai: kemas.pack_sampai,
        total_pack: kemas.total_pack,
        reverted_status: 'SORTED',
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membatalkan hasil pengemasan doos.',
      error: err.message,
    });
  }
}

/**
 * Ringkasan hasil kemas doos hari ini
 * GET /api/kemas/summary/today
 */
export async function getKemasSummaryToday(req, res) {
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

    const kemasRecords = await prisma.hasilKemas.findMany({
      where: {
        tanggal_kemas: targetDate,
      },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        denominasi: true,
      },
    });

    let totalKemas = kemasRecords.length;
    let totalPack = 0;
    let totalDoos = 0;
    let totalBilyet = 0n;

    const perDenominasi = {};

    for (const k of kemasRecords) {
      totalPack += k.total_pack;
      totalDoos += k.total_doos;
      totalBilyet += BigInt(k.total_bilyet);

      const denomName = k.denominasi?.nama || k.batch?.emisi?.denominasi?.nama || 'UNKNOWN';
      const denomNilai = k.denominasi?.nilai || k.batch?.emisi?.denominasi?.nilai || 0;

      if (!perDenominasi[denomName]) {
        perDenominasi[denomName] = {
          denominasi: denomName,
          nilai: denomNilai,
          total_kemas: 0,
          total_pack: 0,
          total_doos: 0,
          total_bilyet: 0n,
        };
      }

      perDenominasi[denomName].total_kemas += 1;
      perDenominasi[denomName].total_pack += k.total_pack;
      perDenominasi[denomName].total_doos += k.total_doos;
      perDenominasi[denomName].total_bilyet += BigInt(k.total_bilyet);
    }

    const rincianDenominasi = Object.values(perDenominasi).map((item) => ({
      ...item,
      total_bilyet: item.total_bilyet.toString(),
    }));

    return successResponse(res, {
      status: 200,
      message: 'Ringkasan hasil kemas hari ini berhasil diambil.',
      data: {
        tanggal: dateStr,
        total_kemas: totalKemas,
        total_pack: totalPack,
        total_doos: totalDoos,
        total_bilyet: totalBilyet.toString(),
        rincian_denominasi: rincianDenominasi,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil ringkasan hasil kemas hari ini.',
      error: err.message,
    });
  }
}
