import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Coins, CheckCircle2 } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ProductionKPICards from '@/components/dashboard/ProductionKPICards';
import ShiftPerformanceWidget from '@/components/dashboard/ShiftPerformanceWidget';
import QuickActionsBar from '@/components/dashboard/QuickActionsBar';
import { fetchDashboardOverview } from '@/services/dashboardService';
import { formatRupiah, formatDoos } from '@/utils/formatters';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const data = await fetchDashboardOverview();
      setOverview(data);
      if (data.errors && data.errors.length > 0) {
        setErrorBanner(`Beberapa data modul gagal dimuat: ${data.errors.map((e) => e.module).join(', ')}`);
      } else {
        setErrorBanner(null);
      }
    } catch (err) {
      setErrorBanner(err.userMessage || err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadData();

    // Auto-refresh interval 60 detik (Sesuai Q1 Opsi A)
    const interval = setInterval(() => {
      if (isMounted) {
        loadData();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadData]);

  const handleManualRefresh = () => {
    loadData(true);
  };

  // Extract Denomination Table breakdown
  const denomRows = overview?.doosMonitoring?.rincian_denominasi || overview?.kemas?.rincian_denominasi || [];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto pb-12">
      {/* 1. Error Banner if server disconnects or modules fail */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        </div>
      )}

      {/* 2. Command Center Header Bar */}
      <DashboardHeader
        health={overview?.health}
        lastUpdated={overview?.lastUpdated}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 3. Four Core Production KPI Summary Cards */}
      <ProductionKPICards overview={overview} loading={loading} />

      {/* 4. Shift Performance Widget (2/3) + Quick Actions Bar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2">
          <ShiftPerformanceWidget
            shiftStats={overview?.shiftStats}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <QuickActionsBar />
        </div>
      </div>

      {/* 5. Rekapitulasi Rincian Pecahan Uang Kertas & Alur Modul */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 5.1 Tabel Rekapitulasi Pecahan (Span 2) */}
        <div className="lg:col-span-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold tracking-tight text-ink dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Rincian Persediaan per Pecahan Uang Kertas</span>
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-0.5">
                Akumulasi hasil sortir dan pengemasan doos emisi TE 2022
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-semibold text-ink-secondary dark:text-ink-secondary-dark border-b border-border dark:border-border-dark">
                  <th className="pb-3 px-3">Pecahan / Emisi</th>
                  <th className="pb-3 px-3 text-right">Nilai Nominal</th>
                  <th className="pb-3 px-3 text-center">Rentang Doos</th>
                  <th className="pb-3 px-3 text-right">Total Pack</th>
                  <th className="pb-3 px-3 text-right">Total Doos</th>
                  <th className="pb-3 px-3 text-right">Akumulasi Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-border-dark/40">
                {denomRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-ink-muted">
                      {loading ? 'Memuat rincian pecahan...' : 'Belum ada data produksi tercatat untuk hari ini.'}
                    </td>
                  </tr>
                ) : (
                  denomRows.map((denom, idx) => (
                    <tr
                      key={denom.denominasi_id || denom.nama || idx}
                      className="text-xs hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark transition-colors"
                    >
                      <td className="py-3.5 px-3 font-bold text-ink dark:text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono flex items-center justify-center text-xs border border-emerald-200 dark:border-emerald-500/20">
                          {denom.nama || denom.denominasi}
                        </span>
                        <span>TE 2022</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-ink-secondary dark:text-ink-secondary-dark tabular-nums">
                        {formatRupiah(denom.nilai)}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-xs tabular-nums text-ink-secondary dark:text-ink-secondary-dark">
                        {denom.min_no_doos > 0
                          ? `${formatDoos(denom.min_no_doos)} - ${formatDoos(denom.max_no_doos)}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-ink dark:text-white">
                        {denom.total_pack || 0} Pack
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums text-ink dark:text-white">
                        {denom.total_doos || 0} Doos
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {denom.total_nominal_rupiah || formatRupiah(Number(denom.total_bilyet || 0) * (denom.nilai || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5.2 Status Integritas Alur Produksi (Span 1) */}
        <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold tracking-tight text-ink dark:text-white">
                Integritas Alur Produksi
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                Tervalidasi
              </span>
            </div>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mb-5">
              Pemeriksaan runtutan 4 modul proses Khazprokhir
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-canvas dark:bg-surface-subtle-dark border border-border/60 dark:border-border-dark/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-ink dark:text-white block">Modul 1: Penerimaan Bon</span>
                  <span className="text-ink-muted text-[11px]">Segel unik & nomor pack terverifikasi</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-canvas dark:bg-surface-subtle-dark border border-border/60 dark:border-border-dark/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-ink dark:text-white block">Modul 2: Sortir Zero Reject</span>
                  <span className="text-ink-muted text-[11px]">Penataan susunan 100-pack per batch</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-canvas dark:bg-surface-subtle-dark border border-border/60 dark:border-border-dark/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-ink dark:text-white block">Modul 3: Kemas Rasio 4:9</span>
                  <span className="text-ink-muted text-[11px]">4 pack = 9 doos (45.000 bilyet/doos)</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-canvas dark:bg-surface-subtle-dark border border-border/60 dark:border-border-dark/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-ink dark:text-white block">Modul 4: Register & Gap Detector</span>
                  <span className="text-ink-muted text-[11px]">Urutan nomor doos kontinu tanpa celah</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border dark:border-border-dark mt-4 text-[11px] text-ink-muted dark:text-ink-secondary-dark flex items-center justify-between">
            <span>Standar Operasional Khazprokhir</span>
            <span className="font-mono">TE 2022</span>
          </div>
        </div>
      </div>
    </div>
  );
}
