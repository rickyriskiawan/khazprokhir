import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';

export default function DashboardHeader({
  health,
  lastUpdated,
  onRefresh,
  isRefreshing,
}) {
  const isConnected = health?.status === 'connected';
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const lastUpdatedTime = lastUpdated
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastUpdated)
    : '--:--:--';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60 dark:border-border-dark/60">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            Command Center
          </span>
          <span className="text-ink-muted">&bull;</span>
          <span className="text-xs text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayFormatted}</span>
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-ink dark:text-white mt-1">
          Monitoring Produksi Khazprokhir
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Connection Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-mono">
            {isConnected
              ? `Terhubung (${health?.latencyMs || 0}ms)`
              : 'Server Terputus'}
          </span>
        </div>

        {/* Refresh Button & Timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-muted dark:text-ink-secondary-dark hidden sm:inline font-mono">
            Update: {lastUpdatedTime} WIB
          </span>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Segarkan data dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark hover:bg-canvas dark:hover:bg-surface-subtle-dark text-ink dark:text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`}
            />
            <span>Segarkan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

