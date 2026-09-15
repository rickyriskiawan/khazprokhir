import { SATUAN } from './converter.js';

/**
 * Aturan Bisnis & Validasi Operasional Khazprokhir
 */

/**
 * Memvalidasi apakah jumlah pack merupakan kelipatan 4
 * Aturan bisnis: Sortir dan kemas WAJIB kelipatan 4 pack agar menghasilkan jumlah doos bulat.
 * @param {number} totalPack 
 * @returns {boolean}
 */
export function isKelipatanEmpat(totalPack) {
  const p = Number(totalPack);
  return Number.isInteger(p) && p > 0 && p % SATUAN.PACK_RATIO_DOOS === 0;
}

/**
 * Validasi rentang nomor pack dalam 1 batch (1 s/d 100)
 * @param {number} packDari 
 * @param {number} packSampai 
 * @returns {{ valid: boolean, message?: string, totalPack: number }}
 */
export function validatePackRange(packDari, packSampai) {
  const dari = Number(packDari);
  const sampai = Number(packSampai);

  if (!Number.isInteger(dari) || !Number.isInteger(sampai)) {
    return { valid: false, message: 'Nomor pack awal dan akhir harus berupa bilangan bulat', totalPack: 0 };
  }

  if (dari < 1 || sampai > SATUAN.PACK_PER_BATCH) {
    return { 
      valid: false, 
      message: `Nomor pack harus berada dalam rentang 1 s/d ${SATUAN.PACK_PER_BATCH}`, 
      totalPack: 0 
    };
  }

  if (dari > sampai) {
    return { 
      valid: false, 
      message: `Nomor pack awal (${dari}) tidak boleh lebih besar dari pack akhir (${sampai})`, 
      totalPack: 0 
    };
  }

  const totalPack = sampai - dari + 1;
  return { valid: true, totalPack };
}

/**
 * Validasi konsistensi rasio antara total pack dan total doos kemasan (4 Pack = 9 Doos)
 * @param {number} totalPack 
 * @param {number} totalDoos 
 * @returns {{ valid: boolean, message?: string, expectedDoos: number }}
 */
export function validateDoosRatio(totalPack, totalDoos) {
  const p = Number(totalPack);
  const d = Number(totalDoos);

  if (!isKelipatanEmpat(p)) {
    return {
      valid: false,
      message: `Total pack (${p}) bukan kelipatan 4. Pengemasan doos wajib menggunakan kelipatan 4 pack.`,
      expectedDoos: 0,
    };
  }

  const expectedDoos = (p / SATUAN.PACK_RATIO_DOOS) * SATUAN.DOOS_RATIO_PACK;
  if (d !== expectedDoos) {
    return {
      valid: false,
      message: `Jumlah doos (${d}) tidak sesuai rasio resmi (4 Pack = 9 Doos). Harusnya ${expectedDoos} doos.`,
      expectedDoos,
    };
  }

  return { valid: true, expectedDoos };
}

/**
 * Validasi rentang nomor doos awal dan akhir
 * @param {number} doosAwal 
 * @param {number} doosAkhir 
 * @param {number} totalDoos 
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateDoosRange(doosAwal, doosAkhir, totalDoos) {
  const awal = Number(doosAwal);
  const akhir = Number(doosAkhir);
  const total = Number(totalDoos);

  if (!Number.isInteger(awal) || !Number.isInteger(akhir) || awal <= 0 || akhir <= 0) {
    return { valid: false, message: 'Nomor doos awal dan akhir harus berupa bilangan bulat positif' };
  }

  if (awal > akhir) {
    return { valid: false, message: `Nomor doos awal (${awal}) tidak boleh lebih besar dari nomor doos akhir (${akhir})` };
  }

  const rentang = akhir - awal + 1;
  if (rentang !== total) {
    return { 
      valid: false, 
      message: `Rentang doos (${awal} s/d ${akhir} = ${rentang} doos) tidak cocok dengan total doos yang dihitung (${total} doos)` 
    };
  }

  return { valid: true };
}

/**
 * Mendeteksi celah (gap) angka yang terlewat dalam sebuah daftar nomor berurutan
 * Misal untuk mendeteksi gap nomor doos atau gap nomor pack
 * @param {number[]} numbers Daftar angka yang akan diperiksa
 * @returns {number[]} Daftar nomor yang hilang/terlewat (jika tidak ada gap, return [])
 */
export function detectGaps(numbers) {
  if (!Array.isArray(numbers) || numbers.length <= 1) return [];

  const sorted = [...new Set(numbers.map(Number))].sort((a, b) => a - b);
  const gaps = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (next - current > 1) {
      for (let missing = current + 1; missing < next; missing++) {
        gaps.push(missing);
      }
    }
  }

  return gaps;
}

/**
 * Memeriksa apakah daftar nomor sepenuhnya berurutan tanpa jeda/gap
 * @param {number[]} numbers 
 * @returns {boolean}
 */
