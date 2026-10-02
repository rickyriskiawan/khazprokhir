/**
 * Standard denomination color mapping for Rupiah TE 2022 banknotes.
 * Matches physical banknote colors:
 * - Y (Rp 100.000): Merah / Rose
 * - X (Rp 50.000): Biru / Blue
 * - W (Rp 20.000): Hijau Zamrud / Emerald
 * - V (Rp 10.000): Ungu / Purple
 * - U (Rp 5.000): Cokelat / Amber
 * - T (Rp 2.000): Abu-abu / Slate
 * - S (Rp 1.000): Hijau Zaitun / Lime
 */
export const DENOM_COLOR_MAP = {
  Y: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  X: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  W: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  V: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
  U: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  T: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  S: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800/60',
};
