import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { packToBilyet } from '../utils/converter.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

/**
 * Mencatat penerimaan bon masuk baru dari Khazai
 * POST /api/bon-masuk
 */
export async function createBonMasuk(req, res) {
  try {
    const {
      tahun_anggaran,
      no_segel,
      tanggal_masuk,
      jam_masuk,
      nomor_batch,
      seri,
      kepala,
      emisi_id,
      pack_dari,
      pack_sampai,
      jenis_mesin_sortir,
      kategori_penerimaan = 'MASINAL',
      shift_id,
      catatan,
    } = req.body;

    // 1. Cek keunikan no_segel
    const existingSegel = await prisma.bonMasuk.findUnique({
      where: { no_segel },
    });

    if (existingSegel) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Nomor segel "${no_segel}" sudah pernah dicatat dalam sistem.`,
      });
    }

    // 2. Verifikasi Shift
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

    // 3. Cek atau Buat Batch
    let batch = await prisma.batch.findUnique({
      where: {
        nomor_batch_tahun_anggaran: {
          nomor_batch,
          tahun_anggaran,
        },
      },
      include: {
        emisi: {
          include: { denominasi: true },
        },
      },
    });

    if (!batch) {
      // Jika batch belum ada, metadata seri, kepala, dan emisi_id wajib ada
      if (!seri || !kepala || !emisi_id) {
        return errorResponse(res, {
          status: 400,
          error: 'BadRequest',
          message:
            'Batch belum terdaftar. Metadata batch (seri, kepala, dan emisi_id) wajib diisi untuk registrasi batch baru.',
        });
      }

      const emisi = await prisma.emisi.findUnique({
        where: { id: emisi_id },
        include: { denominasi: true },
      });

      if (!emisi) {
        return errorResponse(res, {
          status: 404,
          error: 'NotFound',
          message: `Emisi dengan ID ${emisi_id} tidak ditemukan.`,
        });
      }
    }

    // 4. Periksa apakah ada nomor pack yang sudah diterima (overlap validation)
    if (batch) {
      const conflictingPacks = await prisma.packDetail.findMany({
        where: {
          batch_id: batch.id,
          nomor_pack: {
            gte: pack_dari,
            lte: pack_sampai,
          },
          status: {
            not: 'PENDING',
          },
        },
        select: {
          nomor_pack: true,
          status: true,
        },
      });

      if (conflictingPacks.length > 0) {
        const packList = conflictingPacks.map((p) => `#${p.nomor_pack}`).join(', ');
        return errorResponse(res, {
          status: 400,
          error: 'PackOverlapError',
          message: `Gagal mencatat bon masuk: Pack ${packList} pada batch ${nomor_batch} sudah pernah diterima sebelumnya.`,
        });
      }
    }

    // 5. Kalkulasi Volume Lembar Bilyet
    const totalPack = pack_sampai - pack_dari + 1;
    const jumlah_bilyet = packToBilyet(totalPack, true);

    // 6. Eksekusi database transaction untuk menjaga konsistensi
    const createdBonMasuk = await prisma.$transaction(async (tx) => {
      let targetBatchId;

      if (!batch) {
        // Buat batch baru
        const newBatch = await tx.batch.create({
          data: {
            nomor_batch,
            tahun_anggaran,
            seri,
            kepala,
            emisi_id,
            jumlah_pack: 100,
            status: 'in_progress',
          },
        });
        targetBatchId = newBatch.id;

        // Inisialisasi 100 pack
        const packDetailsData = Array.from({ length: 100 }, (_, i) => ({
          batch_id: newBatch.id,
          nomor_pack: i + 1,
          jumlah_brood: 45,
          jumlah_bilyet: 45000n,
          status: 'PENDING',
        }));

        await tx.packDetail.createMany({
          data: packDetailsData,
        });
      } else {
        targetBatchId = batch.id;
        // Pastikan status batch aktif
        if (batch.status === 'pending') {
          await tx.batch.update({
            where: { id: batch.id },
            data: { status: 'in_progress' },
          });
        }
      }

      // Buat record Bon Masuk
      const bon = await tx.bonMasuk.create({
        data: {
          no_segel,
          batch_id: targetBatchId,
          tanggal_masuk,
          jam_masuk,
          pack_dari,
          pack_sampai,
          jumlah_bilyet,
          jenis_mesin_sortir: jenis_mesin_sortir || null,
          kategori_penerimaan,
          shift_id,
          operator_id: req.user.id,
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

      // Update pack_detail dalam rentang pack_dari s/d pack_sampai
      await tx.packDetail.updateMany({
        where: {
          batch_id: targetBatchId,
          nomor_pack: {
            gte: pack_dari,
            lte: pack_sampai,
          },
        },
        data: {
          status: 'RECEIVED',
          bon_masuk_id: bon.id,
        },
      });

      return bon;
    });

    // 7. Audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'bon_masuk',
      tableName: 'bon_masuk',
      recordId: createdBonMasuk.id,
      newValue: {
        id: createdBonMasuk.id,
        no_segel: createdBonMasuk.no_segel,
        batch_id: createdBonMasuk.batch_id,
        pack_dari: createdBonMasuk.pack_dari,
        pack_sampai: createdBonMasuk.pack_sampai,
        jumlah_bilyet: createdBonMasuk.jumlah_bilyet.toString(),
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: `Bon masuk dengan nomor segel "${no_segel}" berhasil dicatat (${totalPack} pack diterima).`,
      data: createdBonMasuk,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mencatat bon masuk.',
      error: err.message,
    });
  }
}

