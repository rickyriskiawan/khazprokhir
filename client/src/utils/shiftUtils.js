/**
 * shiftUtils.js - Utilitas Perhitungan Jam Kerja & Shift Khazanah Produk Akhir
 * 
 * Standar Operasional Khazprokhir:
 * - Shift 1: 07:30 - 16:00 WIB
 * - Shift 2: 15:30 - 23:30 WIB
 * - Shift 3: 23:00 - 07:00 WIB (Cadangan / Kondisional)
 * - Periode Peralihan (Handover): 30 Menit overlap
 */

export const DEFAULT_SHIFTS = [
  { id: 1, nama: 'Shift 1', jam_mulai: '07:30', jam_selesai: '16:00', is_active: true },
  { id: 2, nama: 'Shift 2', jam_mulai: '15:30', jam_selesai: '23:30', is_active: true },
  { id: 3, nama: 'Shift 3', jam_mulai: '23:00', jam_selesai: '07:00', is_active: false },
];

/**
 * Mengonversi format "HH:mm" atau "HH:mm:ss" menjadi total menit dari jam 00:00 (0 - 1439).
 * @param {string} timeStr - Contoh: "07:30"
 * @returns {number} Menit dari tengah malam
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((val) => parseInt(val, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Memeriksa apakah waktu tertentu berada dalam rentang jam mulai s/d jam selesai.
 * Mendukung rentang shift lintas tengah malam (misal 23:00 s/d 07:00).
 * @param {string} currentTimeStr - "HH:mm"
 * @param {string} startStr - "HH:mm"
 * @param {string} endStr - "HH:mm"
 * @returns {boolean}
 */
export function isTimeInShift(currentTimeStr, startStr, endStr) {
  const current = timeToMinutes(currentTimeStr);
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);

  if (start <= end) {
    return current >= start && current <= end;
  }
  // Lintas tengah malam (overnight shift)
  return current >= start || current <= end;
}

/**
 * Mengekstrak string "HH:mm" dari objek Date atau string.
 * @param {Date|string} dateOrTime 
 * @returns {string} "HH:mm"
 */
function extractHHMM(dateOrTime) {
  if (typeof dateOrTime === 'string' && dateOrTime.includes(':')) {
    const parts = dateOrTime.trim().split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  const d = dateOrTime instanceof Date ? dateOrTime : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Menentukan status shift aktif dan status peralihan (handover).
 * @param {Date|string} [currentTime] - Waktu yang ingin dicek (default: saat ini)
 * @param {Array} [shifts] - Daftar shift (default: DEFAULT_SHIFTS)
 * @returns {Object} Info shift
 */
export function getCurrentShiftInfo(currentTime = new Date(), shifts = DEFAULT_SHIFTS) {
  const timeStr = extractHHMM(currentTime);
  const activeConfiguredShifts = (shifts || DEFAULT_SHIFTS).filter((s) => s.is_active !== false);

  const matchedShifts = activeConfiguredShifts.filter((s) =>
    isTimeInShift(timeStr, s.jam_mulai, s.jam_selesai)
  );

  // Jika terjadi tumpang tindih 2 shift (periode handover)
  if (matchedShifts.length > 1) {
    const names = matchedShifts.map((s) => s.nama.replace('Shift ', '')).join(' & ');
    return {
      activeShift: matchedShifts[matchedShifts.length - 1], // shift berikutnya yang sedang mengambil alih
      handoverFrom: matchedShifts[0],
      isHandover: true,
      label: `Peralihan Shift ${names}`,
      activeShifts: matchedShifts,
      timeStr,
    };
  }

  // Jika tepat 1 shift aktif
  if (matchedShifts.length === 1) {
    const shift = matchedShifts[0];
    return {
      activeShift: shift,
      handoverFrom: null,
      isHandover: false,
      label: `${shift.nama} (${shift.jam_mulai} - ${shift.jam_selesai})`,
      activeShifts: matchedShifts,
      timeStr,
    };
  }

  // Jika berada di luar jam operasional
  return {
    activeShift: null,
    handoverFrom: null,
    isHandover: false,
    label: 'Di Luar Jam Operasional',
    activeShifts: [],
    timeStr,
  };
}

/**
 * Convenience helper untuk mengambil objek shift aktif langsung.
 * @param {Array} [shifts]
 * @param {Date|string} [currentTime]
 * @returns {Object|null}
 */
export function getCurrentShift(shifts = DEFAULT_SHIFTS, currentTime = new Date()) {
  return getCurrentShiftInfo(currentTime, shifts)?.activeShift || null;
}

/**
 * Format live clock dengan zona waktu WIB (HH:mm:ss WIB).
 * @param {Date} date
 * @returns {string}
 */
export function formatLiveClock(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Mendapatkan class Tailwind badge untuk penanda visual shift.
 * @param {string|null} shiftName 
 * @param {boolean} isHandover 
 * @returns {string}
 */
export function getShiftBadgeStyle(shiftName, isHandover = false) {
  if (isHandover) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
  }
  if (!shiftName) {
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
  }

  if (shiftName.includes('1')) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
  }
  if (shiftName.includes('2')) {
    return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800';
  }
  if (shiftName.includes('3')) {
    return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800';
  }

  return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
}

