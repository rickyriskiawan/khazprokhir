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
import { Input } from '@/components/ui/input';
import BatchCombobox from '@/components/bon-masuk/BatchCombobox';
import PackMatrixGrid from './PackMatrixGrid';
import { createSortir } from '@/services/sortirService';
import { getBatchById } from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';
import { formatCompactRupiah } from '@/utils/formatters';
import {
  Layers,
  Box,
  Calculator,
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function SortirFormModal({
  open,
  onOpenChange,
  batches = [],
  shifts = [],
  onSuccess,
}) {
  const currentUser = useAuthStore((state) => state.user);

  // Form states
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const [tanggalSortir, setTanggalSortir] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [jamSortir, setJamSortir] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [shiftId, setShiftId] = useState(shifts[0]?.id || 1);
  const [penyortir1, setPenyortir1] = useState('');
  const [penyortir2, setPenyortir2] = useState('');
  const [catatan, setCatatan] = useState('');

  // Selected packs from grid (array of pack numbers)
  const [selectedPacks, setSelectedPacks] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Sync logged in user to penyortir1 on open or user change
  useEffect(() => {
    if (open) {
      if (currentUser?.full_name || currentUser?.nama) {
        setPenyortir1(currentUser.full_name || currentUser.nama);
      } else if (currentUser?.username) {
        setPenyortir1(currentUser.username);
      }
      // Reset selection when modal opens
      setSelectedPacks([]);
      setFormError(null);
    }
  }, [open, currentUser]);

  // Set default shift if available
  useEffect(() => {
    if (shifts.length > 0 && !shiftId) {
      setShiftId(shifts[0].id);
    }
  }, [shifts, shiftId]);

  // Load batch detail and pack status when selectedBatch changes
  useEffect(() => {
    if (!selectedBatch?.id) {
      setBatchData(null);
      setSelectedPacks([]);
      return;
    }

    let isMounted = true;
    setLoadingBatch(true);
    setSelectedPacks([]);
    setFormError(null);

    getBatchById(selectedBatch.id)
      .then((data) => {
        if (isMounted && data) {
          setBatchData(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFormError('Gagal memuat rincian matriks pack untuk batch terpilih.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingBatch(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBatch]);

  // Calculations for live Zero Reject
  const totalPack = selectedPacks.length;
  const isMultipleOf4 = totalPack > 0 && totalPack % 4 === 0;
  const totalBrood = totalPack * 45;
  const totalBilyet = totalPack * 45000;
  const setaraDoos = (totalPack / 4) * 9;

  const nominalPecahan = batchData?.emisi?.denominasi?.nilai || selectedBatch?.emisi?.denominasi?.nilai || 0;
  const totalNominalRupiah = totalBilyet * nominalPecahan;

  const canSubmit =
    Boolean(selectedBatch?.id) &&
    Boolean(shiftId) &&
    Boolean(penyortir1.trim()) &&
    isMultipleOf4 &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const finalCatatan = jamSortir
        ? catatan.trim()
          ? `[Jam: ${jamSortir}] ${catatan.trim()}`
          : `[Jam: ${jamSortir}]`
        : catatan.trim() || null;

      const payload = {
        batch_id: selectedBatch.id,
        shift_id: Number(shiftId),
        tanggal_sortir: tanggalSortir,
        penyortir_1: penyortir1.trim(),
        penyortir_2: penyortir2.trim() || null,
        catatan: finalCatatan,
        selected_packs: selectedPacks,
      };

      const result = await createSortir(payload);
      if (onSuccess) {
        onSuccess(result);
      }
      onOpenChange(false);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Gagal menyimpan hasil sortir.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        {/* Pinned Header */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-ink dark:text-ink-dark flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Pencatatan Hasil Sortir Pack
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-muted mt-0.5">
                Verifikasi fisik pack uang kertas hasil cetak tak sempurna/sempurna kelipatan 4 pack tanpa reject.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body: 2-Column Split-Panel */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Kiri: Metadata & Zero Reject Calculator (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Pilih Batch Produksi */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-ink-muted" />
                  Nomor Batch Produksi <span className="text-rose-500">*</span>
                </label>
                <BatchCombobox
                  batches={batches}
                  selectedBatch={selectedBatch}
                  onSelectBatch={(b) => setSelectedBatch(b)}
                  disabled={submitting}
                />
                <p className="text-[11px] text-ink-muted">
                  Hanya menampilkan batch yang telah diverifikasi dan memiliki pack diterima.
                </p>
              </div>

              {/* 2. Tanggal, Jam & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="sortirTanggal" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Tanggal Sortir <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="sortirTanggal"
                    type="date"
                    value={tanggalSortir}
                    onChange={(e) => setTanggalSortir(e.target.value)}
                    disabled={submitting}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sortirJam" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Jam Sortir
                  </label>
                  <Input
                    id="sortirJam"
                    type="time"
                    value={jamSortir}
                    onChange={(e) => setJamSortir(e.target.value)}
                    disabled={submitting}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sortirShift" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Shift Kerja <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sortirShift"
                    value={shiftId}
                    onChange={(e) => setShiftId(Number(e.target.value))}
                    disabled={submitting}
                    className="w-full h-9 rounded-md border border-input bg-surface dark:bg-surface-dark px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_shift} ({s.jam_mulai} - {s.jam_selesai})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Petugas Penyortir Fisik (1 & 2) */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40">
                <div className="space-y-1.5">
                  <label htmlFor="sortirPenyortir1" className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Petugas Penyortir 1 <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="sortirPenyortir1"
                    type="text"
                    value={penyortir1}
                    onChange={(e) => setPenyortir1(e.target.value)}
                    placeholder="Nama lengkap petugas 1"
                    disabled={submitting}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sortirPenyortir2" className="text-xs font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                    Petugas Penyortir 2 <span className="text-ink-muted font-normal">(Opsional)</span>
                  </label>
                  <Input
                    id="sortirPenyortir2"
                    type="text"
                    value={penyortir2}
                    onChange={(e) => setPenyortir2(e.target.value)}
                    placeholder="Nama lengkap petugas 2 (jika bertim)"
                    disabled={submitting}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* 4. Catatan Operasional */}
              <div className="space-y-1.5">
                <label htmlFor="sortirCatatan" className="text-xs font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                  Catatan Operasional <span className="text-ink-muted font-normal">(Opsional)</span>
                </label>
                <textarea
                  id="sortirCatatan"
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan kondisi fisik uang kertas, meja kerja, dsb..."
                  disabled={submitting}
                  className="w-full rounded-md border border-input bg-surface dark:bg-surface-dark p-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* 5. Live Zero Reject Calculator Card */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Kalkulator Live Zero Reject
                    </span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Rasio 4 Pack : 9 Doos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark/80 border border-emerald-500/10">
                    <span className="text-[11px] text-ink-muted block">Pack Terpilih</span>
                    <span
                      data-testid="zero-reject-pack-count"
                      className="text-base font-bold font-mono tabular-nums text-ink dark:text-ink-dark"
                    >
                      {totalPack}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">
                      ({totalPack / 4} Quad Pack)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark/80 border border-emerald-500/10">
                    <span className="text-[11px] text-ink-muted block">Setara Kemasan</span>
                    <span
                      data-testid="zero-reject-doos-count"
                      className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                    >
                      {setaraDoos}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">
                      Doos Standar BI
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark/80 border border-emerald-500/10">
                    <span className="text-[11px] text-ink-muted block">Total Brood</span>
                    <span
                      data-testid="zero-reject-brood-count"
                      className="text-sm font-semibold font-mono tabular-nums text-ink dark:text-ink-dark"
                    >
                      {totalBrood.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">
                      (@ 1.000 bilyet)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark/80 border border-emerald-500/10">
                    <span className="text-[11px] text-ink-muted block">Total Bilyet</span>
                    <span
                      data-testid="zero-reject-bilyet-count"
                      className="text-sm font-semibold font-mono tabular-nums text-ink dark:text-ink-dark"
                    >
                      {totalBilyet.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">
                      100% Utuh
                    </span>
                  </div>
                </div>

                {nominalPecahan > 0 && totalPack > 0 && (
                  <div className="pt-1 border-t border-emerald-500/10 flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Estimasi Nilai Nominal:</span>
                    <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatCompactRupiah(totalNominalRupiah)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Kanan: Matriks 10x10 Interaktif (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-ink-muted" />
                    Pilih Pack via Matriks 100 Pack
                  </h4>
                  <p className="text-[11px] text-ink-muted">
                    Satu klik memilih atau membatalkan 1 Quad (4 pack berurutan).
                  </p>
                </div>
              </div>

              {!selectedBatch ? (
                <div className="flex-1 min-h-[420px] rounded-xl border border-dashed border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center mb-3 text-ink-muted shadow-sm">
                    <Box className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-medium text-ink dark:text-ink-dark">Pilih Batch Terlebih Dahulu</h5>
                  <p className="text-xs text-ink-muted max-w-sm mt-1">
                    Silakan tentukan nomor batch pada panel kiri untuk memuat status 100 pack dan mengaktifkan matriks pemilihan.
                  </p>
                </div>
              ) : loadingBatch ? (
                <div className="flex-1 min-h-[420px] rounded-xl border border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/40 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-xs text-ink-muted">Memuat rincian 100 pack batch {selectedBatch.nomor_batch}...</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4 shadow-sm">
                  <PackMatrixGrid
                    packs={batchData?.packs || []}
                    selectedPacks={selectedPacks}
                    onSelectionChange={setSelectedPacks}
                    selectable={true}
                    selectableStatuses={['RECEIVED']}
                    batchInfo={{
                      nomor_batch: selectedBatch.nomor_batch,
                      seri: selectedBatch.seri,
                      kepala: selectedBatch.kepala,
                      tahun_anggaran: selectedBatch.tahun_anggaran,
                    }}
                    nominalPecahan={nominalPecahan}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Footer */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            {totalPack === 0 ? (
              <span className="text-ink-muted flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Belum ada pack yang dipilih
              </span>
            ) : !isMultipleOf4 ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                Jumlah pack harus kelipatan 4 (<span className="font-mono tabular-nums">{totalPack}</span> dipilih)
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                <span className="font-mono tabular-nums">{totalPack}</span> pack siap disortir (<span className="font-mono tabular-nums">{totalPack / 4}</span> Quad Pack = <span className="font-mono tabular-nums">{setaraDoos}</span> Doos)
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
              {submitting ? 'Menyimpan...' : 'Simpan Hasil Sortir'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
