import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteSortir } from '@/services/sortirService';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function SortirCancelDialog({
  open,
  onOpenChange,
  session = null,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!session) return null;

  const handleCancel = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await deleteSortir(session.id);
      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal membatalkan sesi sortir.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-base font-semibold text-ink-primary">
            Batalkan Sesi Sortir #{session.id}?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-ink-muted">
            Tindakan ini akan mengembalikan status <strong className="font-mono text-ink-primary">{session.total_pack} pack</strong> pada batch <strong className="font-mono text-ink-primary">{session.batch?.nomor_batch}</strong> dari <span className="text-emerald-600 font-semibold">SORTED</span> kembali menjadi <span className="text-sky-600 font-semibold">RECEIVED</span>.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-canvas border border-border text-xs space-y-1">
          <div className="flex justify-between text-ink-muted">
            <span>Nomor Batch:</span>
            <span className="font-mono font-medium text-ink-primary">{session.batch?.nomor_batch}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Total Pack:</span>
            <span className="font-mono font-medium text-ink-primary">{session.total_pack} Pack</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Penyortir:</span>
            <span className="font-medium text-ink-primary">{session.penyortir_1}</span>
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs h-9"
          >
            Kembali
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={submitting}
            className="text-xs h-9 px-4 font-semibold"
          >
            {submitting ? 'Membatalkan...' : 'Ya, Batalkan Sesi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
