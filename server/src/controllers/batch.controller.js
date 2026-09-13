import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Mengambil daftar batch / order produksi
 * Mendukung filter query: tahun_anggaran, nomor_batch, status, emisi_id
 * GET /api/batches
 */
export async function getAllBatches(req, res) {
  try {
    const { tahun_anggaran, nomor_batch, status, emisi_id } = req.query;
    const where = {};

    if (tahun_anggaran) {
      where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    }
    if (nomor_batch) {
      where.nomor_batch = { contains: nomor_batch, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (emisi_id) {
      where.emisi_id = parseInt(emisi_id, 10);
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        emisi: {
          include: {
            denominasi: true,
          },
        },
        bon_masuk: {
          select: {
            id: true,
            no_segel: true,
            tanggal_masuk: true,
            pack_dari: true,
            pack_sampai: true,
            jumlah_bilyet: true,
          },
          orderBy: { tanggal_masuk: 'asc' },
        },
        packs: {
          select: {
            id: true,
            nomor_pack: true,
            status: true,
          },
        },
      },
      orderBy: [
        { tahun_anggaran: 'desc' },
        { id: 'desc' },
      ],
    });

    // Hitung ringkasan status pack per batch
    const formattedBatches = batches.map((batch) => {
      const totalPacks = batch.jumlah_pack || 100;
      const receivedPacks = batch.packs.filter((p) => p.status !== 'PENDING').length;
      const sortedPacks = batch.packs.filter((p) => ['SORTED', 'PACKED', 'SHIPPED'].includes(p.status)).length;
      const packedPacks = batch.packs.filter((p) => ['PACKED', 'SHIPPED'].includes(p.status)).length;
      const shippedPacks = batch.packs.filter((p) => p.status === 'SHIPPED').length;

      // Hapus raw packs list dari response ringkasan agar payload tetap ringan
      const { packs, ...batchData } = batch;

      return {
        ...batchData,
        summary: {
          total_pack: totalPacks,
          received_pack: receivedPacks,
          sorted_pack: sortedPacks,
          packed_pack: packedPacks,
          shipped_pack: shippedPacks,
          persentase_diterima: Math.round((receivedPacks / totalPacks) * 100),
        },
      };
    });

    return successResponse(res, {
      message: 'Daftar batch berhasil diambil.',
      data: formattedBatches,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil daftar batch.',
      error: err.message,
    });
  }
}

/**
 * Mengambil detail batch lengkap beserta status 100 pack
 * Digunakan untuk visualisasi matriks 100 pack
 * GET /api/batches/:id
 */
export async function getBatchById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Batch tidak valid.' });
    }

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        emisi: {
          include: {
            denominasi: true,
          },
        },
        bon_masuk: {
          include: {
            shift: true,
            operator: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        packs: {
          orderBy: { nomor_pack: 'asc' },
        },
      },
    });

    if (!batch) {
      return errorResponse(res, { status: 404, message: 'Batch tidak ditemukan.' });
    }

    const totalPacks = batch.jumlah_pack || 100;
    const receivedCount = batch.packs.filter((p) => p.status !== 'PENDING').length;

    const summary = {
      total_pack: totalPacks,
      received_pack: receivedCount,
      remaining_pack: totalPacks - receivedCount,
      is_complete: receivedCount === totalPacks,
    };

    return successResponse(res, {
      message: 'Detail batch berhasil diambil.',
      data: {
        ...batch,
        summary,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil detail batch.',
      error: err.message,
    });
  }
}

/**
 * Membuat batch baru secara mandiri
 * Auto-generate 100 record pack_detail (status: PENDING)
 * POST /api/batches
 */
export async function createBatch(req, res) {
  try {
    const { nomor_batch, tahun_anggaran, seri, kepala, emisi_id } = req.body;

    // Pastikan emisi exists
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

    // Cek keunikan nomor_batch + tahun_anggaran
    const existing = await prisma.batch.findUnique({
      where: {
        nomor_batch_tahun_anggaran: {
          nomor_batch,
          tahun_anggaran,
        },
      },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Batch "${nomor_batch}" pada tahun anggaran ${tahun_anggaran} sudah terdaftar.`,
      });
    }

    // Eksekusi pembuatan batch dan 100 pack_detail dalam 1 database transaction
    const result = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          nomor_batch,
          tahun_anggaran,
          seri,
          kepala,
          emisi_id,
          jumlah_pack: 100,
          status: 'pending',
        },
        include: {
          emisi: {
            include: { denominasi: true },
          },
        },
      });

      // Siapkan 100 pack bernomor 1 s/d 100
      const packDetailsData = Array.from({ length: 100 }, (_, index) => ({
        batch_id: newBatch.id,
        nomor_pack: index + 1,
        jumlah_brood: 45,
        jumlah_bilyet: 45000n,
        status: 'PENDING',
      }));

      await tx.packDetail.createMany({
        data: packDetailsData,
      });

      return newBatch;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'bon_masuk',
      tableName: 'batch',
      recordId: result.id,
      newValue: result,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: `Batch ${result.nomor_batch} berhasil didaftarkan lengkap dengan 100 pack.`,
      data: result,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal membuat batch baru.',
      error: err.message,
    });
  }
}
