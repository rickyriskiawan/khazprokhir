import api from './api';

/**
 * Mengambil daftar bon masuk dengan filter dan pagination
 * @param {Object} params - { page, limit, no_segel, tanggal_masuk, startDate, endDate, batch_id, shift_id, denominasi_id, search, tahun_anggaran }
 */
export async function getBonMasukList(params = {}) {
  const response = await api.get('/bon-masuk', { params });
  return response.data || { data: [], meta: {} };
}

/**
 * Mengambil detail bon masuk berdasarkan ID
 * @param {number|string} id
 */
export async function getBonMasukById(id) {
  const response = await api.get(`/bon-masuk/${id}`);
  return response.data?.data || null;
}

/**
 * Mencatat penerimaan bon masuk baru
 * @param {Object} data
 */
export async function createBonMasuk(data) {
  const response = await api.post('/bon-masuk', data);
  return response.data?.data || null;
}

/**
 * Memperbarui / full edit data bon masuk
 * @param {number|string} id
 * @param {Object} data
 */
export async function updateBonMasuk(id, data) {
  const response = await api.put(`/bon-masuk/${id}`, data);
  return response.data?.data || null;
}

/**
 * Menghapus / membatalkan bon masuk
 * @param {number|string} id
 */
export async function deleteBonMasuk(id) {
  const response = await api.delete(`/bon-masuk/${id}`);
  return response.data || null;
}

/**
 * Mengambil ringkasan penerimaan harian
 * @param {string} [tanggal] - Format YYYY-MM-DD
 */
export async function getTodayBonMasukSummary(tanggal) {
  const params = tanggal ? { tanggal } : {};
  const response = await api.get('/bon-masuk/summary/today', { params });
  return response.data?.data || null;
}

/**
 * Mengambil daftar batch produksi yang terdaftar
 * @param {Object} [params]
 */
export async function getBatches(params = {}) {
  const response = await api.get('/batches', { params });
  return response.data?.data || [];
}

/**
 * Mendaftarkan batch produksi baru secara independen
 * @param {Object} data - { nomor_batch, tahun_anggaran, seri, kepala, emisi_id }
 */
export async function createBatch(data) {
  const response = await api.post('/batches', data);
  return response.data?.data || null;
}

/**
 * Mengambil master data denominasi uang kertas
 */
export async function getMasterDenominasi() {
  const response = await api.get('/master/denominasi');
  return response.data?.data || [];
}

/**
 * Mengambil master data emisi uang kertas
 */
export async function getMasterEmisi() {
  const response = await api.get('/master/emisi');
  return response.data?.data || [];
}

/**
 * Mengambil master data shift kerja
 */
export async function getMasterShift() {
  const response = await api.get('/master/shift');
  return response.data?.data || [];
}
