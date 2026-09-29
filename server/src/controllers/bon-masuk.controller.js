import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { packToBilyet } from '../utils/converter.js';
import { parsePackRange } from '../utils/packParser.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

/**
 * Mencatat penerimaan bon masuk baru dari Khazai (Multi-Batch & Non-Contiguous Pack)
 * POST /api/bon-masuk
 */
export async function createBonMasuk(req, res) {
  try {
    const {
      tahun_anggaran = 2026,
      no_bon,
      no_segel,
      tanggal_masuk,
      jam_masuk,
      jenis_mesin_sortir,
      kategori_penerimaan = 'MASINAL',
      shift_id,
      petugas_khazai,
      petugas_khazprokhir,
      catatan,
      items: rawItems,
      // Field legacy (kompatibilitas mundur)
      nomor_batch,
      seri,
      kepala,
      emisi_id,
      pack_dari,
      pack_sampai,
    } = req.body;

    // 1. Cek keunikan no_segel per tahun_anggaran
    const existingSegel = await prisma.bonMasuk.findUnique({
      where: {
        no_segel_tahun_anggaran: {
          no_segel,
          tahun_anggaran,
        },
      },
    });

    if (existingSegel) {
      return errorResponse(res, {
        status: 409,
        error: 'Conflict',
        message: `Nomor segel "${no_segel}" untuk tahun anggaran ${tahun_anggaran} sudah pernah dicatat dalam sistem.`,
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

    // 3. Normalisasi items (multi-batch vs legacy single-batch)
    let normalizedItems = [];
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      normalizedItems = rawItems;
    } else if (nomor_batch && pack_dari !== undefined && pack_sampai !== undefined) {
      normalizedItems = [
        {
          nomor_batch,
          seri,
          kepala,
          emisi_id,
          nomor_pack_list: `${pack_dari}-${pack_sampai}`,
        },
      ];
    }

    if (normalizedItems.length === 0) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'Daftar batch dan nomor pack wajib diisi.',
      });
    }

    // 4. Pre-process dan validasi ketersediaan pack per batch
    const processedItems = [];
    let globalTotalPack = 0;
    let globalJumlahBilyet = 0n;

    for (const item of normalizedItems) {
      let parsed;
      try {
        parsed = parsePackRange(item.nomor_pack_list);
      } catch (err) {
        return errorResponse(res, {
          status: 400,
          error: 'BadRequest',
          message: err.message,
        });
      }

      globalTotalPack += parsed.totalPack;
      globalJumlahBilyet += parsed.jumlahBilyet;

      let batch = null;
      if (item.batch_id) {
        batch = await prisma.batch.findUnique({
          where: { id: item.batch_id },
          include: { emisi: { include: { denominasi: true } } },
        });
        if (!batch) {
          return errorResponse(res, {
            status: 404,
            error: 'NotFound',
            message: `Batch dengan ID ${item.batch_id} tidak ditemukan.`,
          });
        }
      } else if (item.nomor_batch) {
        batch = await prisma.batch.findUnique({
          where: {
            nomor_batch_tahun_anggaran: {
              nomor_batch: item.nomor_batch,
              tahun_anggaran,
            },
          },
          include: { emisi: { include: { denominasi: true } } },
        });

        if (!batch) {
          if (!item.seri || !item.kepala || !item.emisi_id) {
            return errorResponse(res, {
              status: 400,
              error: 'BadRequest',
              message: `Batch "${item.nomor_batch}" belum terdaftar. Metadata batch (seri, kepala, dan emisi_id) wajib diisi untuk registrasi batch baru.`,
            });
          }

          const emisi = await prisma.emisi.findUnique({
            where: { id: item.emisi_id },
            include: { denominasi: true },
          });

          if (!emisi) {
            return errorResponse(res, {
              status: 404,
              error: 'NotFound',
              message: `Emisi dengan ID ${item.emisi_id} tidak ditemukan.`,
            });
          }
        }
      }

      // Validasi konflik / overlap pack jika batch sudah ada
      if (batch) {
        const conflictingPacks = await prisma.packDetail.findMany({
          where: {
            batch_id: batch.id,
            nomor_pack: { in: parsed.numbers },
            status: { not: 'PENDING' },
          },
          select: { nomor_pack: true, status: true },
        });

        if (conflictingPacks.length > 0) {
          const packList = conflictingPacks.map((p) => `#${p.nomor_pack}`).join(', ');
          return errorResponse(res, {
            status: 400,
            error: 'PackOverlapError',
            message: `Gagal mencatat bon masuk: Pack ${packList} pada batch ${batch.nomor_batch} sudah pernah diterima sebelumnya.`,
          });
        }
      }

      processedItems.push({
        raw: item,
        parsed,
        batch,
      });
    }

    // 5. Eksekusi transaksi atomik
    const createdBonMasuk = await prisma.$transaction(async (tx) => {
      const resolvedItems = [];

      for (const pItem of processedItems) {
        let finalBatchId;
        if (pItem.batch) {
          finalBatchId = pItem.batch.id;
          if (pItem.batch.status === 'pending') {
            await tx.batch.update({
              where: { id: pItem.batch.id },
              data: { status: 'in_progress' },
            });
          }
        } else {
          // Registrasi batch baru dan inisialisasi 100 pack
          const newBatch = await tx.batch.create({
            data: {
              nomor_batch: pItem.raw.nomor_batch,
              tahun_anggaran,
              seri: pItem.raw.seri,
              kepala: pItem.raw.kepala,
              emisi_id: pItem.raw.emisi_id,
              jumlah_pack: 100,
              status: 'in_progress',
            },
          });
          finalBatchId = newBatch.id;

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
        }

        resolvedItems.push({
          batch_id: finalBatchId,
          nomor_pack_list: pItem.parsed.canonicalList,
          pack_dari: pItem.parsed.packDari,
          pack_sampai: pItem.parsed.packSampai,
          total_pack: pItem.parsed.totalPack,
          jumlah_bilyet: pItem.parsed.jumlahBilyet,
          numbers: pItem.parsed.numbers,
        });
      }

      const primaryBatchId = resolvedItems.length === 1 ? resolvedItems[0].batch_id : null;
      const primaryPackDari = resolvedItems.length === 1 ? resolvedItems[0].pack_dari : null;
      const primaryPackSampai = resolvedItems.length === 1 ? resolvedItems[0].pack_sampai : null;

      const bon = await tx.bonMasuk.create({
        data: {
          no_bon: no_bon || null,
          no_segel,
          tahun_anggaran,
          batch_id: primaryBatchId,
          tanggal_masuk,
          jam_masuk,
          pack_dari: primaryPackDari,
          pack_sampai: primaryPackSampai,
          total_pack: globalTotalPack,
          jumlah_bilyet: globalJumlahBilyet,
          jenis_mesin_sortir: jenis_mesin_sortir || null,
          kategori_penerimaan,
          shift_id,
          operator_id: req.user.id,
          petugas_khazai: petugas_khazai || null,
          petugas_khazprokhir: petugas_khazprokhir || null,
          catatan: catatan || null,
          items: {
            create: resolvedItems.map((ri) => ({
              batch_id: ri.batch_id,
              nomor_pack_list: ri.nomor_pack_list,
              pack_dari: ri.pack_dari,
              pack_sampai: ri.pack_sampai,
              total_pack: ri.total_pack,
              jumlah_bilyet: ri.jumlah_bilyet,
            })),
          },
        },
        include: {
          items: {
            include: {
              batch: {
                include: {
                  emisi: {
                    include: { denominasi: true },
                  },
                },
              },
            },
          },
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

      // Update pack_detail ke RECEIVED untuk seluruh nomor pack yang diterima
      for (const ri of resolvedItems) {
        await tx.packDetail.updateMany({
          where: {
            batch_id: ri.batch_id,
            nomor_pack: { in: ri.numbers },
          },
          data: {
            status: 'RECEIVED',
            bon_masuk_id: bon.id,
          },
        });
      }

      return bon;
    });

    // 6. Catat audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'bon_masuk',
      tableName: 'bon_masuk',
      recordId: createdBonMasuk.id,
      newValue: {
        id: createdBonMasuk.id,
        no_segel: createdBonMasuk.no_segel,
        tahun_anggaran: createdBonMasuk.tahun_anggaran,
        total_pack: createdBonMasuk.total_pack,
        jumlah_bilyet: createdBonMasuk.jumlah_bilyet.toString(),
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 201,
      message: `Bon masuk dengan nomor segel "${no_segel}" berhasil dicatat (${globalTotalPack} pack diterima).`,
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
 * GET /api/bon-masuk
 */
export async function getAllBonMasuk(req, res) {
  try {
    const {
      tahun_anggaran,
      no_segel,
      tanggal_masuk,
      startDate,
      endDate,
      batch_id,
      shift_id,
      denominasi_id,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const where = {};

    if (search) {
      where.OR = [
        { no_segel: { contains: search, mode: 'insensitive' } },
        { no_bon: { contains: search, mode: 'insensitive' } },
        { batch: { nomor_batch: { contains: search, mode: 'insensitive' } } },
        { items: { some: { batch: { nomor_batch: { contains: search, mode: 'insensitive' } } } } },
        { items: { some: { batch: { seri: { contains: search, mode: 'insensitive' } } } } },
      ];
    } else if (no_segel) {
      where.no_segel = { contains: no_segel, mode: 'insensitive' };
    }

    if (startDate && endDate) {
      where.tanggal_masuk = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (tanggal_masuk) {
      where.tanggal_masuk = new Date(`${tanggal_masuk}T00:00:00.000Z`);
    }

    if (tahun_anggaran) {
      where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    }

    if (batch_id) {
      const bId = parseInt(batch_id, 10);
      where.OR = [
        { batch_id: bId },
        { items: { some: { batch_id: bId } } },
      ];
    }

    if (shift_id) {
      where.shift_id = parseInt(shift_id, 10);
    }

    if (denominasi_id) {
      const dId = parseInt(denominasi_id, 10);
      where.OR = [
        { batch: { emisi: { denominasi_id: dId } } },
        { items: { some: { batch: { emisi: { denominasi_id: dId } } } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.bonMasuk.count({ where }),
      prisma.bonMasuk.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              batch: {
                include: {
                  emisi: {
                    include: { denominasi: true },
                  },
                },
              },
            },
            orderBy: { id: 'asc' },
          },
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
            select: {
              id: true,
              batch_id: true,
              nomor_pack: true,
              status: true,
            },
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
        items: {
          include: {
            batch: {
              include: {
                emisi: {
                  include: { denominasi: true },
                },
              },
            },
          },
          orderBy: { id: 'asc' },
        },
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
        items: true,
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
        tahun_anggaran: bonMasuk.tahun_anggaran,
        total_pack: bonMasuk.total_pack,
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
        items: {
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
        },
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
      // Prioritaskan items jika ada
      if (bon.items && bon.items.length > 0) {
        for (const item of bon.items) {
          totalPack += item.total_pack;
          totalBilyet += BigInt(item.jumlah_bilyet);

          const denomName = item.batch?.emisi?.denominasi?.nama || 'Unknown';
          const denomNilai = item.batch?.emisi?.denominasi?.nilai || 0;

          if (!perDenominasi[denomName]) {
            perDenominasi[denomName] = {
              nama: denomName,
              nilai: denomNilai,
              total_bon: 0,
              total_pack: 0,
              total_bilyet: 0n,
            };
          }

          perDenominasi[denomName].total_pack += item.total_pack;
          perDenominasi[denomName].total_bilyet += BigInt(item.jumlah_bilyet);
        }
        // Hitung bon count
        const denomNamesInBon = new Set(bon.items.map((it) => it.batch?.emisi?.denominasi?.nama || 'Unknown'));
        for (const dn of denomNamesInBon) {
          perDenominasi[dn].total_bon += 1;
        }
      } else {
        // Fallback single-batch
        const packsInBon = bon.total_pack || ((bon.pack_sampai || 0) - (bon.pack_dari || 0) + 1);
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
    }

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

/**
 * Memperbarui / mengedit bon masuk (Granular Safety Locking per item batch)
 * PUT /api/bon-masuk/:id
 */
export async function updateBonMasuk(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, { status: 400, message: 'ID Bon Masuk tidak valid.' });
    }

    const {
      tahun_anggaran,
      no_bon,
      no_segel,
      tanggal_masuk,
      jam_masuk,
      jenis_mesin_sortir,
      kategori_penerimaan,
      shift_id,
      petugas_khazai,
      petugas_khazprokhir,
      catatan,
      items: rawItems,
      // Legacy fields
      nomor_batch,
      seri,
      kepala,
      emisi_id,
      pack_dari,
      pack_sampai,
    } = req.body;

    const existingBon = await prisma.bonMasuk.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            emisi: {
              include: { denominasi: true },
            },
          },
        },
        items: {
          include: {
            batch: true,
          },
        },
        packs: true,
      },
    });

    if (!existingBon) {
      return errorResponse(res, { status: 404, message: 'Bon masuk tidak ditemukan.' });
    }

    const targetTahun = tahun_anggaran || existingBon.tahun_anggaran;
    const targetSegel = no_segel || existingBon.no_segel;

    // 1. Cek keunikan no_segel per tahun anggaran jika ada perubahan
    if (targetSegel !== existingBon.no_segel || targetTahun !== existingBon.tahun_anggaran) {
      const segelConflict = await prisma.bonMasuk.findUnique({
        where: {
          no_segel_tahun_anggaran: {
            no_segel: targetSegel,
            tahun_anggaran: targetTahun,
          },
        },
      });

      if (segelConflict) {
        return errorResponse(res, {
          status: 409,
          error: 'Conflict',
          message: `Nomor segel "${targetSegel}" untuk tahun anggaran ${targetTahun} sudah pernah dicatat dalam sistem.`,
        });
      }
    }

    // 2. Verifikasi shift jika diubah
    if (shift_id && shift_id !== existingBon.shift_id) {
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

    // 3. Normalisasi items
    let normalizedItems = null;
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      normalizedItems = rawItems;
    } else if (
      pack_dari !== undefined ||
      pack_sampai !== undefined ||
      nomor_batch !== undefined
    ) {
      const fallbackBatchId = existingBon.items?.[0]?.batch_id || existingBon.batch_id;
      const fallbackPackDari =
        pack_dari !== undefined
          ? pack_dari
          : existingBon.items?.[0]?.pack_dari || existingBon.pack_dari || 1;
      const fallbackPackSampai =
        pack_sampai !== undefined
          ? pack_sampai
          : existingBon.items?.[0]?.pack_sampai || existingBon.pack_sampai || 100;

      normalizedItems = [
        {
          batch_id: fallbackBatchId,
          nomor_batch: nomor_batch || undefined,
          seri,
          kepala,
          emisi_id,
          nomor_pack_list: `${fallbackPackDari}-${fallbackPackSampai}`,
        },
      ];
    }

    // 4. Granular Safety Locking per item batch
    // Hitung batch mana saja yang sudah diproses sortir
    const processedBatchIds = new Set(
      existingBon.packs
        .filter((p) => ['SORTED', 'PACKED', 'SHIPPED'].includes(p.status))
        .map((p) => p.batch_id)
    );

    if (normalizedItems) {
      // Periksa apakah ada batch terkunci yang dihapus atau diubah rentang pack-nya
      for (const lockedBatchId of processedBatchIds) {
        const existingItem = existingBon.items.find((it) => it.batch_id === lockedBatchId);
        const newItem = normalizedItems.find((it) => it.batch_id === lockedBatchId);

        if (!newItem) {
          return errorResponse(res, {
            status: 400,
            error: 'CannotEditProcessedBatch',
            message: `Batch ID ${lockedBatchId} pada bon masuk ini sudah mulai diproses sortir dan tidak dapat dihapus.`,
          });
        }

        // Cek jika nomor pack list diubah pada batch yang terkunci
        let existingCanonicalList = null;
        if (existingItem) {
          existingCanonicalList = parsePackRange(existingItem.nomor_pack_list).canonicalList;
        } else if (existingBon.batch_id === lockedBatchId) {
          const fallbackRange = `${existingBon.pack_dari || 1}-${existingBon.pack_sampai || 100}`;
          existingCanonicalList = parsePackRange(fallbackRange).canonicalList;
        }

        if (existingCanonicalList) {
          const parsedNew = parsePackRange(newItem.nomor_pack_list);
          if (existingCanonicalList !== parsedNew.canonicalList) {
            return errorResponse(res, {
              status: 400,
              error: 'CannotEditProcessedBatch',
              message: `Batch ID ${lockedBatchId} pada bon masuk ini sudah mulai diproses sortir dan rentang pack-nya tidak dapat diubah.`,
            });
          }
        }
      }
    } else if (processedBatchIds.size > 0) {
      // Jika mode update legacy dan ada pack yang sudah disortir
      return errorResponse(res, {
        status: 400,
        error: 'CannotEditProcessedBon',
        message: 'Bon masuk tidak dapat disunting karena beberapa pack telah diproses ke tahap sortir atau kemas.',
      });
    }

    // 5. Pre-process items baru dan validasi ketersediaan pack
    let resolvedNewItems = [];
    let globalTotalPack = existingBon.total_pack;
    let globalJumlahBilyet = existingBon.jumlah_bilyet;

    if (normalizedItems) {
      globalTotalPack = 0;
      globalJumlahBilyet = 0n;

      for (const item of normalizedItems) {
        let parsed;
        try {
          parsed = parsePackRange(item.nomor_pack_list);
        } catch (err) {
          return errorResponse(res, {
            status: 400,
            error: 'BadRequest',
            message: err.message,
          });
        }

        globalTotalPack += parsed.totalPack;
        globalJumlahBilyet += parsed.jumlahBilyet;

        let batchId = item.batch_id;
        if (!batchId && item.nomor_batch) {
          let b = await prisma.batch.findUnique({
            where: {
              nomor_batch_tahun_anggaran: {
                nomor_batch: item.nomor_batch,
                tahun_anggaran: targetTahun,
              },
            },
          });
          if (b) {
            batchId = b.id;
          }
        }

        // Cek konflik overlap pack pada pack yang BUKAN milik bon_masuk ini
        if (batchId) {
          const conflicting = await prisma.packDetail.findMany({
            where: {
              batch_id: batchId,
              nomor_pack: { in: parsed.numbers },
              status: { not: 'PENDING' },
              bon_masuk_id: { not: existingBon.id },
            },
            select: { nomor_pack: true },
          });

          if (conflicting.length > 0) {
            const conflictList = conflicting.map((p) => `#${p.nomor_pack}`).join(', ');
            return errorResponse(res, {
              status: 400,
              error: 'PackOverlapError',
              message: `Gagal memperbarui bon masuk: Pack ${conflictList} pada batch sudah pernah diterima pada bon lain.`,
            });
          }
        }

        resolvedNewItems.push({
          batch_id: batchId,
          nomor_batch: item.nomor_batch,
          seri: item.seri,
          kepala: item.kepala,
          emisi_id: item.emisi_id,
          parsed,
        });
      }
    }

    // 6. Transaksi atomik pembaruan
    const updatedBonMasuk = await prisma.$transaction(async (tx) => {
      if (normalizedItems) {
        // Handle pembuatan batch baru jika diperlukan
        const finalItemRecords = [];
        for (const rItem of resolvedNewItems) {
          let finalBatchId = rItem.batch_id;
          if (!finalBatchId) {
            const newBatch = await tx.batch.create({
              data: {
                nomor_batch: rItem.nomor_batch,
                tahun_anggaran: targetTahun,
                seri: rItem.seri,
                kepala: rItem.kepala,
                emisi_id: rItem.emisi_id,
                jumlah_pack: 100,
                status: 'in_progress',
              },
            });
            finalBatchId = newBatch.id;

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
          }

          finalItemRecords.push({
            batch_id: finalBatchId,
            nomor_pack_list: rItem.parsed.canonicalList,
            pack_dari: rItem.parsed.packDari,
            pack_sampai: rItem.parsed.packSampai,
            total_pack: rItem.parsed.totalPack,
            jumlah_bilyet: rItem.parsed.jumlahBilyet,
            numbers: rItem.parsed.numbers,
          });
        }

        // Revert status pack lama yang tidak terkunci ke PENDING
        // Hanya pack yang BUKAN dari batch terkunci
        await tx.packDetail.updateMany({
          where: {
            bon_masuk_id: existingBon.id,
            batch_id: { notIn: Array.from(processedBatchIds) },
          },
          data: {
            status: 'PENDING',
            bon_masuk_id: null,
          },
        });

        // Hapus item-item yang tidak terkunci
        await tx.bonMasukItem.deleteMany({
          where: {
            bon_masuk_id: existingBon.id,
            batch_id: { notIn: Array.from(processedBatchIds) },
          },
        });

        // Buat atau perbarui item baru yang tidak terkunci
        for (const itemRecord of finalItemRecords) {
          if (!processedBatchIds.has(itemRecord.batch_id)) {
            await tx.bonMasukItem.create({
              data: {
                bon_masuk_id: existingBon.id,
                batch_id: itemRecord.batch_id,
                nomor_pack_list: itemRecord.nomor_pack_list,
                pack_dari: itemRecord.pack_dari,
                pack_sampai: itemRecord.pack_sampai,
                total_pack: itemRecord.total_pack,
                jumlah_bilyet: itemRecord.jumlah_bilyet,
              },
            });

            // Set pack detail ke RECEIVED
            await tx.packDetail.updateMany({
              where: {
                batch_id: itemRecord.batch_id,
                nomor_pack: { in: itemRecord.numbers },
              },
              data: {
                status: 'RECEIVED',
                bon_masuk_id: existingBon.id,
              },
            });
          }
        }
      }

      // Update metadata header
      const primaryBatchId =
        normalizedItems && resolvedNewItems.length === 1
          ? resolvedNewItems[0].batch_id
          : existingBon.batch_id;
      const primaryPackDari =
        normalizedItems && resolvedNewItems.length === 1
          ? resolvedNewItems[0].parsed.packDari
          : existingBon.pack_dari;
      const primaryPackSampai =
        normalizedItems && resolvedNewItems.length === 1
          ? resolvedNewItems[0].parsed.packSampai
          : existingBon.pack_sampai;

      const updated = await tx.bonMasuk.update({
        where: { id: existingBon.id },
        data: {
          no_bon: no_bon !== undefined ? (no_bon || null) : existingBon.no_bon,
          no_segel: targetSegel,
          tahun_anggaran: targetTahun,
          batch_id: primaryBatchId,
          tanggal_masuk: tanggal_masuk || existingBon.tanggal_masuk,
          jam_masuk: jam_masuk || existingBon.jam_masuk,
          pack_dari: primaryPackDari,
          pack_sampai: primaryPackSampai,
          total_pack: globalTotalPack,
          jumlah_bilyet: globalJumlahBilyet,
          jenis_mesin_sortir:
            jenis_mesin_sortir !== undefined
              ? (jenis_mesin_sortir || null)
              : existingBon.jenis_mesin_sortir,
          kategori_penerimaan: kategori_penerimaan || existingBon.kategori_penerimaan,
          shift_id: shift_id || existingBon.shift_id,
          petugas_khazai:
            petugas_khazai !== undefined ? (petugas_khazai || null) : existingBon.petugas_khazai,
          petugas_khazprokhir:
            petugas_khazprokhir !== undefined
              ? (petugas_khazprokhir || null)
              : existingBon.petugas_khazprokhir,
          catatan: catatan !== undefined ? (catatan || null) : existingBon.catatan,
        },
        include: {
          items: {
            include: {
              batch: {
                include: {
                  emisi: {
                    include: { denominasi: true },
                  },
                },
              },
            },
          },
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

      return updated;
    });

    // 7. Catat Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'bon_masuk',
      tableName: 'bon_masuk',
      recordId: updatedBonMasuk.id,
      oldValue: {
        no_segel: existingBon.no_segel,
        tahun_anggaran: existingBon.tahun_anggaran,
        total_pack: existingBon.total_pack,
        jumlah_bilyet: existingBon.jumlah_bilyet.toString(),
      },
      newValue: {
        no_segel: updatedBonMasuk.no_segel,
        tahun_anggaran: updatedBonMasuk.tahun_anggaran,
        total_pack: updatedBonMasuk.total_pack,
        jumlah_bilyet: updatedBonMasuk.jumlah_bilyet.toString(),
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      status: 200,
      message: `Bon masuk dengan nomor segel "${updatedBonMasuk.no_segel}" berhasil diperbarui.`,
      data: updatedBonMasuk,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal memperbarui bon masuk.',
      error: err.message,
    });
  }
}
