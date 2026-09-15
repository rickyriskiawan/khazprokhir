import prisma from '../lib/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createAuditLog } from '../utils/auditLogger.js';
import {
  formatNumber,
  formatRupiah,
  formatIndonesianDate,
  terbilang,
} from '../utils/converter.js';
import { validatePengirimanDoos } from '../utils/businessRules.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  full_name: true,
  role: true,
};

/**
 * Mencatat pengiriman doos ke Bank Indonesia (Surat Jalan & BA Penyerahan)
 * POST /api/pengiriman
 */
export async function createPengiriman(req, res) {
  try {
    const {
      nomor_surat_jalan,
      tanggal_kirim,
      denominasi_id,
      tahun_anggaran,
      sandi_emisi,
      hasil_kemas_ids,
      no_ba_penyerahan,
      no_ba_pengemasan_rekap,
      keterangan = 'UTAS',
      tujuan = 'Bank Indonesia',
      lokasi_penyerahan = 'Karawang',
      penyerah_nama,
      penyerah_jabatan = 'Kepala Seksi',
      penerima_nama,
      status = 'SHIPPED',
      catatan,
    } = req.body;

    // 1. Validasi Keunikan Nomor Surat Jalan
    const existingSJ = await prisma.pengiriman.findUnique({
      where: { nomor_surat_jalan },
    });

    if (existingSJ) {
      return errorResponse(res, {
        status: 400,
        error: 'DuplicateSuratJalan',
        message: `Nomor surat jalan '${nomor_surat_jalan}' sudah terdaftar.`,
      });
    }

    // 2. Validasi Keberadaan Denominasi
    const denominasi = await prisma.denominasi.findUnique({
      where: { id: denominasi_id },
      include: { emisi: true },
    });

    if (!denominasi) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Denominasi dengan ID ${denominasi_id} tidak ditemukan.`,
      });
    }

    // 3. Ambil dan Validasi Hasil Kemas
    const hasilKemasList = await prisma.hasilKemas.findMany({
      where: {
        id: { in: hasil_kemas_ids },
      },
      include: {
        batch: true,
        kemas_pack_details: {
          include: { pack_detail: true },
        },
      },
    });

    if (hasilKemasList.length !== hasil_kemas_ids.length) {
      const foundIds = new Set(hasilKemasList.map((h) => h.id));
      const missingIds = hasil_kemas_ids.filter((id) => !foundIds.has(id));
      return errorResponse(res, {
        status: 404,
        error: 'HasilKemasNotFound',
        message: `Hasil kemas dengan ID [${missingIds.join(', ')}] tidak ditemukan.`,
      });
    }

    // 4. Validasi Domain: Keseragaman, Status READY, dan Kontinuitas Doos (Tanpa Celah & Tanpa Overlap)
    const valResult = validatePengirimanDoos(hasilKemasList, denominasi_id, tahun_anggaran);
    if (!valResult.valid) {
      return errorResponse(res, {
        status: 400,
        error: valResult.error,
        message: valResult.message,
      });
    }

    const { minDoos, maxDoos, totalDoos, totalBilyet, totalNominal, baRekap, sorted } = valResult;
    const finalTotalNominal = totalNominal > 0 ? totalNominal : Number(totalBilyet * BigInt(denominasi.nilai));
    const finalSandiEmisi =
      sandi_emisi ||
      denominasi.emisi?.[0]?.sandi ||
      `${denominasi.nama}'${String(tahun_anggaran).slice(2)}`;
    const finalBaRekap = no_ba_pengemasan_rekap || baRekap || null;

    // 5. Eksekusi Database Transaction
    const createdPengiriman = await prisma.$transaction(async (tx) => {
      // A. Simpan Header Pengiriman
      const pengiriman = await tx.pengiriman.create({
        data: {
          nomor_surat_jalan,
          tanggal_kirim: new Date(tanggal_kirim),
          tahun_anggaran,
          denominasi_id,
          sandi_emisi: finalSandiEmisi,
          no_doos_awal: minDoos,
          no_doos_akhir: maxDoos,
          total_doos: totalDoos,
          total_bilyet: totalBilyet,
          total_nominal: finalTotalNominal,
          no_ba_penyerahan: no_ba_penyerahan || null,
          no_ba_pengemasan_rekap: finalBaRekap,
          keterangan,
          tujuan,
          lokasi_penyerahan,
          penyerah_nama,
          penyerah_jabatan,
          penerima_nama: penerima_nama || null,
          status,
          shipped_at: status === 'SHIPPED' ? new Date() : null,
          catatan: catatan || null,
          created_by: req.user.id,
          approved_by: req.user.role === 'SUPERVISOR' ? req.user.id : null,
        },
      });

      // B. Simpan Rincian PengirimanDetail
      for (const hk of sorted) {
        await tx.pengirimanDetail.create({
          data: {
            pengiriman_id: pengiriman.id,
            hasil_kemas_id: hk.id,
            batch_id: hk.batch_id,
            no_doos_awal: hk.no_doos_awal,
            no_doos_akhir: hk.no_doos_akhir,
            jumlah_kemasan_doos: hk.total_doos,
            no_ba_penyerahan: no_ba_penyerahan || null,
            keterangan,
            tanggal_pengemasan: hk.tanggal_kemas,
            no_ba_pengemasan: hk.no_ba_pengemasan,
          },
        });
      }

      // C. Jika status SHIPPED, perbarui status HasilKemas & PackDetail ke SHIPPED
      if (status === 'SHIPPED') {
        await tx.hasilKemas.updateMany({
          where: { id: { in: hasil_kemas_ids } },
          data: { status: 'SHIPPED' },
        });

        await tx.packDetail.updateMany({
          where: { hasil_kemas_id: { in: hasil_kemas_ids } },
          data: { status: 'SHIPPED' },
        });
      }

      return pengiriman;
    });

    // 6. Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      module: 'pengiriman',
      tableName: 'pengiriman',
      recordId: createdPengiriman.id,
      newValue: {
        nomor_surat_jalan: createdPengiriman.nomor_surat_jalan,
        denominasi_id: createdPengiriman.denominasi_id,
        tahun_anggaran: createdPengiriman.tahun_anggaran,
        rentang_doos: `Doos ${minDoos}-${maxDoos}`,
        total_doos: totalDoos,
        total_nominal: finalTotalNominal,
        status: createdPengiriman.status,
      },
      ipAddress: req.ip,
    });

    // 7. Ambil Data Lengkap untuk Response
    const fullPengiriman = await prisma.pengiriman.findUnique({
      where: { id: createdPengiriman.id },
      include: {
        denominasi: true,
        creator: { select: USER_SAFE_SELECT },
        approver: { select: USER_SAFE_SELECT },
        details: {
          include: { batch: true, hasil_kemas: true },
          orderBy: { no_doos_awal: 'asc' },
        },
      },
    });

    return successResponse(res, {
      status: 201,
      message: `Surat jalan pengiriman ${nomor_surat_jalan} berhasil dicatat (${totalDoos} doos [Doos ${minDoos}-${maxDoos}] ke ${tujuan}).`,
      data: fullPengiriman,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal mencatat pengiriman: ${err.message}`,
    });
  }
}

/**
 * Mengambil daftar pengiriman dengan pagination dan filter
 * GET /api/pengiriman
 */
export async function getPengiriman(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      denominasi_id,
      tahun_anggaran,
      status,
      tanggal_dari,
      tanggal_sampai,
      search,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (denominasi_id) where.denominasi_id = parseInt(denominasi_id, 10);
    if (tahun_anggaran) where.tahun_anggaran = parseInt(tahun_anggaran, 10);
    if (status) where.status = status;

    if (tanggal_dari || tanggal_sampai) {
      where.tanggal_kirim = {};
      if (tanggal_dari) where.tanggal_kirim.gte = new Date(tanggal_dari);
      if (tanggal_sampai) where.tanggal_kirim.lte = new Date(tanggal_sampai);
    }

    if (search) {
      where.OR = [
        { nomor_surat_jalan: { contains: search, mode: 'insensitive' } },
        { no_ba_penyerahan: { contains: search, mode: 'insensitive' } },
        { penyerah_nama: { contains: search, mode: 'insensitive' } },
        { penerima_nama: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.pengiriman.count({ where }),
      prisma.pengiriman.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ tanggal_kirim: 'desc' }, { id: 'desc' }],
        include: {
          denominasi: true,
          creator: { select: USER_SAFE_SELECT },
          approver: { select: USER_SAFE_SELECT },
          _count: { select: { details: true } },
        },
      }),
    ]);

    return successResponse(res, {
      message: 'Daftar pengiriman berhasil diambil.',
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal mengambil daftar pengiriman: ${err.message}`,
    });
  }
}

