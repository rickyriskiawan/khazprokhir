export const DENOM_COLOR_MAP = {
  Y: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  X: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  W: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  V: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
  U: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  T: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  S: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800/60',
};

export const STATUS_CONFIG = {
  PENDING: {
    label: 'Belum Diterima',
    code: 'PENDING',
    bgClass:
      'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
  },
  RECEIVED: {
    label: 'Diterima Khazai',
    code: 'RECEIVED',
    bgClass:
      'bg-sky-50 text-sky-700 border-sky-300/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/80',
    dotClass: 'bg-sky-500',
  },
  SORTED: {
    label: 'Selesai Sortir',
    code: 'SORTED',
    bgClass:
      'bg-emerald-50 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80',
    dotClass: 'bg-emerald-500',
  },
  PACKED: {
    label: 'Sudah Dikemas',
    code: 'PACKED',
    bgClass:
      'bg-purple-50 text-purple-700 border-purple-300/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/80',
    dotClass: 'bg-purple-500',
  },
  SHIPPED: {
    label: 'Terkirim ke BI',
    code: 'SHIPPED',
    bgClass:
      'bg-cyan-50 text-cyan-700 border-cyan-300/80 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/80',
    dotClass: 'bg-cyan-500',
  },
};