/**
 * Mengambil daftar seluruh bon masuk
 * Mendukung filter: tahun_anggaran, no_segel, tanggal_masuk, batch_id, shift_id
 * Mendukung pagination: page, limit
 * GET /api/bon-masuk
 */
export async function getAllBonMasuk(req, res) {
  try {
    const {
      tahun_anggaran,
      no_segel,
      tanggal_masuk,
      batch_id,
      shift_id,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const where = {};

    if (no_segel) {
      where.no_segel = { contains: no_segel, mode: 'insensitive' };
    }
    if (tanggal_masuk) {
      where.tanggal_masuk = new Date(`${tanggal_masuk}T00:00:00.000Z`);
    }
    if (batch_id) {
      where.batch_id = parseInt(batch_id, 10);
    }
    if (shift_id) {
      where.shift_id = parseInt(shift_id, 10);
    }
    if (tahun_anggaran) {
      where.batch = {
        tahun_anggaran: parseInt(tahun_anggaran, 10),
      };
    }

    const [total, data] = await Promise.all([
      prisma.bonMasuk.count({ where }),
      prisma.bonMasuk.findMany({
        where,
        skip,
        take: pageSize,
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
        orderBy: [
          { tanggal_masuk: 'desc' },
          { id: 'desc' },
        ],
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return successResponse(res, {
      message: 'Daftar bon masuk berhasil diambil.',
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
      message: 'Gagal mengambil daftar bon masuk.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail bon masuk berdasarkan ID
 * GET /api/bon-masuk/:id
 */
export async function getBonMasukById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Bon Masuk tidak valid.' });
    }

    const bonMasuk = await prisma.bonMasuk.findUnique({
      where: { id },
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
        packs: {
          orderBy: { nomor_pack: 'asc' },
        },
      },
    });

    if (!bonMasuk) {
      return errorResponse(res, { status: 404, message: 'Bon masuk tidak ditemukan.' });
    }

    return successResponse(res, {
      message: 'Detail bon masuk berhasil diambil.',
      data: bonMasuk,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail bon masuk.',
      error: err.message,
    });
  }
}

/**
 * Membatalkan / menghapus bon masuk
 * Mengembalikan status pack_detail terkait ke PENDING
 * Khusus role SUPERVISOR
 * DELETE /api/bon-masuk/:id
 */
export async function deleteBonMasuk(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Bon Masuk tidak valid.' });
    }

    const bonMasuk = await prisma.bonMasuk.findUnique({
      where: { id },
      include: {
        packs: true,
      },
    });

    if (!bonMasuk) {
      return errorResponse(res, { status: 404, message: 'Bon masuk tidak ditemukan.' });
    }

    // Periksa apakah ada pack yang sudah disortir atau dikemas
    const alreadyProcessed = bonMasuk.packs.some((p) =>
      ['SORTED', 'PACKED', 'SHIPPED'].includes(p.status)
    );

    if (alreadyProcessed) {
      return errorResponse(res, {
        status: 400,
        error: 'CannotCancelProcessedBon',
        message:
          'Bon masuk tidak dapat dibatalkan karena beberapa pack telah diproses ke tahap sortir atau kemas.',
      });
    }

    // Revert status pack ke PENDING dan hapus bon masuk dalam 1 transaksi
    await prisma.$transaction(async (tx) => {
      await tx.packDetail.updateMany({
        where: { bon_masuk_id: id },
        data: {
          status: 'PENDING',
          bon_masuk_id: null,
        },
      });

      await tx.bonMasuk.delete({
        where: { id },
      });
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'bon_masuk',
      tableName: 'bon_masuk',
      recordId: id,
      oldValue: {
        no_segel: bonMasuk.no_segel,
        batch_id: bonMasuk.batch_id,
        pack_dari: bonMasuk.pack_dari,
        pack_sampai: bonMasuk.pack_sampai,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Bon masuk dengan no segel "${bonMasuk.no_segel}" berhasil dibatalkan dan status pack telah dikembalikan ke PENDING.`,
      data: { id },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membatalkan bon masuk.',
      error: err.message,
    });
  }
}

/**
 * Mengambil ringkasan penerimaan bon masuk hari ini
 * GET /api/bon-masuk/summary/today
 */
export async function getTodaySummary(req, res) {
  try {
    const queryDate = req.query.tanggal;
    let targetDate;

    if (queryDate) {
      targetDate = new Date(`${queryDate}T00:00:00.000Z`);
    } else {
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      targetDate = new Date(`${dateString}T00:00:00.000Z`);
    }

    const bonList = await prisma.bonMasuk.findMany({
      where: {
        tanggal_masuk: targetDate,
      },
      include: {
        batch: {
          include: {
            emisi: {
              include: {
                denominasi: true,
              },
            },
          },
        },
      },
    });

    let totalBon = bonList.length;
    let totalBilyet = 0n;
    let totalPack = 0;
    const perDenominasi = {};

    for (const bon of bonList) {
      const packsInBon = bon.pack_sampai - bon.pack_dari + 1;
      totalPack += packsInBon;
      totalBilyet += BigInt(bon.jumlah_bilyet);

      const denomName = bon.batch?.emisi?.denominasi?.nama || 'Unknown';
      const denomNilai = bon.batch?.emisi?.denominasi?.nilai || 0;

      if (!perDenominasi[denomName]) {
        perDenominasi[denomName] = {
          nama: denomName,
          nilai: denomNilai,
          total_bon: 0,
          total_pack: 0,
          total_bilyet: 0n,
        };
      }

      perDenominasi[denomName].total_bon += 1;
      perDenominasi[denomName].total_pack += packsInBon;
      perDenominasi[denomName].total_bilyet += BigInt(bon.jumlah_bilyet);
    }

    // Ubah BigInt ke string pada ringkasan pecahan
    const breakdown = Object.values(perDenominasi).map((item) => ({
      ...item,
      total_bilyet: item.total_bilyet.toString(),
    }));

    return successResponse(res, {
      message: 'Ringkasan penerimaan harian berhasil diambil.',
      data: {
        tanggal: targetDate.toISOString().split('T')[0],
        total_bon: totalBon,
        total_pack: totalPack,
        total_bilyet: totalBilyet.toString(),
        breakdown_per_denominasi: breakdown,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil ringkasan harian bon masuk.',
      error: err.message,
    });
  }
}
