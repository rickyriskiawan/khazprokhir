import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { calculateNominal, formatRupiah } from '../utils/converter.js';
import { detectGaps, formatDoosRanges } from '../utils/businessRules.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

/**
 * Mengambil buku register doos hasil pengemasan
 * Mendukung filter: denominasi_id, tahun_anggaran, status (SIAP_KEMAS, READY, SHIPPED), search
 * Mendukung mode: view = 'range' (default) atau 'individual' (satuan doos)
 * GET /api/monitoring-doos/register
 */
export async function getDoosRegister(req, res) {
  try {
    const {
      denominasi_id,
      tahun_anggaran,
      status,
      view = 'range',
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (denominasi_id) where.denominasi_id = denominasi_id;
    if (tahun_anggaran) where.tahun_anggaran = tahun_anggaran;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { no_ba_pengemasan: { contains: search, mode: 'insensitive' } },
        { batch: { nomor_batch: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (view === 'range') {
      const total = await prisma.hasilKemas.count({ where });
      const skip = (page - 1) * limit;

      const kemasList = await prisma.hasilKemas.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { tahun_anggaran: 'desc' },
          { no_doos_awal: 'asc' },
        ],
        include: {
          denominasi: true,
          batch: {
            include: {
              emisi: true,
            },
          },
          shift: true,
          operator: {
            select: USER_SAFE_SELECT,
          },
          pengiriman_details: {
            include: {
              pengiriman: true,
            },
          },
        },
      });

      const data = kemasList.map((k) => {
        const nominal = calculateNominal(k.total_bilyet, k.denominasi.nilai);
        return {
          id: k.id,
          nomor_doos_range: `Doos ${k.no_doos_awal}-${k.no_doos_akhir}`,
          no_doos_awal: k.no_doos_awal,
          no_doos_akhir: k.no_doos_akhir,
          total_doos: k.total_doos,
          total_pack: k.total_pack,
          total_bilyet: k.total_bilyet.toString(),
          nominal_rupiah: formatRupiah(nominal),
          nominal_angka: nominal.toString(),
          no_ba_pengemasan: k.no_ba_pengemasan,
          tanggal_kemas: k.tanggal_kemas.toISOString().split('T')[0],
          status: k.status,
          catatan: k.catatan,
          denominasi: k.denominasi,
          batch: {
            id: k.batch.id,
            nomor_batch: k.batch.nomor_batch,
            seri: k.batch.seri,
            kepala: k.batch.kepala,
            emisi: k.batch.emisi,
          },
          shift: {
            id: k.shift.id,
            nama: k.shift.nama,
          },
          operator: k.operator,
          pengiriman: k.pengiriman_details?.[0]?.pengiriman || null,
          created_at: k.created_at,
          updated_at: k.updated_at,
        };
      });

      return successResponse(res, {
        status: 200,
        message: 'Buku register doos (mode rentang) berhasil diambil.',
        data,
        meta: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit) || 1,
        },
      });
    }

    // Mode 'individual' (pecah ke satuan doos per baris)
    const allKemas = await prisma.hasilKemas.findMany({
      where,
      orderBy: [
        { tahun_anggaran: 'desc' },
        { no_doos_awal: 'asc' },
      ],
      include: {
        denominasi: true,
        batch: {
          include: {
            emisi: true,
          },
        },
        shift: true,
        operator: {
          select: USER_SAFE_SELECT,
        },
        pengiriman_details: {
          include: {
            pengiriman: true,
          },
        },
      },
    });

    const individualDoosList = [];
    for (const k of allKemas) {
      const bilyetPerDoos = 20000;
      const nominalPerDoos = calculateNominal(bilyetPerDoos, k.denominasi.nilai);

      for (let n = k.no_doos_awal; n <= k.no_doos_akhir; n++) {
        individualDoosList.push({
          nomor_doos: n,
          hasil_kemas_id: k.id,
          nomor_doos_range: `Doos ${k.no_doos_awal}-${k.no_doos_akhir}`,
          no_ba_pengemasan: k.no_ba_pengemasan,
          tanggal_kemas: k.tanggal_kemas.toISOString().split('T')[0],
          status: k.status,
          total_bilyet: bilyetPerDoos.toString(),
          nominal_rupiah: formatRupiah(nominalPerDoos),
          denominasi: k.denominasi,
          batch: {
            id: k.batch.id,
            nomor_batch: k.batch.nomor_batch,
            seri: k.batch.seri,
            kepala: k.batch.kepala,
          },
          shift: {
            id: k.shift.id,
            nama: k.shift.nama,
          },
          operator: k.operator,
          pengiriman: k.pengiriman_details?.[0]?.pengiriman || null,
        });
      }
    }

    const totalIndividual = individualDoosList.length;
    const skip = (page - 1) * limit;
    const paginatedIndividual = individualDoosList.slice(skip, skip + limit);

    return successResponse(res, {
      status: 200,
      message: 'Buku register doos (mode satuan individual) berhasil diambil.',
      data: paginatedIndividual,
      meta: {
        page,
        limit,
        total: totalIndividual,
        total_pages: Math.ceil(totalIndividual / limit) || 1,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil buku register doos.',
      error: err.message,
    });
  }
}

