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
 * Berbasis sesi sortir: daftar pack diturunkan dari sesi sortir terpilih.
 * POST /api/kemas
 */
export async function createKemas(req, res) {
  try {
    const {
      proses_sortir_id,
      shift_id,
      tanggal_kemas,
      no_doos_awal,
      no_doos_akhir,
      no_ba_pengemasan,
      status = 'SIAP_KEMAS',
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

    // 2. Validasi Keberadaan Sesi Sortir beserta batch dan daftar pack-nya
    const sesi = await prisma.prosesSortir.findUnique({
      where: { id: proses_sortir_id },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        sortir_pack_details: {
          include: { pack_detail: true },
        },
      },
    });

    if (!sesi) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Sesi sortir dengan ID ${proses_sortir_id} tidak ditemukan.`,
      });
    }

    const batch = sesi.batch;
    const requestedPacks = sesi.sortir_pack_details
      .map((d) => d.pack_detail)
      .sort((a, b) => a.nomor_pack - b.nomor_pack);
    const totalPack = requestedPacks.length;

    // 3. Sesi sortir wajib sudah COMPLETED (Direct Completion - ADR 0007)
    if (sesi.status !== 'COMPLETED') {
      return errorResponse(res, {
        status: 400,
        error: 'InvalidSessionStatus',
        message: `Sesi sortir #${sesi.id} belum selesai (status: ${sesi.status}). Hanya sesi sortir COMPLETED yang dapat dikemas.`,
      });
    }

    if (totalPack === 0) {
      return errorResponse(res, {
        status: 400,
        error: 'EmptySession',
        message: `Sesi sortir #${sesi.id} tidak memiliki pack yang tercatat.`,
      });
    }

    // 4. Validasi Aturan Kelipatan 4 Pack
    if (!isKelipatanEmpat(totalPack)) {
      return errorResponse(res, {
        status: 400,
        error: 'InvalidPackQuantity',
        message: `Total pack yang dikemas harus kelipatan 4 (diterima: ${totalPack} pack). Pengemasan doos di Khazprokhir wajib kelipatan 4 sesuai rasio 4 Pack = 9 Doos.`,
      });
    }

    // 5. Periksa status pack: WAJIB berstatus SORTED
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

    // Periksa apakah ada pack yang sudah di-booking dalam antrian kemas lain
    const alreadyBookedPacks = requestedPacks.filter((p) => p.hasil_kemas_id !== null);
    if (alreadyBookedPacks.length > 0) {
      const bookedDetails = alreadyBookedPacks.map((p) => `#${p.nomor_pack}`).join(', ');
      return errorResponse(res, {
        status: 400,
        error: 'PackAlreadyBooked',
        message: `Gagal melakukan pengemasan: Pack berikut sudah terdaftar dalam antrian kemas lain: ${bookedDetails}.`,
      });
    }

    // 6. Kalkulasi Doos & Bilyet (Rasio 4 Pack = 9 Doos)
    const totalDoos = calculateDoosFromPack(totalPack);
    const expectedNoDoosAkhir = no_doos_awal + totalDoos - 1;

    if (no_doos_akhir !== expectedNoDoosAkhir) {
      return errorResponse(res, {
        status: 400,
        error: 'InvalidDoosRange',
        message: `Rentang nomor doos tidak sesuai rasio 4 Pack = 9 Doos. Untuk ${totalPack} pack (${totalDoos} doos), doos awal ${no_doos_awal} harus berakhir di ${expectedNoDoosAkhir} (diterima: ${no_doos_akhir}).`,
      });
    }

    const totalBilyet = packToBilyet(totalPack, true);
    const denominasiId = batch.emisi.denominasi_id;
    const tahunAnggaran = batch.tahun_anggaran;
    const packNumbers = requestedPacks.map((p) => p.nomor_pack);
    const packDari = packNumbers[0];
    const packSampai = packNumbers[packNumbers.length - 1];

    // 7. Validasi Pencegahan Overlap Nomor Doos per Denominasi & Tahun Anggaran
    const overlappingKemas = await prisma.hasilKemas.findFirst({
      where: {
        denominasi_id: denominasiId,
        tahun_anggaran: tahunAnggaran,
        no_doos_awal: { lte: no_doos_akhir },
        no_doos_akhir: { gte: no_doos_awal },
      },
      include: { batch: true },
    });

    if (overlappingKemas) {
      return errorResponse(res, {
        status: 400,
        error: 'DoosOverlap',
        message: `Nomor doos ${no_doos_awal} s/d ${no_doos_akhir} bertabrakan dengan hasil kemas ID ${overlappingKemas.id} (Doos ${overlappingKemas.no_doos_awal}-${overlappingKemas.no_doos_akhir}) pada batch ${overlappingKemas.batch.nomor_batch} untuk pecahan ${batch.emisi.denominasi.nama} TA ${tahunAnggaran}.`,
      });
    }

    // 8. Database Transaction
    const createdKemas = await prisma.$transaction(async (tx) => {
      // A. Buat record HasilKemas
      const kemas = await tx.hasilKemas.create({
        data: {
          batch_id: batch.id,
          proses_sortir_id: sesi.id,
          denominasi_id: denominasiId,
          tahun_anggaran: tahunAnggaran,
          pack_dari: packDari,
          pack_sampai: packSampai,
          total_pack: totalPack,
          no_doos_awal,
          no_doos_akhir,
          total_doos: totalDoos,
          total_bilyet: totalBilyet,
          no_ba_pengemasan: no_ba_pengemasan || null,
          shift_id,
          operator_id: req.user.id,
          tanggal_kemas,
          status,
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
      await tx.kemasPackDetail.createMany({
        data: requestedPacks.map((p) => ({
          hasil_kemas_id: kemas.id,
          pack_detail_id: p.id,
        })),
      });

      // C. Update pack: jika status === 'READY' -> status = 'PACKED'; jika 'SIAP_KEMAS' -> tetap 'SORTED'
      await tx.packDetail.updateMany({
        where: { id: { in: requestedPacks.map((p) => p.id) } },
        data: {
          status: status === 'READY' ? 'PACKED' : 'SORTED',
          hasil_kemas_id: kemas.id,
          no_doos_range: `Doos ${no_doos_awal}-${no_doos_akhir}`,
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
        proses_sortir_id: createdKemas.proses_sortir_id,
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

    const statusLabel = status === 'READY' ? 'selesai dikemas (READY)' : 'didaftarkan siap kemas (SIAP_KEMAS)';
    return successResponse(res, {
      status: 201,
      message: `Hasil pengemasan doos berhasil ${statusLabel} (sesi sortir #${sesi.id}, ${totalPack} pack = ${totalDoos} doos [Doos ${no_doos_awal}-${no_doos_akhir}]).`,
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
 * Mendukung filter: batch_id, shift_id, denominasi_id, tahun_anggaran, no_ba_pengemasan,
 * tanggal_kemas (tunggal), tanggal_dari & tanggal_sampai (rentang), status, search (nomor batch / seri)
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
      tanggal_dari,
      tanggal_sampai,
      status,
      search,
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
    } else if (tanggal_dari || tanggal_sampai) {
      where.tanggal_kemas = {};
      if (tanggal_dari) {
        where.tanggal_kemas.gte = new Date(`${tanggal_dari}T00:00:00.000Z`);
      }
      if (tanggal_sampai) {
        where.tanggal_kemas.lte = new Date(`${tanggal_sampai}T00:00:00.000Z`);
      }
    }

    if (search) {
      where.batch = {
        OR: [
          { nomor_batch: { contains: search.trim(), mode: 'insensitive' } },
          { seri: { contains: search.trim(), mode: 'insensitive' } },
        ],
      };
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
        hasil_kemas_id: null,
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
        denominasi: batch.emisi.denominasi.nama,
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
 * Konfirmasi selesai pengemasan fisik doos (Penyelesaian Fisik Antar-Shift)
 * Mengubah status hasil kemas dari SIAP_KEMAS menjadi READY
 * Mendukung pembaruan shift_id (shift aktual yang menyelesaikan fisik) dan tanggal_kemas
 * POST /api/kemas/:id/complete
 */
export async function completeKemas(req, res) {
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
        kemas_pack_details: true,
      },
    });

    if (!kemas) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Hasil kemas dengan ID ${kemasId} tidak ditemukan.`,
      });
    }

    if (kemas.status !== 'SIAP_KEMAS') {
      return errorResponse(res, {
        status: 400,
        error: 'InvalidStatusError',
        message: `Hanya hasil kemas dengan status SIAP_KEMAS yang dapat diselesaikan (Status saat ini: ${kemas.status}).`,
      });
    }

    const { shift_id, tanggal_kemas, catatan } = req.body;

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

    const updateData = {
      status: 'READY',
    };
    if (shift_id !== undefined) updateData.shift_id = shift_id;
    if (tanggal_kemas !== undefined) updateData.tanggal_kemas = tanggal_kemas;
    if (catatan !== undefined) updateData.catatan = catatan || null;

    const completedKemas = await prisma.$transaction(async (tx) => {
      // 1. Update HasilKemas
      const updated = await tx.hasilKemas.update({
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

      // 2. Update status seluruh PackDetail menjadi PACKED
      const packIds = kemas.kemas_pack_details.map((kpd) => kpd.pack_detail_id);
      if (packIds.length > 0) {
        await tx.packDetail.updateMany({
          where: { id: { in: packIds } },
          data: { status: 'PACKED' },
        });
      }

      return updated;
    });

    // 3. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'kemas',
      tableName: 'hasil_kemas',
      recordId: kemasId,
      oldValue: {
        status: kemas.status,
        shift_id: kemas.shift_id,
        tanggal_kemas: kemas.tanggal_kemas,
      },
      newValue: {
        status: 'READY',
        shift_id: completedKemas.shift_id,
        tanggal_kemas: completedKemas.tanggal_kemas,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Hasil kemas ID ${kemasId} (Doos ${kemas.no_doos_awal}-${kemas.no_doos_akhir}) berhasil diselesaikan. Status kemasan berubah menjadi READY (${kemas.total_pack} pack berstatus PACKED).`,
      data: completedKemas,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menyelesaikan pengemasan fisik doos.',
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
        denominasi: kemas.denominasi?.nama,
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
 * Memetakan satu sesi sortir (beserta relasi pack) menjadi bentuk siap kemas.
 * Dipakai bersama oleh GET /api/kemas/sesi-siap-kemas dan GET /api/kemas/summary.
 */
function mapSesiSiapKemas(sesi) {
  const packs = (sesi.sortir_pack_details || [])
    .map((d) => d.pack_detail)
    .filter(Boolean)
    .sort((a, b) => a.nomor_pack - b.nomor_pack);

  const availablePacks = packs.filter((p) => p.status === 'SORTED' && p.hasil_kemas_id === null);
  const isFullyAvailable = packs.length > 0 && availablePacks.length === packs.length;
  // Sesi dengan total pack bukan kelipatan 4 tidak dapat dikemas (rasio 4 Pack = 9 Doos).
  // Hitung doos hanya bila memenuhi syarat, agar sesi ganjil tidak melempar error.
  const isKelipatan = packs.length > 0 && packs.length % 4 === 0;
  const totalDoos = isKelipatan ? (packs.length / 4) * 9 : 0;

  return {
    id: sesi.id,
    tanggal_sortir: sesi.tanggal_sortir,
    status: sesi.status,
    catatan: sesi.catatan,
    shift: sesi.shift,
    operator: sesi.operator,
    penyortir_1: sesi.penyortir_1,
    penyortir_2: sesi.penyortir_2,
    batch: sesi.batch
      ? {
          id: sesi.batch.id,
          nomor_batch: sesi.batch.nomor_batch,
          seri: sesi.batch.seri,
          kepala: sesi.batch.kepala,
          tahun_anggaran: sesi.batch.tahun_anggaran,
          emisi: sesi.batch.emisi,
        }
      : null,
    total_pack: packs.length,
    total_available: availablePacks.length,
    total_doos: totalDoos,
    is_fully_available: isFullyAvailable,
    is_kelipatan_empat: isKelipatan,
    pack_numbers: packs.map((p) => p.nomor_pack),
    packs: packs.map((p) => ({
      id: p.id,
      nomor_pack: p.nomor_pack,
      status: p.status,
      hasil_kemas_id: p.hasil_kemas_id,
      no_doos_range: p.no_doos_range,
      bon_masuk: p.bon_masuk,
    })),
  };
}

/**
 * Membangun klausa WHERE sesi sortir berdasarkan filter bar.
 */
function buildSesiWhere({ search, tanggal_dari, tanggal_sampai, shift_id } = {}) {
  const where = { status: 'COMPLETED' };

  if (shift_id) where.shift_id = parseInt(shift_id, 10);

  if (tanggal_dari || tanggal_sampai) {
    where.tanggal_sortir = {};
    if (tanggal_dari) where.tanggal_sortir.gte = new Date(`${tanggal_dari}T00:00:00.000Z`);
    if (tanggal_sampai) where.tanggal_sortir.lte = new Date(`${tanggal_sampai}T00:00:00.000Z`);
  }

  if (search) {
    const term = search.trim();
    where.batch = {
      OR: [
        { nomor_batch: { contains: term, mode: 'insensitive' } },
        { seri: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  return where;
}

const SESI_SIAP_KEMAS_INCLUDE = {
  batch: {
    include: {
      emisi: {
        include: { denominasi: true },
      },
    },
  },
  shift: true,
  operator: { select: USER_SAFE_SELECT },
  sortir_pack_details: {
    include: {
      pack_detail: {
        include: {
          bon_masuk: {
            select: { no_segel: true, tanggal_masuk: true, jam_masuk: true },
          },
        },
      },
    },
  },
};

/**
 * Mengambil daftar sesi sortir yang siap dikemas (seluruh pack-nya berstatus SORTED
 * dan belum dibooking ke hasil kemas manapun).
 * Endpoint ini menjadi sumber data grid 10x10 pada modal form pengemasan.
 * Filter: search (nomor batch / seri), tanggal_dari & tanggal_sampai, shift_id
 * GET /api/kemas/sesi-siap-kemas
 */
export async function getSesiSiapKemas(req, res) {
  try {
    const { search, tanggal_dari, tanggal_sampai, shift_id, page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const where = buildSesiWhere({ search, tanggal_dari, tanggal_sampai, shift_id });

    const [total, items] = await Promise.all([
      prisma.prosesSortir.count({ where }),
      prisma.prosesSortir.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ tanggal_sortir: 'desc' }, { id: 'desc' }],
        include: SESI_SIAP_KEMAS_INCLUDE,
      }),
    ]);

    // Sesi yang siap dikemas: seluruh pack tersedia & total pack kelipatan 4
    const sesiSiapKemas = items
      .map(mapSesiSiapKemas)
      .filter((sesi) => sesi.is_fully_available && sesi.is_kelipatan_empat);

    return successResponse(res, {
      status: 200,
      message: `Ditemukan ${sesiSiapKemas.length} sesi sortir siap dikemas.`,
      data: sesiSiapKemas,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar sesi sortir siap dikemas.',
      error: err.message,
    });
  }
}

/**
 * Ringkasan KPI pengemasan doos yang mengikuti filter bar (rentang tanggal, shift, pencarian batch/seri).
 * - siap_kemas  : antrian WIP (status SIAP_KEMAS)
 * - hasil_kemas : output fisik selesai (status READY / SHIPPED)
 * GET /api/kemas/summary
 */
export async function getKemasSummary(req, res) {
  try {
    const { shift_id, tanggal_dari, tanggal_sampai, tanggal_kemas, search } = req.query;

    const where = {};

    if (shift_id) where.shift_id = parseInt(shift_id, 10);

    if (tanggal_kemas) {
      where.tanggal_kemas = new Date(`${tanggal_kemas}T00:00:00.000Z`);
    } else if (tanggal_dari || tanggal_sampai) {
      where.tanggal_kemas = {};
      if (tanggal_dari) where.tanggal_kemas.gte = new Date(`${tanggal_dari}T00:00:00.000Z`);
      if (tanggal_sampai) where.tanggal_kemas.lte = new Date(`${tanggal_sampai}T00:00:00.000Z`);
    }

    if (search) {
      const term = search.trim();
      where.batch = {
        OR: [
          { nomor_batch: { contains: term, mode: 'insensitive' } },
          { seri: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    // Antrian "Siap Kemas" = sesi sortir yang seluruh pack-nya SORTED & belum dibooking,
    // bukan record hasil_kemas berstatus SIAP_KEMAS (record dibuat setelah doos dicatat).
    const sesiWhere = buildSesiWhere({ search, tanggal_dari, tanggal_sampai, shift_id });

    const [records, sesiItems] = await Promise.all([
      prisma.hasilKemas.findMany({
        where,
        select: { status: true, total_pack: true, total_doos: true, total_bilyet: true },
      }),
      prisma.prosesSortir.findMany({
        where: sesiWhere,
        include: SESI_SIAP_KEMAS_INCLUDE,
      }),
    ]);

    const antrianSesi = sesiItems
      .map(mapSesiSiapKemas)
      .filter((sesi) => sesi.is_fully_available && sesi.is_kelipatan_empat);

    const aggregate = (filterStatuses) => {
      const subset = records.filter((r) => filterStatuses.includes(r.status));
      return {
        total_kemas: subset.length,
        total_pack: subset.reduce((sum, r) => sum + r.total_pack, 0),
        total_doos: subset.reduce((sum, r) => sum + r.total_doos, 0),
        total_bilyet: subset.reduce((sum, r) => sum + BigInt(r.total_bilyet), 0n).toString(),
      };
    };

    const siapKemas = {
      total_kemas: antrianSesi.length,
      total_pack: antrianSesi.reduce((sum, s) => sum + s.total_pack, 0),
      total_doos: antrianSesi.reduce((sum, s) => sum + s.total_doos, 0),
      total_bilyet: (BigInt(antrianSesi.reduce((sum, s) => sum + s.total_pack, 0)) * 45000n).toString(),
    };

    return successResponse(res, {
      status: 200,
      message: 'Ringkasan pengemasan doos berhasil diambil.',
      data: {
        siap_kemas: siapKemas,
        hasil_kemas: aggregate(['READY', 'SHIPPED']),
        total_semua: aggregate(['SIAP_KEMAS', 'READY', 'SHIPPED']),
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil ringkasan pengemasan doos.',
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

    // Pisahkan output fisik jadi (READY / SHIPPED) vs antrian siap kemas (SIAP_KEMAS)
    let totalKemasReady = 0;
    let totalPackReady = 0;
    let totalDoosReady = 0;
    let totalBilyetReady = 0n;

    let totalKemasSiapKemas = 0;
    let totalPackSiapKemas = 0;
    let totalDoosSiapKemas = 0;
    let totalBilyetSiapKemas = 0n;

    const perDenominasi = {};

    for (const k of kemasRecords) {
      totalPack += k.total_pack;
      totalDoos += k.total_doos;
      totalBilyet += BigInt(k.total_bilyet);

      if (k.status === 'READY' || k.status === 'SHIPPED') {
        totalKemasReady += 1;
        totalPackReady += k.total_pack;
        totalDoosReady += k.total_doos;
        totalBilyetReady += BigInt(k.total_bilyet);
      } else if (k.status === 'SIAP_KEMAS') {
        totalKemasSiapKemas += 1;
        totalPackSiapKemas += k.total_pack;
        totalDoosSiapKemas += k.total_doos;
        totalBilyetSiapKemas += BigInt(k.total_bilyet);
      }

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
          total_pack_ready: 0,
          total_doos_ready: 0,
          total_bilyet_ready: 0n,
          total_pack_siap_kemas: 0,
          total_doos_siap_kemas: 0,
          total_bilyet_siap_kemas: 0n,
        };
      }

      perDenominasi[denomName].total_kemas += 1;
      perDenominasi[denomName].total_pack += k.total_pack;
      perDenominasi[denomName].total_doos += k.total_doos;
      perDenominasi[denomName].total_bilyet += BigInt(k.total_bilyet);

      if (k.status === 'READY' || k.status === 'SHIPPED') {
        perDenominasi[denomName].total_pack_ready += k.total_pack;
        perDenominasi[denomName].total_doos_ready += k.total_doos;
        perDenominasi[denomName].total_bilyet_ready += BigInt(k.total_bilyet);
      } else if (k.status === 'SIAP_KEMAS') {
        perDenominasi[denomName].total_pack_siap_kemas += k.total_pack;
        perDenominasi[denomName].total_doos_siap_kemas += k.total_doos;
        perDenominasi[denomName].total_bilyet_siap_kemas += BigInt(k.total_bilyet);
      }
    }

    const rincianDenominasi = Object.values(perDenominasi).map((item) => ({
      ...item,
      total_bilyet: item.total_bilyet.toString(),
      total_bilyet_ready: item.total_bilyet_ready.toString(),
      total_bilyet_siap_kemas: item.total_bilyet_siap_kemas.toString(),
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
        output_selesai: {
          total_kemas: totalKemasReady,
          total_pack: totalPackReady,
          total_doos: totalDoosReady,
          total_bilyet: totalBilyetReady.toString(),
        },
        antrian_wip: {
          total_kemas: totalKemasSiapKemas,
          total_pack: totalPackSiapKemas,
          total_doos: totalDoosSiapKemas,
          total_bilyet: totalBilyetSiapKemas.toString(),
        },
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