/**
 * Mengambil daftar doos yang siap dikirim (status READY)
 * GET /api/pengiriman/available-doos
 */
export async function getAvailableDoos(req, res) {
  try {
    const { denominasi_id, tahun_anggaran } = req.query;

    const where = {
      status: 'READY',
    };

    if (denominasi_id) where.denominasi_id = parseInt(denominasi_id, 10);
    if (tahun_anggaran) where.tahun_anggaran = parseInt(tahun_anggaran, 10);

    const items = await prisma.hasilKemas.findMany({
      where,
      orderBy: { no_doos_awal: 'asc' },
      include: {
        denominasi: true,
        batch: true,
        shift: true,
      },
    });

    let totalDoos = 0;
    let totalBilyet = 0n;
    let totalNominal = 0;

    for (const item of items) {
      totalDoos += item.total_doos;
      totalBilyet += BigInt(item.total_bilyet);
      totalNominal += Number(BigInt(item.total_bilyet) * BigInt(item.denominasi.nilai));
    }

    return successResponse(res, {
      message: 'Daftar doos siap kirim berhasil diambil.',
      data: items,
      meta: {
        total_items: items.length,
        total_doos: totalDoos,
        total_bilyet: totalBilyet.toString(),
        total_nominal: totalNominal,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal mengambil daftar doos siap kirim: ${err.message}`,
    });
  }
}

/**
 * Mengambil detail pengiriman berdasarkan ID
 * GET /api/pengiriman/:id
 */
export async function getPengirimanById(req, res) {
  try {
    const pengirimanId = parseInt(req.params.id, 10);
    if (isNaN(pengirimanId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID Pengiriman harus berupa angka.',
      });
    }

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: pengirimanId },
      include: {
        denominasi: {
          include: { emisi: true },
        },
        creator: { select: USER_SAFE_SELECT },
        approver: { select: USER_SAFE_SELECT },
        details: {
          include: {
            batch: {
              include: { emisi: true },
            },
            hasil_kemas: true,
          },
          orderBy: { no_doos_awal: 'asc' },
        },
      },
    });

    if (!pengiriman) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Pengiriman dengan ID ${pengirimanId} tidak ditemukan.`,
      });
    }

    return successResponse(res, {
      message: 'Detail pengiriman berhasil diambil.',
      data: pengiriman,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal mengambil detail pengiriman: ${err.message}`,
    });
  }
}

/**
 * Menyediakan data terstruktur untuk Cetak Dokumen Resmi Bank Indonesia
 * (Surat Jalan & Berita Acara Serah Terima BI)
 * GET /api/pengiriman/:id/dokumen-bi
 */
export async function getDokumenBi(req, res) {
  try {
    const pengirimanId = parseInt(req.params.id, 10);
    if (isNaN(pengirimanId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID Pengiriman harus berupa angka.',
      });
    }

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: pengirimanId },
      include: {
        denominasi: {
          include: { emisi: true },
        },
        creator: { select: USER_SAFE_SELECT },
        approver: { select: USER_SAFE_SELECT },
        details: {
          include: {
            batch: {
              include: { emisi: true },
            },
            hasil_kemas: true,
          },
          orderBy: { no_doos_awal: 'asc' },
        },
      },
    });

    if (!pengiriman) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Pengiriman dengan ID ${pengirimanId} tidak ditemukan.`,
      });
    }

    const nilaiNominalPecahan = pengiriman.denominasi.nilai;

    // Susun rincian kemasan tabel
    const tabelRincianKemasan = pengiriman.details.map((d, index) => {
      const bilyetCount = BigInt(d.jumlah_kemasan_doos) * 20000n;
      const nominalValue = Number(bilyetCount * BigInt(nilaiNominalPecahan));

      return {
        no: index + 1,
        id: d.id,
        hasil_kemas_id: d.hasil_kemas_id,
        nomor_batch: d.batch?.nomor_batch || '-',
        no_ba_pengemasan: d.no_ba_pengemasan || '-',
        tanggal_pengemasan: d.tanggal_pengemasan,
        tanggal_pengemasan_formatted: formatIndonesianDate(d.tanggal_pengemasan),
        no_doos_awal: d.no_doos_awal,
        no_doos_akhir: d.no_doos_akhir,
        rentang_doos: `Doos ${d.no_doos_awal}-${d.no_doos_akhir}`,
        jumlah_doos: d.jumlah_kemasan_doos,
        jumlah_bilyet: bilyetCount.toString(),
        jumlah_bilyet_formatted: formatNumber(bilyetCount),
        jumlah_nominal: nominalValue,
        jumlah_nominal_formatted: formatRupiah(nominalValue),
        keterangan: d.keterangan || 'UTAS',
      };
    });

    const dokumenPayload = {
      header: {
        instansi: 'PERUM PERCETAKAN UANG REPUBLIK INDONESIA (PERURI)',
        unit: 'DEPARTEMEN PRODUKSI UANG KERTAS',
        seksi: 'Seksi Khazanah Pengeluaran Akhir (Khazprokhir)',
        tujuan: pengiriman.tujuan,
        lokasi_penyerahan: pengiriman.lokasi_penyerahan,
        nomor_surat_jalan: pengiriman.nomor_surat_jalan,
        no_ba_penyerahan: pengiriman.no_ba_penyerahan || '-',
        tanggal_kirim: pengiriman.tanggal_kirim,
        tanggal_kirim_formatted: formatIndonesianDate(pengiriman.tanggal_kirim),
        status: pengiriman.status,
      },
      spesifikasi: {
        denominasi: formatRupiah(pengiriman.denominasi.nilai),
        kode_huruf: pengiriman.denominasi.nama,
        nilai_pecahan: nilaiNominalPecahan,
        sandi_emisi: pengiriman.sandi_emisi,
        tahun_anggaran: pengiriman.tahun_anggaran,
        rentang_doos: `Doos ${pengiriman.no_doos_awal} s/d ${pengiriman.no_doos_akhir}`,
        keterangan: pengiriman.keterangan,
        no_ba_pengemasan_rekap: pengiriman.no_ba_pengemasan_rekap || '-',
      },
      volume_dan_nominal: {
        total_doos: pengiriman.total_doos,
        total_doos_formatted: formatNumber(pengiriman.total_doos),
        total_doos_terbilang: `${terbilang(pengiriman.total_doos)} Doos`,
        total_bilyet: pengiriman.total_bilyet.toString(),
        total_bilyet_formatted: formatNumber(pengiriman.total_bilyet),
        total_bilyet_terbilang: `${terbilang(pengiriman.total_bilyet)} Bilyet`,
        total_nominal: Number(pengiriman.total_nominal),
        total_nominal_formatted: formatRupiah(pengiriman.total_nominal),
        total_nominal_terbilang: `${terbilang(pengiriman.total_nominal)} Rupiah`,
      },
      tabel_rincian_kemasan: tabelRincianKemasan,
      tanda_tangan: {
        pihak_pertama: {
          peran: 'Yang Menyerahkan',
          instansi: 'Perum Percetakan Uang RI',
          nama: pengiriman.penyerah_nama,
          jabatan: pengiriman.penyerah_jabatan,
        },
        pihak_kedua: {
          peran: 'Yang Menerima',
          instansi: 'Bank Indonesia',
          nama: pengiriman.penerima_nama || '-',
          jabatan: 'Petugas Kasir Khazanah Bank Indonesia',
        },
      },
      catatan: pengiriman.catatan || null,
    };

    return successResponse(res, {
      message: 'Data dokumen resmi Bank Indonesia berhasil dimuat.',
      data: dokumenPayload,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal memuat data dokumen Bank Indonesia: ${err.message}`,
    });
  }
}

/**
 * Memperbarui metadata pengiriman (catatan, nama penyerah, nomor BA, dll.)
 * PUT /api/pengiriman/:id
 */
export async function updatePengiriman(req, res) {
  try {
    const pengirimanId = parseInt(req.params.id, 10);
    if (isNaN(pengirimanId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID Pengiriman harus berupa angka.',
      });
    }

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: pengirimanId },
    });

    if (!pengiriman) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Pengiriman dengan ID ${pengirimanId} tidak ditemukan.`,
      });
    }

    const {
      no_ba_penyerahan,
      penyerah_nama,
      penyerah_jabatan,
      penerima_nama,
      tujuan,
      lokasi_penyerahan,
      catatan,
    } = req.body;

    const updated = await prisma.pengiriman.update({
      where: { id: pengirimanId },
      data: {
        no_ba_penyerahan: no_ba_penyerahan !== undefined ? no_ba_penyerahan : pengiriman.no_ba_penyerahan,
        penyerah_nama: penyerah_nama !== undefined ? penyerah_nama : pengiriman.penyerah_nama,
        penyerah_jabatan: penyerah_jabatan !== undefined ? penyerah_jabatan : pengiriman.penyerah_jabatan,
        penerima_nama: penerima_nama !== undefined ? penerima_nama : pengiriman.penerima_nama,
        tujuan: tujuan !== undefined ? tujuan : pengiriman.tujuan,
        lokasi_penyerahan: lokasi_penyerahan !== undefined ? lokasi_penyerahan : pengiriman.lokasi_penyerahan,
        catatan: catatan !== undefined ? catatan : pengiriman.catatan,
      },
      include: {
        denominasi: true,
        details: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      module: 'pengiriman',
      tableName: 'pengiriman',
      recordId: pengirimanId,
      oldValue: {
        no_ba_penyerahan: pengiriman.no_ba_penyerahan,
        penyerah_nama: pengiriman.penyerah_nama,
        penerima_nama: pengiriman.penerima_nama,
        catatan: pengiriman.catatan,
      },
      newValue: {
        no_ba_penyerahan: updated.no_ba_penyerahan,
        penyerah_nama: updated.penyerah_nama,
        penerima_nama: updated.penerima_nama,
        catatan: updated.catatan,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: 'Metadata pengiriman berhasil diperbarui.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal memperbarui pengiriman: ${err.message}`,
    });
  }
}

