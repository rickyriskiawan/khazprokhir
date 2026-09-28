import React from 'react';
import { Clock, Layers, Package, CalendarClock } from 'lucide-react';
import { useShiftStore } from '@/stores/shiftStore';
import { getCurrentShift } from '@/utils/shiftUtils';
import { formatBilyet } from '@/utils/formatters';

export default function ShiftPerformanceWidget({ shiftStats, loading }) {
  const shifts = useShiftStore((state) => state.shifts);
  const currentShift = getCurrentShift(shifts);

  if (loading) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark animate-pulse space-y-4">
        <div className="h-6 w-48 bg-canvas dark:bg-surface-subtle-dark rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-canvas dark:bg-surface-subtle-dark rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Fallback defaults
  const shift1Data = shiftStats?.[1] || { total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' };
  const shift2Data = shiftStats?.[2] || { total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' };
  const shift3Data = shiftStats?.[3] || { total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' };

  const shiftCards = [
    {
      id: 1,
      name: 'Shift 1',
      hours: shifts.find((s) => s.id === 1)?.jam_mulai && shifts.find((s) => s.id === 1)?.jam_selesai
        ? `${shifts.find((s) => s.id === 1).jam_mulai} - ${shifts.find((s) => s.id === 1).jam_selesai}`
        : '07:30 - 16:00',
      isActive: true,
      isCurrent: currentShift?.id === 1,
      stats: shift1Data,
    },
    {
      id: 2,
      name: 'Shift 2',
      hours: shifts.find((s) => s.id === 2)?.jam_mulai && shifts.find((s) => s.id === 2)?.jam_selesai
        ? `${shifts.find((s) => s.id === 2).jam_mulai} - ${shifts.find((s) => s.id === 2).jam_selesai}`
        : '15:30 - 23:30',
      isActive: true,
      isCurrent: currentShift?.id === 2,
      stats: shift2Data,
    },
    {
      id: 3,
      name: 'Shift 3',
      hours: shifts.find((s) => s.id === 3)?.jam_mulai && shifts.find((s) => s.id === 3)?.jam_selesai
        ? `${shifts.find((s) => s.id === 3).jam_mulai} - ${shifts.find((s) => s.id === 3).jam_selesai}`
        : '23:00 - 07:00',
      isActive: false, // Cadangan
      isCurrent: currentShift?.id === 3,
      stats: shift3Data,
    },
  ];

  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold tracking-tight text-ink dark:text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Capaian per Shift Kerja</span>
          </h3>
          <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-0.5">
            Kontribusi output fisik kemas & penataan sortir hari ini
          </p>
        </div>

        {currentShift && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Shift Aktif: {currentShift.nama}</span>
          </div>
        )}
      </div>

      {/* Grid 3 Shift Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shiftCards.map((shift) => (
          <div
            key={shift.id}
            className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
              shift.isCurrent
                ? 'bg-canvas dark:bg-surface-subtle-dark border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-canvas/60 dark:bg-surface-subtle-dark/50 border-border dark:border-border-dark'
            }`}
          >
            {/* Header Shift Card */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink dark:text-white">
                    {shift.name}
                  </h4>
                  {shift.isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                      Live
                    </span>
                  )}
                  {!shift.isActive && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Cadangan
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-muted dark:text-ink-secondary-dark mt-0.5 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{shift.hours} WIB</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2.5 pt-3 border-t border-border/60 dark:border-border-dark/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  <span>Realisasi Kemas</span>
                </span>
                <span className="font-bold font-mono text-ink dark:text-white tabular-nums">
                  {shift.stats.total_doos} Doos
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-500" />
                  <span>Hasil Sortir</span>
                </span>
                <span className="font-bold font-mono text-ink dark:text-white tabular-nums">
                  {shift.stats.total_pack_sortir} Pack
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-secondary-dark pt-1">
                <span>Volume Lembar</span>
                <span className="font-mono tabular-nums">
                  {formatBilyet(shift.stats.total_bilyet)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
