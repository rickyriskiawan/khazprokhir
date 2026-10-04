import api from './api';

/**
 * Mengambil daftar hasil kemas (pengemasan doos) dengan filter & pagination.
 * @param {Object} params - { page, limit, batch_id, shift_id, status, tanggal_dari, tanggal_sampai, search }
 */
export async function getKemasList(params = {}) {
  const response = await api.get('/kemas', { params });
  return response.data || { data: [], meta: {} };
}

/**
 * Mengambil detail hasil kemas berdasarkan ID.
 * @param {number|string} id
 */
export async function getKemasById(id) {
  const response = await api.get(`/kemas/${id}`);
  return response.data?.data || null;
}

/**
 * Mengambil daftar sesi sortir yang siap dikemas (sumber grid 10x10 pada form).
 * @param {Object} params - { search, shift_id, tanggal_dari, tanggal_sampai, page, limit }
 */
export async function getSesiSiapKemas(params = {}) {
  const response = await api.get('/kemas/sesi-siap-kemas', { params });
  return response.data || { data: [], meta: {} };
}

/**
 * Ringkasan KPI pengemasan (siap kemas vs hasil kemas) mengikuti filter bar.
 * @param {Object} params - { shift_id, tanggal_dari, tanggal_sampai, search }
 */
export async function getKemasSummary(params = {}) {
  const response = await api.get('/kemas/summary', { params });
  return response.data?.data || null;
}

/**
 * Mencatat hasil pengemasan doos baru (berbasis sesi sortir).
 * @param {Object} data - { proses_sortir_id, shift_id, tanggal_kemas, no_doos_awal, no_doos_akhir, catatan }
 */
export async function createKemas(data) {
  const response = await api.post('/kemas', data);
  return response.data?.data || null;
}

/**
 * Memperbarui metadata hasil kemas.
 * @param {number|string} id
 * @param {Object} data
 */
export async function updateKemas(id, data) {
  const response = await api.put(`/kemas/${id}`, data);
  return response.data?.data || null;
}

/**
 * Menyelesaikan realisasi fisik pengemasan (SIAP_KEMAS -> READY).
 * @param {number|string} id
 * @param {Object} data
 */
export async function completeKemas(id, data) {
  const response = await api.post(`/kemas/${id}/complete`, data);
  return response.data?.data || null;
}

/**
 * Membatalkan hasil kemas (khusus SUPERVISOR/ADMIN).
 * @param {number|string} id
 */
export async function deleteKemas(id) {
  const response = await api.delete(`/kemas/${id}`);
  return response.data || null;
}

/**
 * Mengambil rekomendasi nomor doos awal berikutnya.
 * @param {Object} params - { batch_id } atau { denominasi_id, tahun_anggaran }
 */
export async function getNextDoosNumber(params = {}) {
  const response = await api.get('/kemas/next-doos-number', { params });
  return response.data?.data || null;
}

/**
 * Mengambil daftar shift (master).
 */
export async function getActiveShifts() {
  const response = await api.get('/master/shift');
  return response.data?.data || [];
}

/**
 * Menghitung jumlah doos dari total pack (rasio resmi 4 Pack = 9 Doos).
 * @param {number} packs
 * @returns {number}
 */
export function calculateDoosFromPack(packs) {
  const p = Number(packs);
  if (!Number.isFinite(p) || p <= 0 || p % 4 !== 0) return 0;
  return (p / 4) * 9;
}