/**
 * Membatalkan pengiriman (Rollback status HasilKemas & PackDetail ke READY/PACKED)
 * Khusus Role SUPERVISOR
 * DELETE /api/pengiriman/:id
 */
export async function deletePengiriman(req, res) {
  try {
    const pengirimanId = parseInt(req.params.id, 10);
    if (isNaN(pengirimanId)) {
      return errorResponse(res, {
        status: 400,
        error: 'BadRequest',
        message: 'ID Pengiriman harus berupa angka.',
      });
    }

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: pengirimanId },
      include: {
        details: true,
        denominasi: true,
      },
    });

    if (!pengiriman) {
      return errorResponse(res, {
        status: 404,
        error: 'NotFound',
        message: `Pengiriman dengan ID ${pengirimanId} tidak ditemukan.`,
      });
    }

    const hasilKemasIds = pengiriman.details
      .map((d) => d.hasil_kemas_id)
      .filter((id) => id !== null && id !== undefined);

    // Eksekusi Rollback dalam Database Transaction
    await prisma.$transaction(async (tx) => {
      if (hasilKemasIds.length > 0) {
        // 1. Revert HasilKemas kembali ke READY
        await tx.hasilKemas.updateMany({
          where: { id: { in: hasilKemasIds } },
          data: { status: 'READY' },
        });

        // 2. Revert PackDetail kembali ke PACKED
        await tx.packDetail.updateMany({
          where: { hasil_kemas_id: { in: hasilKemasIds } },
          data: { status: 'PACKED' },
        });
      }

      // 3. Hapus record pengiriman (details cascade terhapus via onDelete: Cascade)
      await tx.pengiriman.delete({
        where: { id: pengirimanId },
      });
    });

    // 4. Catat Audit Log
    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'pengiriman',
      tableName: 'pengiriman',
      recordId: pengirimanId,
      oldValue: {
        nomor_surat_jalan: pengiriman.nomor_surat_jalan,
        denominasi_id: pengiriman.denominasi_id,
        tahun_anggaran: pengiriman.tahun_anggaran,
        rentang_doos: `Doos ${pengiriman.no_doos_awal}-${pengiriman.no_doos_akhir}`,
        total_doos: pengiriman.total_doos,
        total_nominal: pengiriman.total_nominal,
        hasil_kemas_ids: hasilKemasIds,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Pengiriman ${pengiriman.nomor_surat_jalan} berhasil dibatalkan dan seluruh status doos dikembalikan ke READY.`,
    });
  } catch (err) {
    return errorResponse(res, {
      status: 500,
      message: `Gagal membatalkan pengiriman: ${err.message}`,
    });
  }
}
