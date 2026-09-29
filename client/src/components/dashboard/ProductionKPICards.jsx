import React from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Package, 
  Coins, 
  Clock
} from 'lucide-react';
import { formatCompactRupiah, formatBilyet, formatRupiah } from '@/utils/formatters';

export default function ProductionKPICards({ overview, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-surface dark:bg-surface-dark rounded-3xl p-6 border border-border dark:border-border-dark shadow-soft-card dark:shadow-soft-card-dark flex flex-col justify-between h-44"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-canvas dark:bg-surface-subtle-dark" />
              <div className="w-6 h-6 rounded-full bg-canvas dark:bg-surface-subtle-dark" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-3/4 bg-canvas dark:bg-surface-subtle-dark rounded-lg" />
              <div className="h-4 w-1/2 bg-canvas dark:bg-surface-subtle-dark rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const bon = overview?.bonMasuk;
  const sortir = overview?.sortir;
  const kemas = overview?.kemas;
  const doos = overview?.doosMonitoring;

  // Format figures
  const bilyetMasukStr = formatBilyet(bon?.total_bilyet || 0);
  const packMasukStr = `${bon?.total_pack || 0} Pack (${bon?.total_bon || 0} Bon)`;

  const packSortirStr = `${sortir?.total_pack || 0} Pack`;
  const detailSortirStr = `${sortir?.total_brood || 0} Brood (${formatBilyet(sortir?.total_bilyet || 0)})`;

  const doosKemasReady = kemas?.output_selesai?.total_doos || 0;
  const packWipKemas = kemas?.antrian_wip?.total_pack || 0;

  const totalNominalAngka = doos?.total_nominal_angka || 0;
  const totalNominalCompact = formatCompactRupiah(totalNominalAngka);
  const totalNominalFull = doos?.total_nominal_rupiah || formatRupiah(totalNominalAngka);
  const totalDoosReady = doos?.siap_kirim?.total_doos || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Penerimaan Bon Masuk Khazai */}
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Inbox className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
            Modul 1
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark font-medium">
            Penerimaan Khazai
          </p>
          <h3 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white font-mono tabular-nums truncate">
            {bilyetMasukStr}
          </h3>
          <p className="text-[11px] text-ink-muted dark:text-ink-secondary-dark font-medium">
            {packMasukStr}
          </p>
        </div>
      </div>

      {/* 2. Hasil Sortir Pack */}
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-surface dark:bg-emerald-surface-dark text-emerald-text dark:text-emerald-text-dark flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
            Zero Reject
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark font-medium">
            Hasil Sortir
          </p>
          <h3 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white font-mono tabular-nums truncate">
            {packSortirStr}
          </h3>
          <p className="text-[11px] text-ink-muted dark:text-ink-secondary-dark font-medium truncate">
            {detailSortirStr}
          </p>
        </div>
      </div>

      {/* 3. Hasil Kemas Doos (READY vs WIP) */}
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Package className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
            Rasio 4:9
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark font-medium">
            Realisasi Kemas
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white font-mono tabular-nums">
              {doosKemasReady} Doos
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              READY
            </span>
          </div>

          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{packWipKemas} Pack WIP (Siap Kemas)</span>
          </div>
        </div>
      </div>

      {/* 4. Stok Khazanah & Akumulasi Nilai Rupiah */}
      <div className="bg-pitch-card dark:bg-pitch-card-dark text-white rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white">
            <Coins className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Siap Kirim BI
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-white/70 font-medium">
            Nilai Siap Kirim
          </p>
          <h3
            className="text-2xl font-extrabold tracking-tight text-white font-mono tabular-nums truncate"
            title={totalNominalFull}
          >
            {totalNominalCompact}
          </h3>
          <p className="text-[11px] text-white/70 font-medium truncate">
            {totalDoosReady} Doos &bull; {totalNominalFull}
          </p>
        </div>
      </div>
    </div>
  );
}

