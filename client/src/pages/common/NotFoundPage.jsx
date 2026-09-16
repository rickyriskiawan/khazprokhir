import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark flex flex-col justify-between transition-colors duration-200">
      {/* Top bar */}
      <header className="px-6 md:px-8 py-5 flex justify-between items-center border-b border-border dark:border-border-dark bg-surface/70 dark:bg-surface-dark/70 backdrop-blur">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-pitch dark:bg-white text-white dark:text-pitch flex items-center justify-center font-bold text-sm shadow-sm tracking-tight">
            KP
          </div>
          <span className="font-bold text-sm tracking-tight text-ink dark:text-white">
            KHAZPROKHIR
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-8 md:p-10 shadow-soft-card dark:shadow-soft-card-dark transition-all">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark border border-border dark:border-border-dark flex items-center justify-center text-amber-500 shadow-sm">
            <AlertTriangle className="w-7 h-7" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-text dark:text-emerald-text-dark font-mono">
              Error 404
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink dark:text-white">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark leading-relaxed">
              Alamat URL yang Anda tuju tidak terdaftar pada sistem monitoring Khazprokhir.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-pitch hover:bg-pitch-hover dark:bg-white dark:hover:bg-canvas dark:text-pitch shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center border-t border-border dark:border-border-dark text-xs text-ink-muted">
        Seksi Khazanah Produk Akhir &bull; Banknote Monitoring System
      </footer>
    </div>
  );
}