export function isConsecutive(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return false;
  if (numbers.length === 1) return true;

  const sorted = [...numbers].map(Number).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) return false;
  }
  return true;
}

/**
 * Memeriksa safety locking pada sesi sortir.
 * Sesi sortir terkunci jika:
 * 1. Sudah terhubung dengan data hasil kemas doos (tabel hasil_kemas), ATAU
 * 2. Terdapat pack di dalamnya yang sudah berstatus PACKED atau SHIPPED.
 *
 * @param {object} session Record proses_sortir yang menyertakan hasil_kemas dan sortir_pack_details.pack_detail
 * @param {string} [actionLabel='diubah atau dibatalkan'] Tindakan yang sedang dicoba (misal: 'diperbarui', 'dibatalkan')
 * @returns {{ isLocked: boolean, message?: string }}
 */
export function checkSortirSafetyLock(session, actionLabel = 'diubah atau dibatalkan') {
  if (!session) return { isLocked: false };

  if (session.hasil_kemas && session.hasil_kemas.length > 0) {
    return {
      isLocked: true,
      message: `Sesi sortir terkunci: Tidak dapat ${actionLabel} karena pack telah terhubung dengan data hasil kemas doos. Batalkan proses pengemasan terlebih dahulu.`,
    };
  }

  const hasPackedPacks = session.sortir_pack_details?.some(
    (spd) => spd.pack_detail?.status === 'PACKED' || spd.pack_detail?.status === 'SHIPPED'
  );

  if (hasPackedPacks) {
    return {
      isLocked: true,
      message: `Sesi sortir terkunci: Tidak dapat ${actionLabel} karena sebagian atau seluruh pack telah berstatus PACKED atau SHIPPED.`,
    };
  }

  return { isLocked: false };
}

/**
 * Memeriksa safety locking pada data hasil kemas doos.
 * Hasil kemas terkunci jika:
 * 1. Status hasil kemas sudah SHIPPED, ATAU
 * 2. Sudah terhubung dengan data pengiriman ke Bank Indonesia (tabel pengiriman_details), ATAU
 * 3. Terdapat pack di dalamnya yang sudah berstatus SHIPPED.
 *
 * @param {object} session Record hasil_kemas yang menyertakan pengiriman_details dan kemas_pack_details.pack_detail
 * @param {string} [actionLabel='diubah atau dibatalkan'] Tindakan yang sedang dicoba (misal: 'diperbarui', 'dibatalkan')
 * @returns {{ isLocked: boolean, message?: string }}
 */
export function checkKemasSafetyLock(session, actionLabel = 'diubah atau dibatalkan') {
  if (!session) return { isLocked: false };

  if (session.status === 'SHIPPED') {
    return {
      isLocked: true,
      message: `Hasil kemas terkunci: Tidak dapat ${actionLabel} karena doos sudah dalam status SHIPPED (telah dikirim ke Bank Indonesia).`,
    };
  }

  if (session.pengiriman_details && session.pengiriman_details.length > 0) {
    return {
      isLocked: true,
      message: `Hasil kemas terkunci: Tidak dapat ${actionLabel} karena doos telah terhubung dengan data pengiriman ke Bank Indonesia. Batalkan pengiriman terlebih dahulu.`,
    };
  }

  const hasShippedPacks = session.kemas_pack_details?.some(
    (kpd) => kpd.pack_detail?.status === 'SHIPPED'
  );

  if (hasShippedPacks) {
    return {
      isLocked: true,
      message: `Hasil kemas terkunci: Tidak dapat ${actionLabel} karena pack di dalamnya telah berstatus SHIPPED.`,
    };
  }

  return { isLocked: false };
}

/**
 * Memformat daftar nomor doos menjadi rentang string yang mudah dibaca
 * Contoh: [1, 2, 3, 5, 7, 8, 9] -> ["Doos 1-3", "Doos 5", "Doos 7-9"]
 * @param {number[]} numbers 
 * @returns {string[]}
 */
export function formatDoosRanges(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return [];

  const sorted = [...new Set(numbers.map(Number))].filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (start === prev) {
        ranges.push(`Doos ${start}`);
      } else {
        ranges.push(`Doos ${start}-${prev}`);
      }
      start = current;
      prev = current;
    }
  }

  return ranges;
}

/**
 * Memvalidasi daftar hasil kemas yang akan dikirim ke Bank Indonesia
 * Persyaratan:
 * 1. hasilKemasList tidak boleh kosong
 * 2. Seluruh doos harus memiliki denominasi_id dan tahun_anggaran yang cocok
 * 3. Seluruh doos harus berstatus READY (bukan SIAP_KEMAS atau SHIPPED)
 * 4. Nomor doos tidak boleh tumpang tindih (overlap)
 * 5. Nomor doos harus berurutan secara kontinyu tanpa celah (no gap)
 * 
 * @param {Array<object>} hasilKemasList Daftar record HasilKemas
 * @param {number} [denominasiId] ID Denominasi target
 * @param {number} [tahunAnggaran] Tahun anggaran target
 * @returns {{ valid: boolean, error?: string, message?: string, sorted?: Array<object>, minDoos?: number, maxDoos?: number, totalDoos?: number, totalBilyet?: bigint, totalNominal?: number, baRekap?: string }}
 */
