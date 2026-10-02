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
import { Badge } from '@/components/ui/badge';
import PackMatrixGrid from './PackMatrixGrid';
import { getBatchById } from '@/services/bonMasukService';
import { formatBilyet, formatIndonesianDate } from '@/utils/formatters';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import {
  Layers,
  Box,
  Coins,
  Calendar,
  Clock,
  User,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function SortirDetailModal({
  open,
  onOpenChange,
  session = null,
}) {
  const [batchData, setBatchData] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  useEffect(() => {
    if (!session?.batch_id || !open) {
      setBatchData(null);
      return;
    }

    let isMounted = true;
    setLoadingBatch(true);

    getBatchById(session.batch_id)
      .then((data) => {
        if (isMounted && data) {
          setBatchData(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load batch data for detail modal:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingBatch(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, open]);

  if (!session) return null;

  const denomNama = session.batch?.emisi?.denominasi?.nama || '';
  const denomNilai = session.batch?.emisi?.denominasi?.nilai || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface border-border">
        {/* Pinned Header */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold font-mono">
                #{session.id}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-ink-primary flex items-center gap-2">
                  Detail Sesi Sortir #{session.id}
                  <Badge
                    variant={session.status === 'COMPLETED' ? 'emerald' : 'secondary'}
                    className="text-[10px] uppercase font-bold"
                  >
                    {session.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted mt-0.5">
                  Nomor Batch: <strong className="font-mono text-ink-primary">{session.batch?.nomor_batch}</strong> ({session.batch?.seri}{session.batch?.kepala})
                  {denomNama && (
                    <span
                      className={`ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                        DENOM_COLOR_MAP[denomNama] || ''
                      }`}
                    >
                      {denomNama}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-canvas/60 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Tanggal & Shift
              </span>
              <p className="text-xs font-semibold text-ink-primary">
                {formatIndonesianDate(session.tanggal_sortir)}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {session.shift?.nama_shift || `Shift ${session.shift_id}`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-canvas/60 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5" />
                Petugas Penyortir
              </span>
              <p className="text-xs font-semibold text-ink-primary">
                {session.penyortir_1}
              </p>
              {session.penyortir_2 && (
                <p className="text-[11px] text-ink-muted mt-0.5">
                  & {session.penyortir_2}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-canvas/60 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5" />
                Volume Pack
              </span>
              <p className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {session.total_pack} Pack
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5 font-mono tabular-nums">
                ({session.total_pack / 4} Quad = {(session.total_pack / 4) * 9} Doos)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-canvas/60 border border-border">
              <span className="text-[11px] text-ink-muted flex items-center gap-1.5 mb-1">
                <Coins className="w-3.5 h-3.5" />
                Volume Bilyet
              </span>
              <p className="text-xs font-bold font-mono tabular-nums text-ink-primary">
                {formatBilyet(session.total_bilyet)}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5 font-mono tabular-nums">
                {session.total_brood?.toLocaleString('id-ID')} Brood
              </p>
            </div>
          </div>

          {session.catatan && (
            <div className="p-3 rounded-lg bg-canvas/40 border border-border text-xs">
              <span className="font-semibold text-ink-primary block mb-0.5">Catatan Operasional:</span>
              <p className="text-ink-secondary italic">{session.catatan}</p>
            </div>
          )}

          {/* Matriks 100 Pack Read-Only (Audit Mode) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-ink-muted" />
              Visualisasi Status 100 Pack Batch (Mode Audit)
            </h4>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              {loadingBatch ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-2" />
                  <p className="text-xs text-ink-muted">Memuat visualisasi matriks 100 pack...</p>
                </div>
              ) : (
                <PackMatrixGrid
                  packs={batchData?.pack_details || []}
                  selectable={false}
                  batchInfo={{
                    nomor_batch: session.batch?.nomor_batch,
                    seri: session.batch?.seri,
                    kepala: session.batch?.kepala,
                  }}
                  nominalPecahan={denomNilai}
                />
              )}
            </div>
          </div>
        </div>

        {/* Pinned Footer */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border bg-surface flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 px-4"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
