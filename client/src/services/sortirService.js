import api from './api';

/**
 * Mengurai input nomor pack (bisa berupa array nomor, string koma, atau string rentang)
 * menjadi array angka unik terurut.
 * @param {number[]|string} input
 * @returns {number[]}
 */
export function parsePackNumbers(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return [...new Set(input.map(Number))].filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  }
  if (typeof input === 'string') {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    const result = new Set();
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) result.add(i);
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num > 0) result.add(num);
      }
    }
    return [...result].sort((a, b) => a - b);
  }
  return [];
}

/**
 * Mengelompokkan nomor-nomor pack menjadi rentang berurutan.
 * Contoh: [1,2,3,4, 13,14,15,16] -> [{ start: 1, end: 4 }, { start: 13, end: 16 }]
 * @param {number[]|string} packNumbers
 * @returns {{ start: number, end: number }[]}
 */
export function extractPackRanges(packNumbers) {
  const numbers = parsePackNumbers(packNumbers);
  if (numbers.length === 0) return [];

  const ranges = [];
  let currentStart = numbers[0];
  let currentEnd = numbers[0];

  for (let i = 1; i < numbers.length; i++) {
    const num = numbers[i];
    if (num === currentEnd + 1) {
      currentEnd = num;
    } else {
      ranges.push({ start: currentStart, end: currentEnd });
      currentStart = num;
      currentEnd = num;
    }
  }
  ranges.push({ start: currentStart, end: currentEnd });

  return ranges;
}

/**
 * Memformat nomor pack menjadi string rentang kompak.
 * Contoh: [1,2,3,4, 13,14,15,16] -> "Pack 01–04, 13–16"
 * @param {number[]|string} packNumbers
 * @returns {string}
 */
export function formatPackRanges(packNumbers) {
  const ranges = extractPackRanges(packNumbers);
  if (ranges.length === 0) return '-';

  const rangeStrings = ranges.map((r) => {
    const startStr = String(r.start).padStart(2, '0');
    if (r.start === r.end) {
      return startStr;
    }
    const endStr = String(r.end).padStart(2, '0');
    return `${startStr}–${endStr}`;
  });

  return `Pack ${rangeStrings.join(', ')}`;
}

/**
 * Memformat rentang nomor pack dengan pembatasan jumlah grup yang ditampilkan.
 * Jika grup rentang melebihi maxRangesToShow, kembalikan teks ringkas + indikator sisa grup.
 * @param {number[]|string} packNumbers
 * @param {number} maxRangesToShow
 * @returns {{ display: string, full: string, remainingGroups: number, isTruncated: boolean, totalPacks: number }}
 */
export function formatCompactPackRanges(packNumbers, maxRangesToShow = 2) {
  const numbers = parsePackNumbers(packNumbers);
  const ranges = extractPackRanges(numbers);

  if (ranges.length === 0) {
    return {
      display: '-',
      full: '-',
      remainingGroups: 0,
      isTruncated: false,
      totalPacks: 0,
    };
  }

  const rangeStrings = ranges.map((r) => {
    const startStr = String(r.start).padStart(2, '0');
    if (r.start === r.end) return startStr;
    const endStr = String(r.end).padStart(2, '0');
    return `${startStr}–${endStr}`;
  });

  const full = `Pack ${rangeStrings.join(', ')}`;
  const isTruncated = ranges.length > maxRangesToShow;
  const displayedRanges = rangeStrings.slice(0, maxRangesToShow);
  const display = `Pack ${displayedRanges.join(', ')}`;
  const remainingGroups = Math.max(0, ranges.length - maxRangesToShow);

  return {
    display,
    full,
    remainingGroups,
    isTruncated,
    totalPacks: numbers.length,
  };
}

/**
 * Mengambil daftar sesi sortir dengan filter dan pagination
 * @param {Object} params - { page, limit, batch_id, shift_id, status, tanggal_sortir, penyortir, search }
 */
export async function getSortirList(params = {}) {
  const response = await api.get('/sortir', { params });
  return response.data || { data: [], meta: {} };
}

/**
 * Mengambil detail lengkap sesi sortir berdasar ID
 * @param {number|string} id
 */
export async function getSortirById(id) {
  const response = await api.get(`/sortir/${id}`);
  return response.data?.data || null;
}

/**
 * Mencatat hasil sesi sortir baru (Direct Completion - ADR 0007)
 * @param {Object} data
 */
export async function createSortir(data) {
  const response = await api.post('/sortir', data);
  return response.data?.data || null;
}

/**
 * Memperbarui metadata sesi sortir
 * @param {number|string} id
 * @param {Object} data
 */
export async function updateSortir(id, data) {
  const response = await api.put(`/sortir/${id}`, data);
  return response.data?.data || null;
}

/**
 * Membatalkan sesi sortir (khusus SUPERVISOR / ADMIN)
 * @param {number|string} id
 */
export async function deleteSortir(id) {
  const response = await api.delete(`/sortir/${id}`);
  return response.data || null;
}

/**
 * Mengambil daftar pack yang berstatus RECEIVED pada batch tertentu
 * @param {number|string} batchId
 */
export async function getAvailablePacks(batchId) {
  const response = await api.get(`/sortir/available-packs/${batchId}`);
  return response.data?.data || null;
}

/**
 * Mengambil ringkasan capaian sortir hari ini
 * @param {string} [tanggal] - Format YYYY-MM-DD
 */
export async function getTodaySortirSummary(tanggal) {
  const params = tanggal ? { tanggal } : {};
  const response = await api.get('/sortir/summary/today', { params });
  return response.data?.data || null;
}

/**
 * Mengambil daftar shift aktif
 */
export async function getActiveShifts() {
  const response = await api.get('/master/shift');
  return response.data?.data || [];
}
