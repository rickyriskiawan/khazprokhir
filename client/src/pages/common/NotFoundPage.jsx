import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f1f3f7] dark:bg-[#090b0e] text-[#11141a] dark:text-[#f9fafb] flex flex-col justify-between transition-colors duration-200">
      {/* Top bar */}
      <header className="px-6 md:px-8 py-5 flex justify-between items-center border-b border-[#e8ebf1] dark:border-[#1e2430] bg-white/70 dark:bg-[#12151c]/70 backdrop-blur">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#0f1115] dark:bg-white text-white dark:text-[#0f1115] flex items-center justify-center font-bold text-sm shadow-sm tracking-tight">
            KP
          </div>
          <span className="font-bold text-sm tracking-tight text-[#11141a] dark:text-white">
            KHAZPROKHIR
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] rounded-3xl p-8 md:p-10 shadow-soft-card dark:shadow-soft-card-dark transition-all">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] border border-[#e8ebf1] dark:border-[#1e2430] flex items-center justify-center text-amber-500 shadow-sm">
            <AlertTriangle className="w-7 h-7" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 font-mono">
              Error 404
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#11141a] dark:text-white">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] leading-relaxed">
              Alamat URL yang Anda tuju tidak terdaftar pada sistem monitoring Khazprokhir.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-[#0f1115] hover:bg-[#1f242d] dark:bg-white dark:hover:bg-[#f1f3f7] dark:text-[#0f1115] shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center border-t border-[#e8ebf1] dark:border-[#1e2430] text-xs text-[#9ca3af]">
        Seksi Khazanah Produk Akhir &bull; Banknote Monitoring System
      </footer>
    </div>
  );
}
