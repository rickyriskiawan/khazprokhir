import { DENOM_COLOR_MAP } from '@/constants/denominationColors';

export { DENOM_COLOR_MAP };

// Domain Conversion Constants (ADR 0001, ADR 0006)
export const TOTAL_PACKS = 100;
export const TOTAL_QUADS = 25;
export const PACKS_PER_QUAD = 4;
export const DOOS_PER_QUAD = 9;
export const BROOD_PER_PACK = 45;
export const BILYET_PER_PACK = 45000;
export const BILYET_PER_BROOD = 1000;

export const createDefaultPack = (nomor_pack) => ({
  nomor_pack,
  status: 'PENDING',
  jumlah_brood: BROOD_PER_PACK,
  jumlah_bilyet: BILYET_PER_PACK,
  proses_sortir_id: null,
  no_doos_range: null,
  bon_masuk_id: null,
});

export const STATUS_CONFIG = {
  PENDING: {
    label: 'Belum Diterima',
    code: 'PENDING',
    bgClass:
      'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    defaultOperationalText: '⏳ Belum diterima dari Khazai (Menunggu Bon Masuk)',
  },
  RECEIVED: {
    label: 'Diterima Khazai',
    code: 'RECEIVED',
    bgClass:
      'bg-sky-50 text-sky-700 border-sky-300/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/80',
    dotClass: 'bg-sky-500',
    defaultOperationalText: '✅ Siap untuk proses sortir',
  },
  SORTED: {
    label: 'Selesai Sortir',
    code: 'SORTED',
    bgClass:
      'bg-emerald-50 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80',
    dotClass: 'bg-emerald-500',
    defaultOperationalText: '✂️ Selesai disortir (Siap dikemas)',
  },
  PACKED: {
    label: 'Sudah Dikemas',
    code: 'PACKED',
    bgClass:
      'bg-purple-50 text-purple-700 border-purple-300/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/80',
    dotClass: 'bg-purple-500',
    defaultOperationalText: '📦 Sudah dikemas dalam doos',
  },
  SHIPPED: {
    label: 'Terkirim ke BI',
    code: 'SHIPPED',
    bgClass:
      'bg-cyan-50 text-cyan-700 border-cyan-300/80 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/80',
    dotClass: 'bg-cyan-500',
    defaultOperationalText: '🚚 Sudah terkirim ke Bank Indonesia',
  },
};
