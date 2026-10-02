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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatBilyet } from '@/utils/formatters';
import { Grid3X3, Lock, Check } from 'lucide-react';

export default function PackMatrixPopover({
  batchLabel = '',
  receivedPacks = [],
  selectedPacks = [],
  onTogglePack,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const receivedSet = new Set(receivedPacks);
  const selectedSet = new Set(selectedPacks);

  const selectedCount = selectedSet.size;
  const receivedCount = receivedSet.size;
  const availableCount = Math.max(0, 100 - receivedCount);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`h-9 w-9 p-0 shrink-0 transition-colors disabled:pointer-events-auto disabled:cursor-not-allowed ${
          selectedCount > 0
            ? 'border-emerald text-emerald bg-emerald/5 dark:bg-emerald/10 hover:bg-emerald/10 dark:hover:bg-emerald/15'
            : 'text-ink-secondary hover:text-ink hover:border-emerald dark:text-ink-secondary-dark dark:hover:text-ink-dark'
        }`}
        title="Buka visualisasi matriks 100 pack"
        aria-label="Buka visualisasi matriks 100 pack"
      >
        <Grid3X3 className="h-4 w-4" strokeWidth={1.75} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-5">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-emerald" strokeWidth={1.75} />
                <span>Matriks Keterisian 100 Pack</span>
              </DialogTitle>
              {batchLabel && (
                <Badge variant="outline" className="font-mono text-xs">
                  {batchLabel}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Klik petak pack nomor 1 s/d 100 untuk memilih atau membatalkan pilihan alokasi pack.
            </DialogDescription>
          </DialogHeader>

          {/* Indikator Status Warna Legend */}
          <div className="flex flex-wrap items-center gap-3 py-2 text-xs border-y border-border dark:border-border-dark">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-red-500/20 border border-red-500/40" />
              <span className="text-ink-muted">Sudah Diterima ({receivedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald text-white border border-emerald" />
              <span className="text-ink-muted">Dipilih di Baris Ini ({selectedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-surface dark:bg-surface-dark border border-border" />
              <span className="text-ink-muted">Belum Diterima / Tersedia ({availableCount})</span>
            </div>
          </div>

          {/* Petak Matriks 10x10 menggunakan ScrollArea */}
          <ScrollArea className="max-h-[380px] pr-2 my-2">
            <div className="grid grid-cols-10 gap-1.5 p-3 rounded-xl border border-border bg-surface-subtle/50 dark:border-border-dark dark:bg-surface-subtle-dark/20">
              {Array.from({ length: 100 }, (_, i) => i + 1).map((packNum) => {
                const isReceived = receivedSet.has(packNum);
                const isSelected = selectedSet.has(packNum);

                if (isReceived) {
                  return (
                    <button
                      key={packNum}
                      type="button"
                      disabled
                      data-testid={`pack-btn-${packNum}`}
                      title={`Pack #${packNum} (Sudah pernah diterima sebelumnya)`}
                      className="h-8 sm:h-9 w-full flex items-center justify-center rounded-lg font-mono text-xs tabular-nums bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 cursor-not-allowed opacity-60"
                    >
                      <Lock className="h-2.5 w-2.5 mr-0.5" strokeWidth={2} />
                      {packNum}
                    </button>
                  );
                }

                if (isSelected) {
                  return (
                    <button
                      key={packNum}
                      type="button"
                      data-testid={`pack-btn-${packNum}`}
                      title={`Pack #${packNum} (Dipilih) - Klik untuk melepas`}
                      onClick={() => onTogglePack && onTogglePack(packNum)}
                      className="h-8 sm:h-9 w-full flex items-center justify-center rounded-lg font-mono text-xs tabular-nums font-bold bg-emerald text-white border border-emerald shadow-xs hover:bg-emerald/80 transition-colors cursor-pointer"
                    >
                      <Check className="h-2.5 w-2.5 mr-0.5" strokeWidth={2} />
                      {packNum}
                    </button>
                  );
                }

                return (
                  <button
                    key={packNum}
                    type="button"
                    data-testid={`pack-btn-${packNum}`}
                    title={`Pack #${packNum} (Tersedia) - Klik untuk memilih`}
                    onClick={() => onTogglePack && onTogglePack(packNum)}
                    className="h-8 sm:h-9 w-full flex items-center justify-center rounded-lg font-mono text-xs tabular-nums bg-surface dark:bg-surface-dark border border-border/80 hover:border-emerald hover:bg-emerald/10 text-ink dark:text-ink-dark transition-colors cursor-pointer"
                  >
                    {packNum}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Dialog Footer Ringkasan */}
          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border dark:border-border-dark pt-3">
            <div className="text-xs">
              <span className="text-ink-muted">Total Alokasi: </span>
              <strong className="font-mono tabular-nums text-emerald">
                {selectedCount} Pack
              </strong>
              <span className="text-ink-muted ml-1">
                ({formatBilyet(selectedCount * 45000)})
              </span>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-8"
            >
              Selesai Memilih
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