/**
 * Memeriksa integritas urutan nomor doos dan mendeteksi adanya celah (gap/loncat nomor)
 * GET /api/monitoring-doos/gap-check
 */
export async function getDoosGapCheck(req, res) {
  try {
    const {
      denominasi_id,
      tahun_anggaran,
      start_from_one = true,
    } = req.query;

    const denom = await prisma.denominasi.findUnique({
      where: { id: denominasi_id },
      include: {
        emisi: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!denom) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Denominasi dengan ID ${denominasi_id} tidak ditemukan.`,
      });
    }

    const targetTahun = tahun_anggaran || new Date().getFullYear();

    const kemasList = await prisma.hasilKemas.findMany({
      where: {
        denominasi_id,
        tahun_anggaran: targetTahun,
      },
      orderBy: { no_doos_awal: 'asc' },
      include: {
        batch: true,
      },
    });

    if (kemasList.length === 0) {
      return successResponse(res, {
        status: 200,
        message: 'Pemeriksaan gap selesai. Belum ada nomor doos yang tercatat pada tahun anggaran ini.',
        data: {
          denominasi: {
            id: denom.id,
            nama: denom.nama,
            nilai: denom.nilai,
            sandi: denom.emisi?.[0]?.sandi || null,
          },
          tahun_anggaran: targetTahun,
          is_intact: true,
          min_doos: 0,
          max_doos: 0,
          total_expected: 0,
          total_actual: 0,
          total_gaps: 0,
          gaps: [],
          gap_ranges: [],
          overlaps: [],
          registered_ranges: [],
        },
      });
    }

    const seenNumbers = new Map();
    const overlaps = [];
    const allNumbers = [];
    const registeredRanges = [];

    for (const k of kemasList) {
      registeredRanges.push({
        hasil_kemas_id: k.id,
        nomor_batch: k.batch.nomor_batch,
        no_ba_pengemasan: k.no_ba_pengemasan,
        no_doos_awal: k.no_doos_awal,
        no_doos_akhir: k.no_doos_akhir,
        total_doos: k.total_doos,
        status: k.status,
      });

      for (let n = k.no_doos_awal; n <= k.no_doos_akhir; n++) {
        if (seenNumbers.has(n)) {
          overlaps.push({
            nomor_doos: n,
            first_seen_in_kemas_id: seenNumbers.get(n),
            duplicate_in_kemas_id: k.id,
          });
        } else {
          seenNumbers.set(n, k.id);
          allNumbers.push(n);
        }
      }
    }

    allNumbers.sort((a, b) => a - b);
    const minDoos = allNumbers[0];
    const maxDoos = allNumbers[allNumbers.length - 1];

    const gaps = [];

    // Jika start_from_one aktif dan nomor doos terendah bukan 1 (misal dimulai dari nomor 10)
    if (start_from_one && minDoos > 1) {
      for (let g = 1; g < minDoos; g++) {
        gaps.push(g);
      }
    }

    // Deteksi celah nomor internal menggunakan helper detectGaps
    const internalGaps = detectGaps(allNumbers);
    gaps.push(...internalGaps);

    const gapRanges = formatDoosRanges(gaps);

    const startingPoint = start_from_one ? 1 : minDoos;
    const totalExpected = maxDoos - startingPoint + 1;
    const totalActual = allNumbers.length;
    const isIntact = gaps.length === 0 && overlaps.length === 0;

    return successResponse(res, {
      status: 200,
      message: isIntact
        ? 'Pemeriksaan gap nomor doos selesai. Seluruh urutan nomor doos lengkap tanpa celah (intact).'
        : `Ditemukan ${gaps.length} nomor doos yang hilang/terlewat (gap) dan ${overlaps.length} bentrokan nomor doos.`,
      data: {
        denominasi: {
          id: denom.id,
          nama: denom.nama,
          nilai: denom.nilai,
          sandi: denom.emisi?.[0]?.sandi || null,
        },
        tahun_anggaran: targetTahun,
        is_intact: isIntact,
        min_doos: minDoos,
        max_doos: maxDoos,
        total_expected: totalExpected,
        total_actual: totalActual,
        total_gaps: gaps.length,
        gaps,
        gap_ranges: gapRanges,
        overlaps,
        registered_ranges: registeredRanges,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal melakukan pemeriksaan gap nomor doos.',
      error: err.message,
    });
  }
}

/**
 * Ringkasan statistik stok dan persediaan doos (global & per pecahan)
 * Memisahkan status: antrian_wip (SIAP_KEMAS), siap_kirim (READY), terkirim (SHIPPED)
 * GET /api/monitoring-doos/summary
 */
export async function getDoosSummary(req, res) {
  try {
    const { denominasi_id, tahun_anggaran } = req.query;

    const where = {};
    if (denominasi_id) where.denominasi_id = denominasi_id;
    if (tahun_anggaran) where.tahun_anggaran = tahun_anggaran;

    const [kemasList, denoms] = await Promise.all([
      prisma.hasilKemas.findMany({
        where,
        include: {
          denominasi: true,
          batch: {
            include: {
              emisi: true,
            },
          },
        },
      }),
      prisma.denominasi.findMany({
        where: {
          is_active: true,
          ...(denominasi_id && { id: denominasi_id }),
        },
        orderBy: { nilai: 'asc' },
        include: {
          emisi: {
            where: { is_active: true },
            take: 1,
          },
        },
      }),
    ]);

    let totalKemas = kemasList.length;
    let totalDoos = 0;
    let totalPack = 0;
    let totalBilyet = 0n;
    let totalNominal = 0n;

    // Kategori status
    const statusCounts = {
      SIAP_KEMAS: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
      READY: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
      SHIPPED: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
    };

    // Peta per denominasi
    const denomMap = new Map();
    for (const d of denoms) {
      denomMap.set(d.id, {
        denominasi_id: d.id,
        nama: d.nama,
        nilai: d.nilai,
        sandi: d.emisi?.[0]?.sandi || null,
        min_no_doos: 0,
        max_no_doos: 0,
        total_kemas: 0,
        total_doos: 0,
        total_pack: 0,
        total_bilyet: 0n,
        total_nominal: 0n,
        antrian_wip: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
        siap_kirim: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
        terkirim: { total_kemas: 0, total_doos: 0, total_pack: 0, total_bilyet: 0n, total_nominal: 0n },
        _all_doos_numbers: [],
      });
    }

    for (const k of kemasList) {
      const bilyet = BigInt(k.total_bilyet);
      const nominal = BigInt(calculateNominal(bilyet, k.denominasi.nilai));

      totalDoos += k.total_doos;
      totalPack += k.total_pack;
      totalBilyet += bilyet;
      totalNominal += nominal;

      if (statusCounts[k.status]) {
        statusCounts[k.status].total_kemas += 1;
        statusCounts[k.status].total_doos += k.total_doos;
        statusCounts[k.status].total_pack += k.total_pack;
        statusCounts[k.status].total_bilyet += bilyet;
        statusCounts[k.status].total_nominal += nominal;
      }

      if (denomMap.has(k.denominasi_id)) {
        const dItem = denomMap.get(k.denominasi_id);
        dItem.total_kemas += 1;
        dItem.total_doos += k.total_doos;
        dItem.total_pack += k.total_pack;
        dItem.total_bilyet += bilyet;
        dItem.total_nominal += nominal;

        for (let n = k.no_doos_awal; n <= k.no_doos_akhir; n++) {
          dItem._all_doos_numbers.push(n);
        }

        let targetStatusBucket = null;
        if (k.status === 'SIAP_KEMAS') targetStatusBucket = dItem.antrian_wip;
        else if (k.status === 'READY') targetStatusBucket = dItem.siap_kirim;
        else if (k.status === 'SHIPPED') targetStatusBucket = dItem.terkirim;

        if (targetStatusBucket) {
          targetStatusBucket.total_kemas += 1;
          targetStatusBucket.total_doos += k.total_doos;
          targetStatusBucket.total_pack += k.total_pack;
          targetStatusBucket.total_bilyet += bilyet;
          targetStatusBucket.total_nominal += nominal;
        }
      }
    }

    const rincianDenominasi = Array.from(denomMap.values()).map((item) => {
      let minDoos = 0;
      let maxDoos = 0;
      if (item._all_doos_numbers.length > 0) {
        minDoos = Math.min(...item._all_doos_numbers);
        maxDoos = Math.max(...item._all_doos_numbers);
      }

      const { _all_doos_numbers, ...cleanItem } = item;

      return {
        ...cleanItem,
        min_no_doos: minDoos,
        max_no_doos: maxDoos,
        total_bilyet: cleanItem.total_bilyet.toString(),
        total_nominal_rupiah: formatRupiah(cleanItem.total_nominal),
        total_nominal_angka: cleanItem.total_nominal.toString(),
        antrian_wip: {
          ...cleanItem.antrian_wip,
          total_bilyet: cleanItem.antrian_wip.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(cleanItem.antrian_wip.total_nominal),
          total_nominal_angka: cleanItem.antrian_wip.total_nominal.toString(),
        },
        siap_kirim: {
          ...cleanItem.siap_kirim,
          total_bilyet: cleanItem.siap_kirim.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(cleanItem.siap_kirim.total_nominal),
          total_nominal_angka: cleanItem.siap_kirim.total_nominal.toString(),
        },
        terkirim: {
          ...cleanItem.terkirim,
          total_bilyet: cleanItem.terkirim.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(cleanItem.terkirim.total_nominal),
          total_nominal_angka: cleanItem.terkirim.total_nominal.toString(),
        },
      };
    });

    return successResponse(res, {
      status: 200,
      message: 'Ringkasan persediaan dan monitoring doos berhasil diambil.',
      data: {
        total_kemas: totalKemas,
        total_doos: totalDoos,
        total_pack: totalPack,
        total_bilyet: totalBilyet.toString(),
        total_nominal_rupiah: formatRupiah(totalNominal),
        total_nominal_angka: totalNominal.toString(),
        antrian_wip: {
          total_kemas: statusCounts.SIAP_KEMAS.total_kemas,
          total_doos: statusCounts.SIAP_KEMAS.total_doos,
          total_pack: statusCounts.SIAP_KEMAS.total_pack,
          total_bilyet: statusCounts.SIAP_KEMAS.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(statusCounts.SIAP_KEMAS.total_nominal),
          total_nominal_angka: statusCounts.SIAP_KEMAS.total_nominal.toString(),
        },
        siap_kirim: {
          total_kemas: statusCounts.READY.total_kemas,
          total_doos: statusCounts.READY.total_doos,
          total_pack: statusCounts.READY.total_pack,
          total_bilyet: statusCounts.READY.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(statusCounts.READY.total_nominal),
          total_nominal_angka: statusCounts.READY.total_nominal.toString(),
        },
        terkirim: {
          total_kemas: statusCounts.SHIPPED.total_kemas,
          total_doos: statusCounts.SHIPPED.total_doos,
          total_pack: statusCounts.SHIPPED.total_pack,
          total_bilyet: statusCounts.SHIPPED.total_bilyet.toString(),
          total_nominal_rupiah: formatRupiah(statusCounts.SHIPPED.total_nominal),
          total_nominal_angka: statusCounts.SHIPPED.total_nominal.toString(),
        },
        rincian_denominasi: rincianDenominasi,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: 'Gagal mengambil ringkasan persediaan doos.',
      error: err.message,
    });
  }
}
