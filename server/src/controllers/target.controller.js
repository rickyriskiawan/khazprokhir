import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';

// ==========================================
// A. Target Produksi Tahunan
// ==========================================

/**
 * Menghitung jumlah Doos dengan pembulatan ke atas (ceiling: 1 Doos = 20.000 Bilyet).
 * Sisa bilyet ("buntut") di bawah 20.000 tetap dihitung sebagai 1 Doos.
 */
export function calculateTargetDoos(targetBilyet) {
  const bilyet = BigInt(targetBilyet || 0);
  if (bilyet <= 0n) return 0;
  return Number((bilyet + 19999n) / 20000n);
}

/**
 * Menyusun sandi emisi pecahan (contoh: Y + 2022 -> "Y'22")
 */
function formatSandiEmisi(kodePecahan, tahunEmisi) {
  const twoDigitYear = String(tahunEmisi).slice(-2);
  return `${kodePecahan}'${twoDigitYear}`;
}

/**
 * Mengelompokkan baris TargetTahunan berdasarkan Tahun Anggaran -> Tahun Emisi
 */
function buildGroupedTargetProduksi(rows) {
  const taMap = new Map();

  for (const row of rows) {
    const ta = row.tahun_anggaran;
    const te = row.tahun_emisi;
    const bilyet = BigInt(row.target_bilyet || 0);
    const doos =
      typeof row.target_doos === 'number' && row.target_doos > 0
        ? row.target_doos
        : calculateTargetDoos(bilyet);
    const sandi =
      row.emisi?.sandi || formatSandiEmisi(row.denominasi?.nama || '', te);

    if (!taMap.has(ta)) {
      taMap.set(ta, {
        tahun_anggaran: ta,
        total_bilyet_bigint: 0n,
        total_doos: 0,
        emisiMap: new Map(),
      });
    }

    const taGroup = taMap.get(ta);
    taGroup.total_bilyet_bigint += bilyet;
    taGroup.total_doos += doos;

    if (!taGroup.emisiMap.has(te)) {
      taGroup.emisiMap.set(te, {
        tahun_anggaran: ta,
        tahun_emisi: te,
        kode_emisi: row.emisi?.kode_emisi || `TE ${te}`,
        catatan: row.catatan || null,
        total_bilyet_bigint: 0n,
        total_doos: 0,
        items: [],
      });
    }

    const teGroup = taGroup.emisiMap.get(te);
    if (!teGroup.catatan && row.catatan) {
      teGroup.catatan = row.catatan;
    }
    teGroup.total_bilyet_bigint += bilyet;
    teGroup.total_doos += doos;
    teGroup.items.push({
      id: row.id,
      denominasi_id: row.denominasi_id,
      kode_pecahan: row.denominasi?.nama || '',
      nilai_pecahan: row.denominasi?.nilai || 0,
      sandi,
      target_bilyet: bilyet.toString(),
      target_doos: doos,
    });
  }

  return Array.from(taMap.values())
    .sort((a, b) => b.tahun_anggaran - a.tahun_anggaran)
    .map((taGroup) => ({
      tahun_anggaran: taGroup.tahun_anggaran,
      total_bilyet: taGroup.total_bilyet_bigint.toString(),
      total_doos: taGroup.total_doos,
      emisi_groups: Array.from(taGroup.emisiMap.values())
        .sort((a, b) => b.tahun_emisi - a.tahun_emisi)
        .map((teGroup) => ({
          tahun_anggaran: teGroup.tahun_anggaran,
          tahun_emisi: teGroup.tahun_emisi,
          kode_emisi: teGroup.kode_emisi,
          catatan: teGroup.catatan,
          total_bilyet: teGroup.total_bilyet_bigint.toString(),
          total_doos: teGroup.total_doos,
          items: teGroup.items.sort((a, b) => b.nilai_pecahan - a.nilai_pecahan),
        })),
    }));
}

/**
 * Mengambil daftar target tahunan
 * Filter query: tahun_anggaran, tahun_emisi, denominasi_id
 * GET /api/target-tahunan
 */
