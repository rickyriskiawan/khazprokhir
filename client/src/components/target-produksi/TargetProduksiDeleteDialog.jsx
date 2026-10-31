import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteTargetProduksiGroup } from '@/services/targetProduksiService';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function TargetProduksiDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  targetGroup = null,
}) {
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
    }
  }, [isOpen, targetGroup]);

  if (!targetGroup) return null;

  const handleConfirmDelete = async () => {
    setErrorMsg('');
    try {
      setDeleting(true);
      await deleteTargetProduksiGroup(
        targetGroup.tahun_anggaran,
        targetGroup.tahun_emisi
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal menghapus Target Produksi.';
      setErrorMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            Hapus Target Produksi
          </DialogTitle>
          <DialogDescription className="text-xs">
            Apakah Anda yakin ingin menghapus seluruh kuota Target Produksi untuk{' '}
            <strong className="text-ink dark:text-ink-dark">Tahun Anggaran {targetGroup.tahun_anggaran}</strong> —{' '}
            <strong className="text-ink dark:text-ink-dark">Tahun Emisi {targetGroup.tahun_emisi}</strong>?
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleting}
            className="h-8 text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="h-8 text-xs font-semibold"
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
