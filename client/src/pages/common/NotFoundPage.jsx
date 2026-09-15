import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top bar */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            KP
          </div>
          <span className="font-bold text-sm tracking-tight">KHAZPROKHIR</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 font-mono">
              Error 404
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Alamat URL yang Anda tuju tidak terdaftar pada sistem monitoring Khazprokhir.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 text-center border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Seksi Khazanah Produk Akhir &bull; Banknote Monitoring System
      </footer>
    </div>
  );
}
