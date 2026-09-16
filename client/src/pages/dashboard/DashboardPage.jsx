import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Layers, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  ChevronDown, 
  Clock, 
  AlertCircle,
  Package,
  Building2,
  Car
} from 'lucide-react';
import SlimSidebar from '../../components/layout/SlimSidebar';
import ModernTopbar from '../../components/layout/ModernTopbar';
import api from '../../services/api';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Live API status
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const start = performance.now();
    api
      .get('/health')
      .then((res) => {
        if (isMounted) {
          setHealthData(res.data);
          setPingLatency(Math.round(performance.now() - start));
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.userMessage || err.message);
          setHealthData(null);
          setPingLatency(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Mock bar chart data (12 columns) matching the reference screenshot
  const chartData = [
    { label: 'Jan', value: 35, display: '15.750' },
    { label: 'Feb', value: 70, display: '31.500' },
    { label: 'Mar', value: 48, display: '21.600' },
    { label: 'Apr', value: 65, display: '29.250' },
    { label: 'Mei', value: 92, display: '41.400' },
    { label: 'Jun', value: 98, display: '44.058', active: true, diff: '+67%' },
    { label: 'Jul', value: 68, display: '30.600' },
    { label: 'Agt', value: 85, display: '38.250' },
    { label: 'Sep', value: 58, display: '26.100' },
    { label: 'Okt', value: 42, display: '18.900' },
    { label: 'Nov', value: 72, display: '32.400' },
    { label: 'Des', value: 88, display: '39.600' },
  ];

  // Mock transactions matching reference screenshot style
  const transactions = [
    {
      id: 'SGFU654564',
      date: '15 Sep 2026',
      category: 'Penerimaan Khazai (Bon #001)',
      status: 'Success',
      amount: '45.000 Lembar',
      isActive: true, // First row elevated highlight
    },
    {
      id: 'SGFU654565',
      date: '15 Sep 2026',
      category: 'Sortir Pack Selesai (Pack 1-4)',
      status: 'Success',
      amount: '180.000 Lembar',
      isActive: false,
    },
    {
      id: 'SGFU654566',
      date: '15 Sep 2026',
      category: 'Pengemasan Doos (Doos 1-9)',
      status: 'Success',
      amount: '180.000 Lembar',
      isActive: false,
    },
  ];

  const filteredTransactions = transactions.filter((trx) =>
    trx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trx.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f1f3f7] dark:bg-[#090b0e] text-[#11141a] dark:text-[#f9fafb] flex font-sans transition-colors duration-200">
      {/* 1. Left Slim Sidebar */}
      <SlimSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main App Content Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-12">
        {/* 2. Top Header Bar */}
        <ModernTopbar onSearch={setSearchQuery} />

        {/* Content Workspace */}
        <main className="px-6 md:px-8 space-y-6 max-w-[1440px] w-full mx-auto">
          {/* Status Alert if Backend is offline */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Koneksi API Backend: {error} (Periksa server di port 5000)</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ROW 1: 3 Summary Stat Cards + 1 High Contrast Inverted Card                */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat Card 1: Saldo Kas Bon Masuk */}
            <div className="bg-white dark:bg-[#12151c] rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white">
                  <CreditCard className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="w-6 h-6 rounded-full bg-[#f1f3f7] dark:bg-[#1a1f29] flex items-center justify-center text-[#9ca3af] cursor-pointer">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#0f1115] dark:text-white font-mono tabular-nums">
                  Rp 1,45 M
                </h3>
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] font-medium">
                  Saldo Penerimaan Khazai
                </p>
              </div>
            </div>

            {/* Stat Card 2: Jumlah Pack & Transaksi Sortir */}
            <div className="bg-white dark:bg-[#12151c] rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white">
                  <Layers className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="w-6 h-6 rounded-full bg-[#f1f3f7] dark:bg-[#1a1f29] flex items-center justify-center text-[#9ca3af] cursor-pointer">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#0f1115] dark:text-white font-mono tabular-nums">
                  50 Pack
                </h3>
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] font-medium">
                  Selesai Sortir (Zero Reject)
                </p>
              </div>
            </div>

            {/* Stat Card 3: Realisasi Hasil Kemas (4:9) */}
            <div className="bg-white dark:bg-[#12151c] rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white">
                  <TrendingUp className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="w-6 h-6 rounded-full bg-[#f1f3f7] dark:bg-[#1a1f29] flex items-center justify-center text-[#9ca3af] cursor-pointer">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#0f1115] dark:text-white font-mono tabular-nums">
                  18 Doos
                </h3>
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] font-medium">
                  Realisasi Kemas Siap Kirim
                </p>
              </div>
            </div>

            {/* Inverted High-Contrast Card: Formation Status */}
            <div className="bg-[#0b0c10] dark:bg-[#1e232f] text-white rounded-3xl p-6 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="text-center space-y-0.5">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Status Produksi
                </h3>
                <p className="text-xs text-[#9ca3af] font-medium">
                  Sedang Berjalan (Shift 2)
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="my-4 space-y-2 text-center">
                <div className="w-full h-2.5 bg-[#272a33] dark:bg-[#2e3646] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-white rounded-full w-[68%] transition-all duration-500" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Target Kemas Terpenuhi
                  </span>
                  <span className="text-[11px] text-[#9ca3af] block">
                    68% Target Harian (18 / 27 Doos)
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="w-full py-3 rounded-full bg-white hover:bg-[#f1f3f7] text-[#0b0c10] dark:text-[#0f1117] font-bold text-xs tracking-wide transition shadow-sm cursor-pointer"
              >
                Lihat Detail Status
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ROW 2: Production Bar Chart Widget (2/3) + To Do List Widget (1/3)        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 2.1 Earning / Production Report Bar Chart (Span 2) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#12151c] rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              {/* Header & Filter */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-[#11141a] dark:text-white">
                    Laporan Output Produksi
                  </h3>
                  <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                    Capaian volume bilyet per bulan tahun anggaran 2026
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#e8ebf1] dark:border-[#1e2430] bg-white dark:bg-[#12151c] text-xs font-semibold text-[#6b7280] dark:text-[#9ca3af] hover:text-[#11141a] dark:hover:text-white shadow-sm transition cursor-pointer"
                  >
                    <span>Bulanan</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chart Visual Matrix */}
              <div className="relative pt-12 pb-2">
                <div className="flex items-end justify-between gap-2 md:gap-3 h-48 w-full px-2">
                  {chartData.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2.5 h-full justify-end relative group">
                      {/* Active Column Indicator & Floating Tooltip */}
                      {bar.active && (
                        <>
                          {/* Floating Tooltip Card */}
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e232f] border border-[#e8ebf1] dark:border-[#2e3646] shadow-floating-tooltip dark:shadow-floating-tooltip-dark rounded-2xl p-2.5 z-30 whitespace-nowrap">
                            <span className="text-[10px] text-[#6b7280] dark:text-[#9ca3af] block leading-tight">
                              Total Output
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-bold text-[#0f1115] dark:text-white font-mono">
                                {bar.display}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-500/20 text-[#059669] dark:text-[#6ee7b7]">
                                {bar.diff}
                              </span>
                            </div>
                          </div>

                          {/* Dotted Guide Line */}
                          <div className="absolute top-0 bottom-6 left-1/2 -translate-x-1/2 w-[1px] border-l border-dashed border-[#0f1115] dark:border-white pointer-events-none z-10 opacity-70" />
                        </>
                      )}

                      {/* Dual-Tone Bar: Gray Track with Black Fill */}
                      <div className="w-full max-w-[34px] h-full bg-[#f1f3f7] dark:bg-[#1a1f29] rounded-xl flex flex-col justify-end p-0.5 overflow-hidden">
                        <div
                          style={{ height: `${bar.value}%` }}
                          className={`w-full rounded-lg transition-all duration-500 ${
                            bar.active
                              ? 'bg-[#0f1115] dark:bg-white'
                              : 'bg-[#0f1115] dark:bg-white/80 group-hover:bg-[#0f1115]/90'
                          }`}
                        />
                      </div>

                      {/* X-Axis Month Label */}
                      <span className={`text-[11px] font-medium ${
                        bar.active
                          ? 'text-[#0f1115] dark:text-white font-bold'
                          : 'text-[#9ca3af] dark:text-[#6b7280]'
                      }`}>
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2.2 To Do List / Antrian Operasional (Span 1) */}
            <div className="bg-white dark:bg-[#12151c] rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold tracking-tight text-[#11141a] dark:text-white">
                    Antrian Operasional
                  </h3>
                  <span className="text-xs text-[#9ca3af] font-mono">Shift 2</span>
                </div>

                <div className="space-y-4">
                  {/* Task 1 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white group-hover:bg-white dark:group-hover:bg-[#12151c] shadow-sm transition-colors">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#11141a] dark:text-white">
                          Serah Terima Bon Khazai
                        </h4>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          Bon #001 &bull; 08:00 WIB
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#0f1115] dark:text-white">
                      100 Pack
                    </span>
                  </div>

                  {/* Task 2 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white group-hover:bg-white dark:group-hover:bg-[#12151c] shadow-sm transition-colors">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#11141a] dark:text-white">
                          Konfirmasi Fisik Kemas
                        </h4>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          WIP Handover &bull; 14:30 WIB
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#0f1115] dark:text-white">
                      18 Doos
                    </span>
                  </div>

                  {/* Task 3 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white group-hover:bg-white dark:group-hover:bg-[#12151c] shadow-sm transition-colors">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#11141a] dark:text-white">
                          Pemeriksaan Gap Doos
                        </h4>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          Integritas Urutan Doos
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      0 Gap
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="pt-4 border-t border-[#e8ebf1] dark:border-[#1e2430] flex items-center justify-between text-xs text-[#9ca3af]">
                <span>Status API: {healthData?.status === 'ok' ? `Terhubung (${pingLatency || 0}ms)` : 'Memeriksa...'}</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ROW 3: Transaction History (2/3) + Upcoming Handover to BI (1/3)           */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 3.1 Transaction History Table (Span 2) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#12151c] rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-[#11141a] dark:text-white">
                    Riwayat Alur Produksi Terakhir
                  </h3>
                  <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                    Catatan perpindahan status pack dan hasil kemas terkini
                  </p>
                </div>
              </div>

              {/* Clean Table Layout */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-[#6b7280] dark:text-[#9ca3af] border-b border-[#e8ebf1] dark:border-[#1e2430]">
                      <th className="pb-3 px-3">TrxID / No Bon</th>
                      <th className="pb-3 px-3">Tanggal</th>
                      <th className="pb-3 px-3">Kategori Modul</th>
                      <th className="pb-3 px-3 text-center">Status</th>
                      <th className="pb-3 px-3 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent">
                    {filteredTransactions.map((trx, idx) => (
                      <tr
                        key={idx}
                        className={`text-xs transition-all duration-200 ${
                          trx.isActive
                            ? 'bg-white dark:bg-white/5 shadow-active-row dark:shadow-active-row-dark rounded-2xl'
                            : 'hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29]'
                        }`}
                      >
                        <td className="py-4 px-3 font-mono font-medium text-[#11141a] dark:text-white">
                          {trx.id}
                        </td>
                        <td className="py-4 px-3 text-[#6b7280] dark:text-[#9ca3af]">
                          {trx.date}
                        </td>
                        <td className="py-4 px-3 font-medium text-[#11141a] dark:text-white">
                          {trx.category}
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#ecfdf5] dark:bg-emerald-500/10 text-[#059669] dark:text-[#6ee7b7]">
                            {trx.status}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-bold text-[#11141a] dark:text-white">
                          {trx.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.2 Upcoming Handover / Penyerahan BI (Span 1) */}
            <div className="bg-white dark:bg-[#12151c] rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold tracking-tight text-[#11141a] dark:text-white">
                    Rencana Penyerahan BI
                  </h3>
                  <span className="text-xs text-[#9ca3af] font-mono">15 Sep 2026</span>
                </div>
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mb-6">
                  Jadwal serah terima fisik doos ke Bank Indonesia
                </p>

                <div className="space-y-4">
                  {/* Schedule Item 1 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white group-hover:bg-white dark:group-hover:bg-[#12151c] shadow-sm transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#11141a] dark:text-white">
                          Doos 0001 - 0018 (Pecahan S)
                        </h4>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          Status: Siap Serah Terima
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#0f1115] dark:text-white">
                      Rp 180 Jt
                    </span>
                  </div>

                  {/* Schedule Item 2 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white group-hover:bg-white dark:group-hover:bg-[#12151c] shadow-sm transition-colors">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#11141a] dark:text-white">
                          Doos 0019 - 0036 (Pecahan T)
                        </h4>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          Status: Antrian Kemas
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#0f1115] dark:text-white">
                      Rp 360 Jt
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Link */}
              <div className="pt-4 border-t border-[#e8ebf1] dark:border-[#1e2430]">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-2xl text-xs font-semibold text-[#0f1115] dark:text-white bg-[#f1f3f7] dark:bg-[#1a1f29] hover:bg-[#e8ebf1] dark:hover:bg-[#2e3646] transition text-center cursor-pointer"
                >
                  Buka Modul Register Doos
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
