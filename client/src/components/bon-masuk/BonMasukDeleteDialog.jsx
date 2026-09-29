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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deleteBonMasuk } from '@/services/bonMasukService';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatBilyet } from '@/utils/formatters';

export default function BonMasukDeleteDialog({ open, onOpenChange, bonMasuk, onSuccess }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!bonMasuk) return null;

  const items = bonMasuk.items || [];
  const hasItems = items.length > 0;
  const totalPack = bonMasuk.total_pack || (bonMasuk.pack_sampai ? bonMasuk.pack_sampai - bonMasuk.pack_dari + 1 : 0);

  const handleDelete = async () => {
    setErrorMsg(null);
    setIsDeleting(true);
    try {
      await deleteBonMasuk(bonMasuk.id);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.userMessage || err.message || 'Gagal membatalkan bon masuk.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
            <DialogTitle>Konfirmasi Pembatalan Bon Masuk</DialogTitle>
          </div>
          <DialogDescription>
            Tindakan ini akan membatalkan pencatatan fisik dan mengembalikan seluruh nomor pack ke status PENDING.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            <AlertTitle>Pembatalan Ditolak</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-border p-3.5 dark:border-border-dark bg-surface-subtle dark:bg-surface-subtle-dark text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-ink-muted">Nomor Segel:</span>
            <span className="font-mono tabular-nums font-bold text-ink dark:text-ink-dark">{bonMasuk.no_segel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Batch:</span>
            <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark text-right max-w-[240px] truncate">
              {hasItems
                ? `${items.length} Batch (${items.map((it) => it.batch?.nomor_batch || `#${it.batch_id}`).join(', ')})`
                : (bonMasuk.batch?.nomor_batch || '-')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Alokasi Pack:</span>
            <span className="font-mono tabular-nums text-ink dark:text-ink-dark">
              {hasItems
                ? `${totalPack} Pack (${formatBilyet(bonMasuk.jumlah_bilyet)})`
                : `Pack ${bonMasuk.pack_dari} s/d ${bonMasuk.pack_sampai} (${totalPack} Pack)`}
            </span>
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          Catatan: Pembatalan hanya diizinkan jika belum ada nomor pack dalam bon ini yang diproses ke tahap sortir atau kemas.
        </p>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                Membatalkan...
              </>
            ) : (
              'Ya, Batalkan Bon Masuk'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