export async function getAllTargetTahunan(req, res) {
  try {
    const { tahun_anggaran, tahun_emisi, denominasi_id } = req.query;
    const where = {};

    if (tahun_anggaran) {
      where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    }
    if (tahun_emisi) {
      where.tahun_emisi = parseInt(tahun_emisi, 10);
    }
    if (denominasi_id) {
      where.denominasi_id = parseInt(denominasi_id, 10);
    }

    const rawData = await prisma.targetTahunan.findMany({
      where,
      include: {
        denominasi: true,
        emisi: true,
      },
      orderBy: [
        { tahun_anggaran: 'desc' },
        { tahun_emisi: 'desc' },
        { denominasi: { nilai: 'desc' } },
      ],
    });

    const data = rawData.map((row) => {
      const targetDoos =
        typeof row.target_doos === 'number' && row.target_doos > 0
          ? row.target_doos
          : calculateTargetDoos(row.target_bilyet);
      const sandiEmisi =
        row.emisi?.sandi ||
        formatSandiEmisi(row.denominasi?.nama || '', row.tahun_emisi);
      return {
        ...row,
        target_doos: targetDoos,
        sandi_emisi: sandiEmisi,
      };
    });

    const grouped = buildGroupedTargetProduksi(data);

    return successResponse(res, {
      message: 'Data target tahunan berhasil diambil.',
      data,
      meta: {
        grouped,
      },
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
 * Memastikan record Master Emisi tersedia untuk seluruh denominasi pada tahun_emisi terkait
 */
async function ensureMasterEmisiForYear(tx, denominasiList, tahunEmisi) {
  const tahunStr = String(tahunEmisi);
  const kodeEmisi = `TE ${tahunStr}`;
  const emisiByDenomId = new Map();

  for (const denom of denominasiList) {
    let emisi = await tx.emisi.findFirst({
      where: {
        denominasi_id: denom.id,
        tahun: tahunStr,
      },
    });

    if (!emisi) {
      emisi = await tx.emisi.create({
        data: {
          kode_emisi: kodeEmisi,
          sandi: formatSandiEmisi(denom.nama, tahunEmisi),
          tahun: tahunStr,
          denominasi_id: denom.id,
          is_active: true,
        },
      });
    }
    emisiByDenomId.set(denom.id, emisi);
  }

  return emisiByDenomId;
}

/**
 * Membuat target tahunan baru (mendukung input kolektif 7 pecahan maupun single item)
 * Auto kalkulasi:
 * - target_doos = ceil(target_bilyet / 20000)
 * - target_brood = target_bilyet / 1000
 * - target_pack = target_brood / 45
 * POST /api/target-tahunan
 */
export async function createTargetTahunan(req, res) {
  try {
    // Mode Kolektif Grup (Tahun Anggaran + Tahun Emisi -> 7 Pecahan)
    if (Array.isArray(req.body.items)) {
      const { tahun_anggaran, tahun_emisi, catatan, items } = req.body;

      // Cek apakah pasangan (tahun_anggaran, tahun_emisi) sudah ada
      const existingGroupCount = await prisma.targetTahunan.count({
        where: {
          tahun_anggaran,
          tahun_emisi,
        },
      });

      if (existingGroupCount > 0) {
        return errorResponse(res, {
          status: 409,
          error: 'Conflict',
          message: `Target Produksi untuk Tahun Anggaran ${tahun_anggaran} dan Tahun Emisi ${tahun_emisi} sudah terdaftar. Silakan gunakan menu Edit untuk mengubah kuota.`,
        });
      }

      const bilyetInputMap = new Map();
      for (const item of items) {
        bilyetInputMap.set(Number(item.denominasi_id), BigInt(item.target_bilyet || 0));
      }

      const groupResult = await prisma.$transaction(async (tx) => {
        const allDenominasi = await tx.denominasi.findMany({
          where: { is_active: true },
          orderBy: { nilai: 'desc' },
        });

        const emisiByDenomId = await ensureMasterEmisiForYear(
          tx,
          allDenominasi,
          tahun_emisi
        );

        const createdRows = [];
        for (const denom of allDenominasi) {
          const bilyetBigInt = bilyetInputMap.get(denom.id) ?? 0n;
          const target_doos = calculateTargetDoos(bilyetBigInt);
          const target_brood = bilyetBigInt / 1000n;
          const target_pack = Number(target_brood / 45n);
          const emisi = emisiByDenomId.get(denom.id);

          const row = await tx.targetTahunan.create({
            data: {
              tahun_anggaran,
              tahun_emisi,
              emisi_id: emisi.id,
              denominasi_id: denom.id,
              target_bilyet: bilyetBigInt,
              target_doos,
              target_brood,
              target_pack,
              catatan: catatan || null,
            },
            include: {
              denominasi: true,
              emisi: true,
            },
          });

          createdRows.push(row);
        }

        const grouped = buildGroupedTargetProduksi(createdRows);
        return grouped[0]?.emisi_groups?.[0] || null;
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        module: 'target',
        tableName: 'target_tahunan',
        recordId: groupResult?.items?.[0]?.id || null,
        newValue: groupResult,
        ipAddress: req.ip,
      });

      return successResponse(res, {
        status: 201,
        message: `Target Produksi Tahun Anggaran ${tahun_anggaran} (TE ${tahun_emisi}) berhasil dibuat.`,
        data: groupResult,
      });
    }

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

    const tahunEmisi = req.body.tahun_emisi ? parseInt(req.body.tahun_emisi, 10) : 2022;

    // Cek keunikan target tahunan (tahun_anggaran + tahun_emisi + denominasi_id)
    const existing = await prisma.targetTahunan.findUnique({
      where: {
        tahun_anggaran_tahun_emisi_denominasi_id: {
          tahun_anggaran,
          tahun_emisi: tahunEmisi,
          denominasi_id,
        },
      },
    });

    if (existing) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Target tahunan untuk denominasi ${denominasi.nama} pada tahun anggaran ${tahun_anggaran} dan tahun emisi ${tahunEmisi} sudah terdaftar.`,
      });
    }

    // Kalkulasi otomatis rasio hierarki bilyet -> doos (ceiling), brood, pack
    const bilyetBigInt = BigInt(target_bilyet);
    const target_doos = calculateTargetDoos(bilyetBigInt);
    const target_brood = bilyetBigInt / 1000n;
    const target_pack = Number(target_brood / 45n);

    const created = await prisma.targetTahunan.create({
      data: {
        tahun_anggaran,
        tahun_emisi: tahunEmisi,
        denominasi_id,
        target_bilyet: bilyetBigInt,
        target_doos,
        target_brood,
        target_pack,
        catatan: catatan || null,
      },
      include: { denominasi: true, emisi: true },
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
      const target_doos = calculateTargetDoos(bilyetBigInt);
      const target_brood = bilyetBigInt / 1000n;
      const target_pack = Number(target_brood / 45n);

      updateData.target_bilyet = bilyetBigInt;
      updateData.target_doos = target_doos;
      updateData.target_brood = target_brood;
      updateData.target_pack = target_pack;
    }

    const updated = await prisma.targetTahunan.update({
      where: { id },
      data: updateData,
      include: { denominasi: true, emisi: true },
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
 * Memperbarui grup target tahunan secara kolektif (7 pecahan) berdasarkan tahun_anggaran & tahun_emisi
 * PUT /api/target-tahunan/group/:tahun_anggaran/:tahun_emisi
 */
export async function updateTargetTahunanGroup(req, res) {
  try {
    const tahunAnggaran = parseInt(req.params.tahun_anggaran, 10);
    const tahunEmisi = parseInt(req.params.tahun_emisi, 10);

    if (isNaN(tahunAnggaran) || isNaN(tahunEmisi)) {
      return errorResponse(res, {
        status: 400,
        message: 'Parameter Tahun Anggaran atau Tahun Emisi tidak valid.',
      });
    }

    const existingRows = await prisma.targetTahunan.findMany({
      where: {
        tahun_anggaran: tahunAnggaran,
        tahun_emisi: tahunEmisi,
      },
      include: { denominasi: true, emisi: true },
    });

    if (existingRows.length === 0) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Target Produksi untuk Tahun Anggaran ${tahunAnggaran} dan Tahun Emisi ${tahunEmisi} tidak ditemukan.`,
      });
    }

    const { catatan, items } = req.body;
    const bilyetInputMap = new Map();
    for (const item of items || []) {
      bilyetInputMap.set(Number(item.denominasi_id), BigInt(item.target_bilyet || 0));
    }

    const updatedGroup = await prisma.$transaction(async (tx) => {
      const allDenominasi = await tx.denominasi.findMany({
        where: { is_active: true },
        orderBy: { nilai: 'desc' },
      });

      const emisiByDenomId = await ensureMasterEmisiForYear(
        tx,
        allDenominasi,
        tahunEmisi
      );

      const updatedRows = [];
      for (const denom of allDenominasi) {
        const bilyetBigInt = bilyetInputMap.get(denom.id) ?? 0n;
        const target_doos = calculateTargetDoos(bilyetBigInt);
        const target_brood = bilyetBigInt / 1000n;
        const target_pack = Number(target_brood / 45n);
        const emisi = emisiByDenomId.get(denom.id);

        const row = await tx.targetTahunan.upsert({
          where: {
            tahun_anggaran_tahun_emisi_denominasi_id: {
              tahun_anggaran: tahunAnggaran,
              tahun_emisi: tahunEmisi,
              denominasi_id: denom.id,
            },
          },
          update: {
            emisi_id: emisi.id,
            target_bilyet: bilyetBigInt,
            target_doos,
            target_brood,
            target_pack,
            ...(catatan !== undefined ? { catatan: catatan || null } : {}),
          },
          create: {
            tahun_anggaran: tahunAnggaran,
            tahun_emisi: tahunEmisi,
            emisi_id: emisi.id,
            denominasi_id: denom.id,
            target_bilyet: bilyetBigInt,
            target_doos,
            target_brood,
            target_pack,
            catatan: catatan || null,
          },
          include: { denominasi: true, emisi: true },
        });

        updatedRows.push(row);
      }

      const grouped = buildGroupedTargetProduksi(updatedRows);
      return grouped[0]?.emisi_groups?.[0] || null;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'target',
      tableName: 'target_tahunan',
      recordId: existingRows[0]?.id || null,
      oldValue: buildGroupedTargetProduksi(existingRows)[0]?.emisi_groups?.[0] || null,
      newValue: updatedGroup,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Target Produksi Tahun Anggaran ${tahunAnggaran} (TE ${tahunEmisi}) berhasil diperbarui.`,
      data: updatedGroup,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui grup target tahunan.',
      error: err.message,
    });
  }
}

/**
 * Menghapus grup target tahunan secara kolektif berdasarkan tahun_anggaran & tahun_emisi
 * Dilengkapi Safety Lock: menolak hapus jika sudah ada Batch produksi pada TA & TE tersebut
 * DELETE /api/target-tahunan/group/:tahun_anggaran/:tahun_emisi
 */
export async function deleteTargetTahunanGroup(req, res) {
  try {
    const tahunAnggaran = parseInt(req.params.tahun_anggaran, 10);
    const tahunEmisi = parseInt(req.params.tahun_emisi, 10);

    if (isNaN(tahunAnggaran) || isNaN(tahunEmisi)) {
      return errorResponse(res, {
        status: 400,
        message: 'Parameter Tahun Anggaran atau Tahun Emisi tidak valid.',
      });
    }

    const existingRows = await prisma.targetTahunan.findMany({
      where: {
        tahun_anggaran: tahunAnggaran,
        tahun_emisi: tahunEmisi,
      },
      include: { denominasi: true, emisi: true },
    });

    if (existingRows.length === 0) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Target Produksi untuk Tahun Anggaran ${tahunAnggaran} dan Tahun Emisi ${tahunEmisi} tidak ditemukan.`,
      });
    }

    // Safety Lock: Periksa apakah sudah ada Batch produksi pada Tahun Anggaran & Tahun Emisi ini
    const activeBatchCount = await prisma.batch.count({
      where: {
        tahun_anggaran: tahunAnggaran,
        emisi: {
          tahun: String(tahunEmisi),
        },
      },
    });

    if (activeBatchCount > 0) {
      return errorResponse(res, {
        status: 409,
        error: 'SafetyLockConflict',
        message: `Target Produksi TA ${tahunAnggaran} (TE ${tahunEmisi}) tidak dapat dihapus karena sudah digunakan oleh ${activeBatchCount} Batch produksi aktif.`,
      });
    }

    const deleted = await prisma.targetTahunan.deleteMany({
      where: {
        tahun_anggaran: tahunAnggaran,
        tahun_emisi: tahunEmisi,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'target',
      tableName: 'target_tahunan',
      recordId: existingRows[0]?.id || null,
      oldValue: buildGroupedTargetProduksi(existingRows)[0]?.emisi_groups?.[0] || null,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Target Produksi Tahun Anggaran ${tahunAnggaran} (TE ${tahunEmisi}) berhasil dihapus.`,
      data: {
        tahun_anggaran: tahunAnggaran,
        tahun_emisi: tahunEmisi,
        deleted_count: deleted.count,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal menghapus grup target tahunan.',
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