export function validatePengirimanDoos(hasilKemasList, denominasiId, tahunAnggaran) {
  if (!Array.isArray(hasilKemasList) || hasilKemasList.length === 0) {
    return {
      valid: false,
      error: 'EmptyHasilKemasList',
      message: 'Daftar hasil kemas untuk pengiriman tidak boleh kosong.',
    };
  }

  const dId = denominasiId ? Number(denominasiId) : null;
  const ta = tahunAnggaran ? Number(tahunAnggaran) : null;

  // 1. Periksa keseragaman denominasi, tahun anggaran, dan status READY
  for (const item of hasilKemasList) {
    if (dId && item.denominasi_id !== dId) {
      return {
        valid: false,
        error: 'DenominasiMismatch',
        message: `Terdapat hasil kemas (ID ${item.id}) dengan denominasi berbeda (${item.denominasi_id} vs ${dId}).`,
      };
    }
    if (ta && item.tahun_anggaran !== ta) {
      return {
        valid: false,
        error: 'TahunAnggaranMismatch',
        message: `Terdapat hasil kemas (ID ${item.id}) dengan tahun anggaran berbeda (${item.tahun_anggaran} vs ${ta}).`,
      };
    }
    if (item.status === 'SIAP_KEMAS') {
      return {
        valid: false,
        error: 'HasilKemasNotReady',
        message: `Hasil kemas (ID ${item.id}, Doos ${item.no_doos_awal}-${item.no_doos_akhir}) masih berstatus SIAP_KEMAS dan belum siap dikirim. Selesaikan proses kemas fisik terlebih dahulu.`,
      };
    }
    if (item.status === 'SHIPPED') {
      return {
        valid: false,
        error: 'HasilKemasAlreadyShipped',
        message: `Hasil kemas (ID ${item.id}, Doos ${item.no_doos_awal}-${item.no_doos_akhir}) sudah pernah dikirim ke Bank Indonesia.`,
      };
    }
    if (item.status !== 'READY') {
      return {
        valid: false,
        error: 'InvalidStatusKemas',
        message: `Hasil kemas (ID ${item.id}) memiliki status tidak valid: ${item.status}. Hanya status READY yang dapat dikirim.`,
      };
    }
  }

  // 2. Urutkan berdasarkan no_doos_awal
  const sorted = [...hasilKemasList].sort((a, b) => a.no_doos_awal - b.no_doos_awal);

  // 3. Periksa kontinuitas (tanpa overlap dan tanpa gap)
  let totalDoosSum = 0;
  let totalBilyetSum = 0n;
  let totalNominalSum = 0;
  const baList = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const rangeCount = current.no_doos_akhir - current.no_doos_awal + 1;
    if (rangeCount !== current.total_doos) {
      return {
        valid: false,
        error: 'InvalidDoosRange',
        message: `Rentang doos ${current.no_doos_awal}-${current.no_doos_akhir} (${rangeCount} doos) tidak cocok dengan total doos tercatat (${current.total_doos}) pada ID ${current.id}.`,
      };
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      // Cek overlap
      if (current.no_doos_awal <= prev.no_doos_akhir) {
        return {
          valid: false,
          error: 'DoosOverlapDetected',
          message: `Tumpang tindih (overlap) nomor doos terdeteksi antara Doos ${prev.no_doos_awal}-${prev.no_doos_akhir} dan Doos ${current.no_doos_awal}-${current.no_doos_akhir}.`,
        };
      }
      // Cek gap
      if (current.no_doos_awal > prev.no_doos_akhir + 1) {
        return {
          valid: false,
          error: 'DoosGapDetected',
          message: `Celah (gap) nomor doos terdeteksi antara Doos ${prev.no_doos_akhir} dan Doos ${current.no_doos_awal}. Pengiriman ke BI harus berurutan tanpa ada doos yang terlewat.`,
        };
      }
    }

    totalDoosSum += current.total_doos;
    totalBilyetSum += BigInt(current.total_bilyet);
    totalNominalSum += Number(current.total_nominal || 0);
    if (current.no_ba_pengemasan && !baList.includes(current.no_ba_pengemasan)) {
      baList.push(current.no_ba_pengemasan);
    }
  }

  const minDoos = sorted[0].no_doos_awal;
  const maxDoos = sorted[sorted.length - 1].no_doos_akhir;

  return {
    valid: true,
    sorted,
    minDoos,
    maxDoos,
    totalDoos: totalDoosSum,
    totalBilyet: totalBilyetSum,
    totalNominal: totalNominalSum,
    baRekap: baList.join(', '),
  };
}
