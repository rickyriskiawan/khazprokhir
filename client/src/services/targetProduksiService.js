import api from './api';

/**
 * Menghitung jumlah Doos dengan pembulatan ke atas (1 Doos = 20.000 Bilyet).
 * Sisa bilyet ("buntut") di bawah 20.000 tetap dihitung sebagai 1 Doos.
 * @param {string|number|bigint} bilyetValue
 * @returns {number}
 */
export function calculateDoosCeiling(bilyetValue) {
  try {
    const clean = String(bilyetValue ?? '0').replace(/\D/g, '');
    if (!clean) return 0;
    const b = BigInt(clean);
    if (b <= 0n) return 0;
    return Number((b + 19999n) / 20000n);
  } catch {
    return 0;
  }
}

/**
 * Mengambil daftar Target Produksi beserta pengelompokan Tahun Anggaran -> Tahun Emisi.
 * @param {Object} params - { tahun_anggaran, tahun_emisi, denominasi_id }
 */
export async function getTargetProduksiList(params = {}) {
  const response = await api.get('/target-tahunan', { params });
  return response.data || { data: [], meta: { grouped: [] } };
}

/**
 * Mengambil daftar Master Denominasi aktif (Y s/d S).
 */
export async function getMasterDenominasi() {
  const response = await api.get('/master/denominasi', {
    params: { is_active: true },
  });
  return response.data?.data || [];
}

/**
 * Mengambil daftar Master Emisi aktif.
 */
export async function getMasterEmisi() {
  const response = await api.get('/master/emisi', {
    params: { is_active: true },
  });
  return response.data?.data || [];
}

/**
 * Membuat grup Target Produksi baru untuk pasangan (tahun_anggaran, tahun_emisi) (7 pecahan sekaligus).
 * @param {Object} payload - { tahun_anggaran, tahun_emisi, catatan, items: [{ denominasi_id, target_bilyet }] }
 */
export async function createTargetProduksiGroup(payload) {
  const response = await api.post('/target-tahunan', payload);
  return response.data?.data || null;
}

/**
 * Memperbarui grup Target Produksi untuk pasangan (tahun_anggaran, tahun_emisi).
 * @param {number} tahunAnggaran
 * @param {number} tahunEmisi
 * @param {Object} payload - { catatan, items: [{ denominasi_id, target_bilyet }] }
 */
export async function updateTargetProduksiGroup(tahunAnggaran, tahunEmisi, payload) {
  const response = await api.put(
    `/target-tahunan/group/${tahunAnggaran}/${tahunEmisi}`,
    payload
  );
  return response.data?.data || null;
}

/**
 * Menghapus grup Target Produksi untuk pasangan (tahun_anggaran, tahun_emisi).
 * @param {number} tahunAnggaran
 * @param {number} tahunEmisi
 */
export async function deleteTargetProduksiGroup(tahunAnggaran, tahunEmisi) {
  const response = await api.delete(
    `/target-tahunan/group/${tahunAnggaran}/${tahunEmisi}`
  );
  return response.data || null;
}
