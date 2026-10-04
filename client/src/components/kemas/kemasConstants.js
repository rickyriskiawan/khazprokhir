// Konfigurasi status pengemasan doos (Modul 3)
export const KEMAS_STATUS_CONFIG = {
  SIAP_KEMAS: {
    label: 'Siap Kemas',
    badgeVariant: 'amber',
    dotClass: 'bg-amber-500',
    description: 'Antrian WIP — doos sudah dibooking, menunggu konfirmasi realisasi fisik.',
  },
  READY: {
    label: 'Hasil Kemas',
    badgeVariant: 'emerald',
    dotClass: 'bg-emerald-500',
    description: 'Pengemasan fisik selesai dan terverifikasi.',
  },
  SHIPPED: {
    label: 'Terkirim BI',
    badgeVariant: 'cyan',
    dotClass: 'bg-cyan-500',
    description: 'Doos sudah dikirim ke Bank Indonesia (terkunci).',
  },
};

export const getKemasStatusConfig = (status) =>
  KEMAS_STATUS_CONFIG[status] || {
    label: status || 'Tidak Diketahui',
    badgeVariant: 'secondary',
    dotClass: 'bg-slate-400',
    description: '',
  };

// Rasio fisik resmi (ADR 0001): 4 Pack = 9 Doos
export const PACKS_PER_QUAD = 4;
export const DOOS_PER_QUAD = 9;

/**
 * Format rentang nomor doos menjadi teks kompak.
 * Contoh: (1, 9) -> "1–9"
 */
export const formatDoosRangeCompact = (awal, akhir) => {
  if (!awal && !akhir) return '-';
  if (!akhir || awal === akhir) return String(awal);
  return `${awal}–${akhir}`;
};
