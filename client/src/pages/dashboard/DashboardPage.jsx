import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  LogOut,
  LogIn
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { 
  formatRupiah, 
  formatBilyet, 
  formatDoos, 
  formatIndonesianDate, 
  formatPackRange, 
  formatDoosRange 
} from '../../utils/formatters';

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await api.get('/health');
      const latency = Math.round(performance.now() - start);
      setHealthData(res.data);
      setPingLatency(latency);
    } catch (err) {
      setError(err.userMessage || err.message);
      setHealthData(null);
      setPingLatency(null);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-emerald-600/30">
              KP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  KHAZPROKHIR
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium">
                  FE-01 Foundation
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sistem Monitoring Produksi Uang Kertas &bull; Seksi Khazanah Produk Akhir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Auth State Button */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {user.nama_lengkap || user.username}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Keluar / Logout"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner Hero */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950/20 p-6 md:p-8 relative overflow-hidden shadow-sm transition-colors duration-200">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Arsitektur Frontend Siap (Dual Theme Minimalis)</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fondasi Aplikasi & Client HTTP Terkonfigurasi
            </h2>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Langkah <strong>FE-01</strong> berhasil mengonfigurasi React Router deklaratif, Axios client terpusat dengan auto Bearer token injection, Zustand store untuk autentikasi dan tema, serta sistem desain Dual Theme minimalis & elegan.
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                Uji Koneksi API
              </button>
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Halaman Login (FE-02 Preview)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section 1: Live Backend Connectivity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Status Koneksi Backend API (Axios Interceptors)
            </h3>
            {pingLatency !== null && (
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                Latency: {pingLatency} ms
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">API Service</span>
                <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {loading ? (
                  <span className="text-slate-400 text-xs">Memeriksa...</span>
                ) : healthData?.status === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Terhubung (200 OK)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-rose-600 dark:text-rose-400 text-xs truncate max-w-[180px]" title={error || 'Gagal Terhubung'}>
                      {error || 'Gagal Terhubung'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}
              </p>
            </div>

            {/* Database Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Database PostgreSQL</span>
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {loading ? (
                  <span className="text-slate-400 text-xs">Memeriksa...</span>
                ) : healthData?.database === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Connected</span>
                  </>
                ) : (
                  <span className="text-xs text-amber-600">Disconnected</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Prisma ORM &bull; PostgreSQL 16
              </p>
            </div>

            {/* Environment Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Environment</span>
                <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white capitalize">
                {healthData?.environment || 'Development'}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                React 19 &bull; Vite &bull; TailwindCSS
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Dual Theme Design System Preview */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Preview Sistem Desain: Muted Status Badges (Minimalis & Elegan)
          </h3>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm transition-colors duration-200">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Coba klik tombol <strong>Theme Toggle (☀️ / 🌙)</strong> di kanan atas untuk melihat bagaimana badge berikut beradaptasi secara elegan antara Light dan Dark mode:
            </p>

            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                READY &bull; Siap Kirim
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                SIAP_KEMAS &bull; Antrian WIP
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                RECEIVED &bull; Diterima Khazai
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                PACKED &bull; Dikemas Doos
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20">
                SHIPPED &bull; Terkirim BI
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                GAP &bull; Celah Nomor Terdeteksi
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                PENDING &bull; Menunggu
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Formatting Utilities Demonstration */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Preview Utilitas Format (Tabular Figures Standard Banknote)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Format Rupiah (IDR)
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                {formatRupiah(4500000000)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Volume Bilyet Uang Kertas
              </span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {formatBilyet(180000)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Format Nomor Doos 4-Digit
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                Doos {formatDoos(1)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Rentang Nomor Doos
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                {formatDoosRange(1, 18)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Rentang Nomor Pack
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                {formatPackRange(1, 4)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Tanggal Resmi Indonesia
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                {formatIndonesianDate(new Date())}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        Khazprokhir Banknote Monitoring System &bull; Versi FE-01 Foundation
      </footer>
    </div>
  );
}
