/**
 * Core Utilities: Konversi Satuan Uang Kertas Seksi Khazprokhir
 * 
 * Hierarki Satuan Fisik Uang Kertas:
 * - 1 Bilyet = 1 lembar fisik uang
 * - 1 Brood  = 1.000 bilyet
 * - 1 Pack   = 45 brood = 45.000 bilyet
 * - 1 Doos   = 20 brood = 20.000 bilyet
 * - 4 Pack   = 180 brood = 180.000 bilyet = 9 Doos Kemasan
 * - 1 Batch  = 100 pack = 4.500 brood = 4.500.000 bilyet = 225 Doos Kemasan
 */

export const SATUAN = {
  BILYET_PER_BROOD: 1_000,
  BROOD_PER_PACK: 45,
  BILYET_PER_PACK: 45_000,
  BROOD_PER_DOOS: 20,
  BILYET_PER_DOOS: 20_000,
  PACK_PER_BATCH: 100,
  DOOS_PER_BATCH: 225,
  BROOD_PER_BATCH: 4_500,
  BILYET_PER_BATCH: 4_500_000,
  // Rasio kemasan fisik: 4 Pack = 9 Doos
  PACK_RATIO_DOOS: 4,
  DOOS_RATIO_PACK: 9,
};

/**
 * Konversi Pack ke Brood (1 pack = 45 brood)
 * @param {number} packs 
 * @returns {number}
 */
export function packToBrood(packs) {
  const p = Number(packs);
  if (isNaN(p) || p < 0) throw new Error('Jumlah pack harus berupa angka non-negatif');
  return p * SATUAN.BROOD_PER_PACK;
}

/**
 * Konversi Pack ke Bilyet (1 pack = 45.000 bilyet)
 * Mendukung return BigInt jika input BigInt atau opsi bigInt: true
 * @param {number|bigint} packs 
 * @param {boolean} asBigInt 
 * @returns {number|bigint}
 */
export function packToBilyet(packs, asBigInt = false) {
  if (typeof packs === 'bigint' || asBigInt) {
    return BigInt(packs) * BigInt(SATUAN.BILYET_PER_PACK);
  }
  const p = Number(packs);
  if (isNaN(p) || p < 0) throw new Error('Jumlah pack harus berupa angka non-negatif');
  return p * SATUAN.BILYET_PER_PACK;
}

/**
 * Konversi Brood ke Bilyet (1 brood = 1.000 bilyet)
 * @param {number|bigint} broods 
 * @param {boolean} asBigInt 
 * @returns {number|bigint}
 */
export function broodToBilyet(broods, asBigInt = false) {
  if (typeof broods === 'bigint' || asBigInt) {
    return BigInt(broods) * BigInt(SATUAN.BILYET_PER_BROOD);
  }
  const b = Number(broods);
  if (isNaN(b) || b < 0) throw new Error('Jumlah brood harus berupa angka non-negatif');
  return b * SATUAN.BILYET_PER_BROOD;
}

/**
 * Konversi Bilyet ke Brood (1 brood = 1.000 bilyet)
 * @param {number|bigint} bilyet 
 * @returns {number}
 */
export function bilyetToBrood(bilyet) {
  const b = typeof bilyet === 'bigint' ? Number(bilyet) : Number(bilyet);
  if (isNaN(b) || b < 0) throw new Error('Jumlah bilyet harus berupa angka non-negatif');
  return Math.floor(b / SATUAN.BILYET_PER_BROOD);
}

/**
 * Konversi Doos ke Bilyet (1 doos = 20.000 bilyet)
 * @param {number|bigint} doos 
 * @param {boolean} asBigInt 
 * @returns {number|bigint}
 */
export function doosToBilyet(doos, asBigInt = false) {
  if (typeof doos === 'bigint' || asBigInt) {
    return BigInt(doos) * BigInt(SATUAN.BILYET_PER_DOOS);
  }
  const d = Number(doos);
  if (isNaN(d) || d < 0) throw new Error('Jumlah doos harus berupa angka non-negatif');
  return d * SATUAN.BILYET_PER_DOOS;
}

/**
 * Konversi Doos ke Brood (1 doos = 20 brood)
 * @param {number} doos 
 * @returns {number}
 */
export function doosToBrood(doos) {
  const d = Number(doos);
  if (isNaN(d) || d < 0) throw new Error('Jumlah doos harus berupa angka non-negatif');
  return d * SATUAN.BROOD_PER_DOOS;
}

/**
 * Kalkulasi jumlah Doos dari Pack berdasarkan rasio resmi (4 Pack = 9 Doos).
 * Jumlah pack WAJIB berkelipatan 4.
 * @param {number} packs 
 * @returns {number} Jumlah doos yang dihasilkan
 * @throws {Error} jika packs bukan kelipatan 4
 */
export function calculateDoosFromPack(packs) {
  const p = Number(packs);
  if (isNaN(p) || p <= 0) {
    throw new Error('Jumlah pack harus lebih besar dari 0');
  }
  if (p % SATUAN.PACK_RATIO_DOOS !== 0) {
    throw new Error(`Jumlah pack (${p}) harus merupakan kelipatan 4 untuk dikemas ke dalam doos`);
  }
  return (p / SATUAN.PACK_RATIO_DOOS) * SATUAN.DOOS_RATIO_PACK;
}

/**
 * Kalkulasi jumlah Pack dari Doos berdasarkan rasio resmi (9 Doos = 4 Pack).
 * @param {number} doos 
 * @returns {number}
 */
export function calculatePackFromDoos(doos) {
  const d = Number(doos);
  if (isNaN(d) || d <= 0) {
    throw new Error('Jumlah doos harus lebih besar dari 0');
  }
  if (d % SATUAN.DOOS_RATIO_PACK !== 0) {
    throw new Error(`Jumlah doos (${d}) harus merupakan kelipatan 9 untuk dikonversi ke pack`);
  }
  return (d / SATUAN.DOOS_RATIO_PACK) * SATUAN.PACK_RATIO_DOOS;
}

/**
 * Kalkulasi nilai nominal rupiah dari total bilyet dan nilai nominal satuan pecahan
 * @param {number|bigint} bilyet 
 * @param {number} nilaiPecahan (contoh: 100000, 50000)
 * @returns {number|bigint}
 */
export function calculateNominal(bilyet, nilaiPecahan) {
  const nilai = Number(nilaiPecahan);
  if (isNaN(nilai) || nilai <= 0) throw new Error('Nilai pecahan tidak valid');

  if (typeof bilyet === 'bigint') {
    return bilyet * BigInt(nilai);
  }
  return Number(bilyet) * nilai;
}

/**
 * Format angka ke mata uang Rupiah Indonesia (contoh: "Rp 100.000.000")
 * @param {number|bigint} amount 
 * @returns {string}
 */
export function formatRupiah(amount) {
  const val = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (isNaN(val)) return 'Rp 0';
  return 'Rp ' + val.toLocaleString('id-ID');
}

/**
 * Format angka dengan pemisah ribuan titik (contoh: "1.000.000")
 * @param {number|bigint} num 
 * @returns {string}
 */
export function formatNumber(num) {
  const val = typeof num === 'bigint' ? Number(num) : Number(num);
  if (isNaN(val)) return '0';
  return val.toLocaleString('id-ID');
}
