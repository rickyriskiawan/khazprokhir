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
import { formatBilyet, formatIndonesianDate, formatRupiah } from '@/utils/formatters';
import { ShieldCheck, Calendar, Clock, Layers, User, Box, FileText } from 'lucide-react';

export default function BonMasukDetailModal({ open, onOpenChange, bonMasuk }) {
  if (!bonMasuk) return null;

  const items = bonMasuk.items && bonMasuk.items.length > 0 ? bonMasuk.items : [];
  const hasItems = items.length > 0;

  const totalPack = bonMasuk.total_pack || (bonMasuk.pack_sampai ? bonMasuk.pack_sampai - bonMasuk.pack_dari + 1 : 0);
  const shiftInfo = bonMasuk.shift || {};
  const operatorInfo = bonMasuk.operator || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg">Detail Penerimaan Bon Masuk</DialogTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-xs">
                TA {bonMasuk.tahun_anggaran || 2026}
              </Badge>
              <Badge variant="emerald" className="font-mono text-xs">
                ID #{bonMasuk.id}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Dokumen elektronik serah terima fisik uang kertas dari Khazanah Awal (Khazai).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Segel & Ringkasan Volume Wadah */}
          <div className="rounded-xl bg-surface-subtle p-3.5 dark:bg-surface-subtle-dark border border-border/70 dark:border-border-dark/70 flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />
                <span>Nomor Segel Fisik</span>
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-ink dark:text-ink-dark mt-0.5">
                {bonMasuk.no_segel}
              </div>
              {bonMasuk.no_bon && (
                <div className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark font-mono tabular-nums">
                  Ref Bon: {bonMasuk.no_bon}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-muted">Akumulasi Isi Segel</div>
              <div className="text-sm font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                {totalPack} Pack ({hasItems ? items.length : 1} Batch)
              </div>
              <div className="text-xs font-mono tabular-nums font-semibold text-emerald dark:text-emerald-400">
                {formatBilyet(bonMasuk.jumlah_bilyet)}
              </div>
            </div>
          </div>

          {/* Grid Informasi Serah Terima */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
            <div className="p-2.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Waktu Serah Terima</span>
              </div>
              <div className="font-semibold text-xs text-ink dark:text-white font-mono tabular-nums">
                {formatIndonesianDate(bonMasuk.tanggal_masuk)}
              </div>
              <div className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" strokeWidth={1.75} />
                <span>{bonMasuk.jam_masuk} WIB</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Shift & Operator</span>
              </div>
              <div className="font-semibold text-xs text-ink dark:text-white">
                {shiftInfo.nama_shift || 'Shift'}
              </div>
              <div className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark truncate">
                Opr: {operatorInfo.full_name || operatorInfo.username || '-'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-1">
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <Box className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Kategori & Mesin</span>
              </div>
              <div className="font-semibold text-xs text-ink dark:text-white">
                <Badge variant={bonMasuk.kategori_penerimaan === 'MASINAL' ? 'emerald' : 'amber'} className="text-[10px] py-0 px-1.5">
                  {bonMasuk.kategori_penerimaan}
                </Badge>
              </div>
              <div className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark truncate">
                Mesin: {bonMasuk.jenis_mesin_sortir || 'Manual'}
              </div>
            </div>
          </div>

          {/* Petugas Serah Terima jika ada */}
          {(bonMasuk.petugas_khazai || bonMasuk.petugas_khazprokhir) && (
            <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-xs">
              <div>
                <span className="text-ink-muted">Petugas Khazai: </span>
                <strong className="text-ink dark:text-white">{bonMasuk.petugas_khazai || '-'}</strong>
              </div>
              <div>
                <span className="text-ink-muted">Petugas Penerima: </span>
                <strong className="text-ink dark:text-white">{bonMasuk.petugas_khazprokhir || '-'}</strong>
              </div>
            </div>
          )}

          {/* Rincian Tiap Batch yang Ada di dalam Segel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
              <span>Rincian Batch dalam Segel ({hasItems ? items.length : 1} Batch)</span>
            </div>

            <div className="space-y-2.5">
              {hasItems ? (
                items.map((it, idx) => {
                  const b = it.batch || {};
                  const emisi = b.emisi || {};
                  const denom = emisi.denominasi || {};
                  const percent = Math.min(100, Math.max(0, it.total_pack));

                  return (
                    <div
                      key={it.id || idx}
                      className="rounded-xl border border-border dark:border-border-dark p-3 bg-surface dark:bg-surface-dark space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-emerald" strokeWidth={1.75} />
                          <span className="font-bold text-xs text-ink dark:text-ink-dark font-mono tabular-nums">
                            {b.nomor_batch || `Batch #${it.batch_id}`}
                          </span>
                          <span className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                            (Seri: <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{b.seri}</strong> Kepala: <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{b.kepala}</strong>)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(denom.nama || denom.nilai) && (
                            <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                              {denom.nama || formatRupiah(denom.nilai)}
                            </Badge>
                          )}
                          <Badge variant="emerald" className="font-mono tabular-nums text-[10px]">
                            {it.total_pack} Pack
                          </Badge>
                        </div>
                      </div>

                      {/* Mini Progress Bar Keterisian Batch ini */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-ink-muted">
                          <span>
                            Daftar Pack: <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{it.nomor_pack_list}</strong>
                          </span>
                          <span className="font-mono tabular-nums text-emerald dark:text-emerald-400 font-medium">
                            {formatBilyet(it.jumlah_bilyet)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle dark:bg-surface-subtle-dark">
                          <div
                            className="h-full rounded-full bg-emerald transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-ink-muted text-right font-mono tabular-nums">
                          {it.total_pack} / 100 Pack ({percent}%)
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Fallback legacy single-batch */
                <div className="rounded-xl border border-border dark:border-border-dark p-3 bg-surface dark:bg-surface-dark space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald" strokeWidth={1.75} />
                      <span className="font-bold text-xs text-ink dark:text-ink-dark font-mono tabular-nums">
                        {bonMasuk.batch?.nomor_batch || '-'}
                      </span>
                      <span className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                        (Seri: <strong className="font-mono tabular-nums">{bonMasuk.batch?.seri}</strong> Kepala: <strong className="font-mono tabular-nums">{bonMasuk.batch?.kepala}</strong>)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(bonMasuk.batch?.emisi?.denominasi?.nama || bonMasuk.batch?.emisi?.denominasi?.nilai) && (
                        <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                          {bonMasuk.batch.emisi.denominasi.nama || formatRupiah(bonMasuk.batch.emisi.denominasi.nilai)}
                        </Badge>
                      )}
                      <Badge variant="emerald" className="font-mono tabular-nums text-[10px]">
                        {totalPack} Pack
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle dark:bg-surface-subtle-dark">
                    <div
                      className="h-full rounded-full bg-emerald"
                      style={{ width: `${totalPack}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span className="font-mono tabular-nums">Rentang: Pack {bonMasuk.pack_dari} s/d {bonMasuk.pack_sampai}</span>
                    <span className="font-mono tabular-nums font-medium text-emerald dark:text-emerald-400">
                      {formatBilyet(bonMasuk.jumlah_bilyet)}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-muted text-right font-mono tabular-nums">
                    {totalPack} / 100 Pack ({totalPack}%)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Catatan jika ada */}
          {bonMasuk.catatan && (
            <div className="rounded-xl border border-border p-3 text-xs dark:border-border-dark bg-surface-subtle/50 dark:bg-surface-subtle-dark/50">
              <span className="font-semibold text-ink dark:text-ink-dark flex items-center gap-1 mb-1">
                <FileText className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                Catatan:
              </span>
              <p className="text-ink-secondary dark:text-ink-secondary-dark italic">
                &quot;{bonMasuk.catatan}&quot;
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
