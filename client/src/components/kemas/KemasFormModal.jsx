import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SesiSortirCombobox from './SesiSortirCombobox';
import PackMatrixGrid from '@/components/sortir/PackMatrixGrid';
import { createKemas, getNextDoosNumber, getSesiSiapKemas } from '@/services/kemasService';
import { formatIndonesianDate } from '@/utils/formatters';
import {
  Package,
  Box,
  Calendar,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

export default function KemasFormModal({ open, onOpenChange, shifts = [], onSuccess }) {
  // Sesi sortir siap kemas
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Form states
  const [noDoosAwal, setNoDoosAwal] = useState('');
  const [noDoosAkhir, setNoDoosAkhir] = useState('');
  const [tanggalKemas, setTanggalKemas] = useState(() => new Date().toISOString().split('T')[0]);
  const [shiftId, setShiftId] = useState(shifts[0]?.id || 1);
  const [catatan, setCatatan] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Muat ulang daftar sesi siap kemas + reset form setiap modal dibuka
  useEffect(() => {
    if (!open) return;

    setSelectedSession(null);
    setNoDoosAwal('');
    setNoDoosAkhir('');
    setCatatan('');
    setConfirmed(false);
    setFormError(null);
    setTanggalKemas(new Date().toISOString().split('T')[0]);

    let isMounted = true;
    setLoadingSessions(true);
    getSesiSiapKemas({ limit: 100 })
      .then((res) => {
        if (isMounted) setSessions(res.data || []);
      })
      .catch(() => {
        if (isMounted) setFormError('Gagal memuat daftar sesi sortir yang siap dikemas.');
      })
      .finally(() => {
        if (isMounted) setLoadingSessions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (shifts.length > 0 && !shiftId) setShiftId(shifts[0].id);
  }, [shifts, shiftId]);

  // Total pack & doos dari sesi terpilih
  const totalPack = selectedSession?.total_pack || 0;
  const totalDoos = selectedSession?.total_doos || 0;

  // Prefill nomor doos awal dari rekomendasi sistem saat sesi dipilih
  useEffect(() => {
    if (!selectedSession?.batch?.id) return;

    let isMounted = true;
    getNextDoosNumber({ batch_id: selectedSession.batch.id })
      .then((data) => {
        if (isMounted && data?.next_no_doos_awal) {
          setNoDoosAwal(String(data.next_no_doos_awal));
        }
      })
      .catch(() => {
        /* rekomendasi opsional: operator tetap dapat mengisi manual */
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSession]);

  // Hitung otomatis nomor doos akhir dari rasio 4 Pack = 9 Doos
  useEffect(() => {
    const awal = Number(noDoosAwal);
    if (!awal || !totalDoos) return;
    setNoDoosAkhir(String(awal + totalDoos - 1));
  }, [noDoosAwal, totalDoos]);

  const packsForGrid = useMemo(() => {
    if (!selectedSession?.packs) return [];
    return selectedSession.packs.map((p) => ({
      nomor_pack: p.nomor_pack,
      status: p.status,
      no_doos_range: p.no_doos_range,
      bon_masuk: p.bon_masuk,
      sortir_pack_details: [
        {
          proses_sortir: {
            penyortir_1: selectedSession.penyortir_1,
            penyortir_2: selectedSession.penyortir_2,
            tanggal_sortir: selectedSession.tanggal_sortir,
          },
        },
      ],
    }));
  }, [selectedSession]);

  const awalNum = Number(noDoosAwal);
  const akhirNum = Number(noDoosAkhir);
  const isDoosRangeValid =
    Number.isInteger(awalNum) && Number.isInteger(akhirNum) && awalNum >= 1 && akhirNum >= awalNum;

  const canSubmit =
    Boolean(selectedSession?.id) && Boolean(shiftId) && isDoosRangeValid && confirmed && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        proses_sortir_id: selectedSession.id,
        shift_id: Number(shiftId),
        tanggal_kemas: tanggalKemas,
        no_doos_awal: awalNum,
        no_doos_akhir: akhirNum,
        catatan: catatan.trim() || null,
      };

      const result = await createKemas(payload);
      if (onSuccess) onSuccess(result);
      onOpenChange(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan hasil pengemasan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
          <DialogTitle className="text-lg font-semibold text-ink dark:text-ink-dark flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Pencatatan Hasil Pengemasan Doos
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted mt-0.5">
            Pilih sesi sortir, masukkan rentang nomor doos, lalu konfirmasi pengemasan fisik (rasio 4 Pack = 9 Doos).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Kiri: Metadata & Input Doos */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Pilih Sesi Sortir */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-ink-muted" />
                  Sesi Sortir Siap Kemas <span className="text-rose-500">*</span>
                </label>
                <SesiSortirCombobox
                  sessions={sessions}
                  selectedSession={selectedSession}
                  onSelectSession={setSelectedSession}
                  disabled={submitting || loadingSessions}
                />
                <p className="text-[11px] text-ink-muted">
                  {loadingSessions
                    ? 'Memuat sesi sortir yang siap dikemas...'
                    : `${sessions.length} sesi sortir siap dikemas (seluruh pack berstatus SORTED).`}
                </p>
              </div>

              {/* 2. Ringkasan Sesi Terpilih */}
              {selectedSession && (
                <div className="p-3.5 rounded-lg border border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Batch</span>
                    <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                      {selectedSession.batch?.nomor_batch} • {selectedSession.batch?.seri}
                      {selectedSession.batch?.kepala || ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Tahun Anggaran</span>
                    <span className="font-mono tabular-nums text-ink dark:text-ink-dark">
                      {selectedSession.batch?.tahun_anggaran}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Tanggal Sortir</span>
                    <span className="text-ink dark:text-ink-dark">
                      {formatIndonesianDate(selectedSession.tanggal_sortir)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Penyortir</span>
                    <span className="text-ink dark:text-ink-dark text-right">
                      {selectedSession.penyortir_1}
                      {selectedSession.penyortir_2 ? ` & ${selectedSession.penyortir_2}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border dark:border-border-dark">
                    <span className="text-ink-muted">Volume</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPack} Pack = {totalDoos} Doos
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Rentang Nomor Doos */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40">
                <div className="flex items-start gap-2 text-[11px] text-ink-muted">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span>
                    Nomor doos awal terisi otomatis dari rekomendasi sistem. Nomor doos akhir dihitung mengikuti rasio 4 Pack = 9 Doos.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="kemasDoosAwal" className="text-xs font-semibold text-ink dark:text-ink-dark">
                      No. Doos Awal <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="kemasDoosAwal"
                      type="number"
                      min={1}
                      value={noDoosAwal}
                      onChange={(e) => setNoDoosAwal(e.target.value)}
                      placeholder="1"
                      disabled={submitting || !selectedSession}
                      className="h-9 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="kemasDoosAkhir" className="text-xs font-semibold text-ink dark:text-ink-dark">
                      No. Doos Akhir <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="kemasDoosAkhir"
                      type="number"
                      min={1}
                      value={noDoosAkhir}
                      onChange={(e) => setNoDoosAkhir(e.target.value)}
                      placeholder="9"
                      disabled={submitting || !selectedSession}
                      className="h-9 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                </div>

                {selectedSession && isDoosRangeValid && (
                  <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                    Doos {awalNum}–{akhirNum} ({akhirNum - awalNum + 1} doos)
                  </div>
                )}
              </div>

              {/* 4. Tanggal & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="kemasTanggal" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Tanggal Kemas <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="kemasTanggal"
                    type="date"
                    value={tanggalKemas}
                    onChange={(e) => setTanggalKemas(e.target.value)}
                    disabled={submitting}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="kemasShift" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Shift Kerja <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="kemasShift"
                    value={shiftId}
                    onChange={(e) => setShiftId(Number(e.target.value))}
                    disabled={submitting}
                    className="w-full h-9 rounded-md border border-input bg-surface dark:bg-surface-dark px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama || s.nama_shift} ({s.jam_mulai} - {s.jam_selesai})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Catatan */}
              <div className="space-y-1.5">
                <label htmlFor="kemasCatatan" className="text-xs font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                  Catatan Operasional <span className="text-ink-muted font-normal">(Opsional)</span>
                </label>
                <textarea
                  id="kemasCatatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan kondisi fisik doos, meja kerja, dsb..."
                  disabled={submitting}
                  className="w-full h-24 resize-none rounded-md border border-input bg-surface dark:bg-surface-dark p-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* 6. Konfirmasi Pengemasan */}
              <label
                htmlFor="kemasKonfirmasi"
                className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-300/70 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/25 cursor-pointer"
              >
                <input
                  id="kemasKonfirmasi"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={submitting || !selectedSession}
                  className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus:ring-emerald cursor-pointer"
                />
                <span className="text-[11px] leading-snug text-emerald-800 dark:text-emerald-300">
                  Saya mengonfirmasi bahwa doos fisik telah dikemas sesuai rentang nomor di atas dan siap diverifikasi.
                </span>
              </label>
            </div>

            {/* Panel Kanan: Matriks 10x10 Read-Only */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ink-muted" />
                  Pack dalam Sesi Sortir Terpilih
                </h4>
                <p className="text-[11px] text-ink-muted">
                  Grid bersifat informasi (read-only). Arahkan kursor ke petak untuk melihat detail pack.
                </p>
              </div>

              {!selectedSession ? (
                <div className="flex-1 min-h-[420px] rounded-xl border border-dashed border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center mb-3 text-ink-muted shadow-sm">
                    <Box className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-medium text-ink dark:text-ink-dark">Pilih Sesi Sortir Terlebih Dahulu</h5>
                  <p className="text-xs text-ink-muted max-w-sm mt-1">
                    Silakan pilih sesi sortir pada panel kiri untuk memuat matriks pack yang akan dikemas.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4 shadow-sm">
                  <PackMatrixGrid
                    packs={packsForGrid}
                    selectable={false}
                    packCountLabel="Pack Sesi Ini"
                    batchInfo={{
                      nomor_batch: selectedSession.batch?.nomor_batch,
                      seri: selectedSession.batch?.seri,
                      kepala: selectedSession.batch?.kepala,
                      tahun_anggaran: selectedSession.batch?.tahun_anggaran,
                      emisi: selectedSession.batch?.emisi,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            {!selectedSession ? (
              <span className="text-ink-muted flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Belum ada sesi sortir yang dipilih
              </span>
            ) : !confirmed ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                Centang konfirmasi pengemasan untuk melanjutkan
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                <span className="font-mono tabular-nums">{totalPack}</span> pack →{' '}
                <span className="font-mono tabular-nums">{totalDoos}</span> doos siap dicatat
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="emerald"
              size="sm"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="text-xs h-9 px-4 font-medium"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Hasil Kemas'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
