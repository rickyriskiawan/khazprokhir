import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
          </div>

          <DialogHeader className="flex-1">
            <DialogTitle>Konfirmasi Keluar Sistem</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengakhiri sesi kerja operasional Khazprokhir? Sesi aktif Anda akan dibersihkan dan Anda perlu masuk kembali.
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-border dark:border-border-dark flex items-center justify-end gap-2.5">
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
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            <span>{isLoading ? 'Mengakhiri Sesi...' : 'Konfirmasi Keluar'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
