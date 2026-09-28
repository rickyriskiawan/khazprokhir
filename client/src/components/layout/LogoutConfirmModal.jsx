import React, { useEffect } from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/button';

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1">
            <h3
              id="logout-dialog-title"
              className="text-base font-semibold text-ink dark:text-white tracking-tight"
            >
              Konfirmasi Keluar Sistem
            </h3>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri sesi kerja operasional Khazprokhir? Sesi aktif Anda akan dibersihkan dan Anda perlu masuk kembali.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-border dark:border-border-dark">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? 'Mengakhiri Sesi...' : 'Konfirmasi Keluar'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
