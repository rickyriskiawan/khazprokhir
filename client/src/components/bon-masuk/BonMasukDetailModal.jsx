import React from 'react';
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
import { formatBilyet, formatIndonesianDate } from '@/utils/formatters';
import { ShieldCheck, Calendar, Clock, Layers, User, Hash, Box } from 'lucide-react';

export default function BonMasukDetailModal({ open, onOpenChange, bonMasuk }) {
  if (!bonMasuk) return null;

  const totalPack = bonMasuk.pack_sampai - bonMasuk.pack_dari + 1;
  const progressPercent = Math.min(100, Math.max(0, (totalPack / 100) * 100));

  const batchInfo = bonMasuk.batch || {};
  const emisiInfo = batchInfo.emisi || {};
  const denomInfo = emisiInfo.denominasi || {};
  const shiftInfo = bonMasuk.shift || {};
  const operatorInfo = bonMasuk.operator || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg">Detail Penerimaan Bon Masuk</DialogTitle>
            <Badge variant="emerald" className="font-mono text-xs">
              ID #{bonMasuk.id}
            </Badge>
          </div>
          <DialogDescription>
            Dokumen elektronik serah terima fisik uang kertas dari Khazanah Awal (Khazai).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Segel & Batch Banner */}
          <div className="rounded-xl bg-surface-subtle p-3.5 dark:bg-surface-subtle-dark border border-border/70 dark:border-border-dark/70 flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />
                <span>Nomor Segel Fisik</span>
              </div>
              <div className="text-base font-bold font-mono text-ink dark:text-white mt-0.5">
                {bonMasuk.no_segel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-muted">Pecahan / Emisi</div>
              <div className="text-sm font-semibold text-emerald dark:text-emerald-light">
                {denomInfo.nama || 'Uang Kertas'} ({emisiInfo.kode_emisi || 'TE 2022'})
              </div>
            </div>
          </div>

          {/* Grid Informasi Detail */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Identitas Batch</span>
              </div>
              <div className="font-semibold text-ink dark:text-white">
                {batchInfo.nomor_batch || '-'}
              </div>
              <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                Seri: <span className="font-mono font-medium">{batchInfo.seri || '-'}</span> | Kepala:{' '}
                <span className="font-mono font-medium">{batchInfo.kepala || '-'}</span> | TA{' '}
                {batchInfo.tahun_anggaran || '-'}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Shift & Petugas</span>
              </div>
              <div className="font-semibold text-ink dark:text-white">
                {shiftInfo.nama_shift || 'Shift'} ({shiftInfo.jam_mulai} - {shiftInfo.jam_selesai})
              </div>
              <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                Operator: <span className="font-medium">{operatorInfo.full_name || operatorInfo.username || '-'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Waktu Serah Terima</span>
              </div>
              <div className="font-semibold text-ink dark:text-white font-mono tabular-nums">
                {formatIndonesianDate(bonMasuk.tanggal_masuk)}
              </div>
              <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" strokeWidth={1.75} />
                <span>{bonMasuk.jam_masuk} WIB</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <Box className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Kategori & Mesin</span>
              </div>
              <div className="font-semibold text-ink dark:text-white">
                <Badge variant={bonMasuk.kategori_penerimaan === 'MASINAL' ? 'emerald' : 'amber'}>
                  {bonMasuk.kategori_penerimaan}
                </Badge>
              </div>
              <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                Mesin: {bonMasuk.jenis_mesin_sortir || 'Manual / Standar'}
              </div>
            </div>
          </div>

          {/* Mini Progress Bar Keterisian Batch */}
          <div className="rounded-xl border border-border p-3.5 dark:border-border-dark bg-surface dark:bg-surface-dark space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />
                Keterisian Batch dalam Bon Ini
              </span>
              <span className="font-bold font-mono tabular-nums text-ink dark:text-white">
                {totalPack} / 100 Pack ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle dark:bg-surface-subtle-dark">
              <div
                className="h-full rounded-full bg-emerald transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-1 text-xs text-ink-muted">
              <span>
                Rentang: <strong className="text-ink dark:text-white font-mono">Pack {bonMasuk.pack_dari}</strong> s/d{' '}
                <strong className="text-ink dark:text-white font-mono">Pack {bonMasuk.pack_sampai}</strong>
              </span>
              <span className="font-mono tabular-nums font-semibold text-emerald dark:text-emerald-light">
                {formatBilyet(bonMasuk.jumlah_bilyet)}
              </span>
            </div>
          </div>

          {/* Catatan jika ada */}
          {bonMasuk.catatan && (
            <div className="p-3 rounded-xl bg-surface-subtle dark:bg-surface-subtle-dark border border-border/50 text-xs">
              <span className="font-semibold text-ink dark:text-white">Catatan:</span>{' '}
              <span className="text-ink-secondary dark:text-ink-secondary-dark">{bonMasuk.catatan}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
