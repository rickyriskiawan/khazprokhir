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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/authStore';
import { createBonMasuk, updateBonMasuk, getBatchById } from '@/services/bonMasukService';
import { formatBilyet, formatRupiah } from '@/utils/formatters';
import { parsePackRange, formatPackNumbers } from '@/utils/packParser';
import BatchCombobox from './BatchCombobox';
import PackMatrixPopover from './PackMatrixPopover';
import { Calculator, AlertCircle, Loader2, Plus, Trash2, Lock, Sparkles } from 'lucide-react';

export default function BonMasukFormModal({
  open,
  onOpenChange,
  initialData = null,
  batches = [],
  shifts = [],
  emisiList = [],
  onSuccess,
}) {
  const isEdit = Boolean(initialData);
  const currentUser = useAuthStore((s) => s.user);

  // Header states
  const [noSegel, setNoSegel] = useState('');
  const [tahunAnggaran, setTahunAnggaran] = useState(new Date().getFullYear());
  const [tanggalMasuk, setTanggalMasuk] = useState(new Date().toISOString().split('T')[0]);
  const [jamMasuk, setJamMasuk] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [shiftId, setShiftId] = useState('');
  const [kategoriPenerimaan, setKategoriPenerimaan] = useState('MASINAL');
  const [jenisMesinSortir, setJenisMesinSortir] = useState('');
  const [petugasKhazprokhir, setPetugasKhazprokhir] = useState('');
  const [catatan, setCatatan] = useState('');

  // Dynamic Batch Items Repeater
  // Item structure: { id, batchId, selectedBatch, packListInput, isNewBatch, newNomorBatch, newSeri, newKepala, newEmisiId, isLocked }
  const [batchItems, setBatchItems] = useState([]);
  const [batchDetailsMap, setBatchDetailsMap] = useState({});
  const [loadingBatchIds, setLoadingBatchIds] = useState(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync initialData when opening in Edit mode or reset on Create mode
  useEffect(() => {
    if (initialData) {
      setNoSegel(initialData.no_segel || '');
      setTahunAnggaran(initialData.tahun_anggaran || new Date().getFullYear());
      setTanggalMasuk(
        initialData.tanggal_masuk
          ? String(initialData.tanggal_masuk).split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setJamMasuk(initialData.jam_masuk || '08:00');
      setShiftId(initialData.shift_id ? String(initialData.shift_id) : '');
      setKategoriPenerimaan(initialData.kategori_penerimaan || 'MASINAL');
      setJenisMesinSortir(initialData.jenis_mesin_sortir || '');
      setPetugasKhazprokhir(initialData.petugas_khazprokhir || currentUser?.nama || currentUser?.username || '');
      setCatatan(initialData.catatan || '');
      setErrorMsg(null);

      // Detect which batches are locked due to SORTED/PACKED/SHIPPED packs
      const processedBatchIds = new Set(
        (initialData.packs || [])
          .filter((p) => ['SORTED', 'PACKED', 'SHIPPED'].includes(p.status))
          .map((p) => p.batch_id)
      );

      if (initialData.items && initialData.items.length > 0) {
        setBatchItems(
          initialData.items.map((it, idx) => ({
            id: `item-${idx}-${Date.now()}`,
            batchId: it.batch_id,
            selectedBatch: it.batch || batches.find((b) => b.id === it.batch_id) || null,
            packListInput: it.nomor_pack_list || '',
            isNewBatch: false,
            newNomorBatch: '',
            newSeri: '',
            newKepala: '0',
            newEmisiId: '',
            isLocked: processedBatchIds.has(it.batch_id),
          }))
        );
      } else if (initialData.batch_id) {
        // Fallback legacy single-batch
        const legacyBatch = initialData.batch || batches.find((b) => b.id === initialData.batch_id) || null;
        setBatchItems([
          {
            id: `item-0-${Date.now()}`,
            batchId: initialData.batch_id,
            selectedBatch: legacyBatch,
            packListInput: `${initialData.pack_dari || 1}-${initialData.pack_sampai || 100}`,
            isNewBatch: false,
            newNomorBatch: '',
            newSeri: '',
            newKepala: '0',
            newEmisiId: '',
            isLocked: processedBatchIds.has(initialData.batch_id),
          },
        ]);
      } else {
        setBatchItems([]);
      }
    } else {
      // Reset form on Create mode - clean & empty initial batch
      setNoSegel('');
      setTahunAnggaran(new Date().getFullYear());
      setTanggalMasuk(new Date().toISOString().split('T')[0]);
      const now = new Date();
      setJamMasuk(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setShiftId(shifts.length > 0 ? String(shifts[0].id) : '1');
      setKategoriPenerimaan('MASINAL');
      setJenisMesinSortir('');
      setPetugasKhazprokhir(currentUser?.nama || currentUser?.username || '');
      setCatatan('');
      setErrorMsg(null);

      // Default with 1 initial clean & empty batch row for instant search
      setBatchItems([
        {
          id: `item-0-${Date.now()}`,
          batchId: null,
          selectedBatch: null,
          packListInput: '',
          isNewBatch: false,
          newNomorBatch: '',
          newSeri: '',
          newKepala: '0',
          newEmisiId: emisiList.length > 0 ? String(emisiList[0].id) : '',
          isLocked: false,
        },
      ]);
    }
  }, [initialData, open, batches, shifts, emisiList, currentUser]);

  // Lazy-load detailed pack status for selected batches with race prevention
  useEffect(() => {
    batchItems.forEach(async (item) => {
      if (item.batchId && !batchDetailsMap[item.batchId] && !loadingBatchIds.has(item.batchId)) {
        if (item.selectedBatch?.packs) {
          setBatchDetailsMap((prev) => ({ ...prev, [item.batchId]: item.selectedBatch }));
          return;
        }
        setLoadingBatchIds((prev) => new Set(prev).add(item.batchId));
        try {
          const detailed = await getBatchById(item.batchId);
          setBatchDetailsMap((prev) => ({
            ...prev,
            [item.batchId]: detailed || item.selectedBatch || { packs: [] },
          }));
        } catch {
          setBatchDetailsMap((prev) => ({
            ...prev,
            [item.batchId]: item.selectedBatch || { packs: [] },
          }));
        } finally {
          setLoadingBatchIds((prev) => {
            const next = new Set(prev);
            next.delete(item.batchId);
            return next;
          });
        }
      }
    });
  }, [batchItems, batchDetailsMap, loadingBatchIds]);

  // Handler: Tambah Baris Batch
  const handleAddBatchItem = () => {
    setBatchItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        batchId: null,
        selectedBatch: null,
        packListInput: '',
        isNewBatch: false,
        newNomorBatch: '',
        newSeri: '',
        newKepala: '0',
        newEmisiId: emisiList.length > 0 ? String(emisiList[0].id) : '',
        isLocked: false,
      },
    ]);
  };

  // Handler: Hapus Baris Batch
  const handleRemoveBatchItem = (id) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Handler: Update Atribut Baris Batch
  const updateBatchItem = (id, fields) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  // Handler: Toggle alokasi pack dari mini matriks
  const handleTogglePack = (itemId, packNum) => {
    const targetItem = batchItems.find((it) => it.id === itemId);
    if (!targetItem) return;
    const parsed = parsePackRange(targetItem.packListInput);
    const numSet = new Set(parsed.numbers);
    if (numSet.has(packNum)) {
      numSet.delete(packNum);
    } else {
      numSet.add(packNum);
    }
    const newRangeStr = formatPackNumbers(Array.from(numSet));
    updateBatchItem(itemId, { packListInput: newRangeStr });
  };

  // Parse & validasi tiap item batch secara reaktif
  const parsedItems = batchItems.map((item) => {
    const parsed = parsePackRange(item.packListInput);
    const fullBatch = item.batchId ? batchDetailsMap[item.batchId] || item.selectedBatch : item.selectedBatch;
    
    // Pack yang sudah pernah diterima di transaksi sebelumnya
    const receivedPackNumbers = (fullBatch?.packs || [])
      .filter((p) => p.status !== 'PENDING' && (isEdit ? p.bon_masuk_id !== initialData?.id : true))
      .map((p) => p.nomor_pack);

    const conflictingPacks = parsed.isValid
      ? parsed.numbers.filter((num) => receivedPackNumbers.includes(num))
      : [];
    const hasConflict = conflictingPacks.length > 0;

    return {
      ...item,
      parsed,
      receivedPackNumbers,
      conflictingPacks,
      hasConflict,
    };
  });

  const allValid =
    parsedItems.length > 0 &&
    parsedItems.every(
      (item) => item.parsed.isValid && !item.hasConflict && (item.batchId || item.selectedBatch || item.isNewBatch)
    );

  const hasAnyConflict = parsedItems.some((item) => item.hasConflict);
  const isLoadingBatches = loadingBatchIds.size > 0;

  const globalTotalPack = parsedItems.reduce(
    (acc, item) => (item.parsed.isValid ? acc + item.parsed.totalPack : acc),
    0
  );
  const globalTotalBilyet = globalTotalPack * 45000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!noSegel.trim()) {
      setErrorMsg('Nomor segel fisik wajib diisi.');
      return;
    }

    if (!shiftId) {
      setErrorMsg('Shift kerja wajib dipilih.');
      return;
    }

    if (batchItems.length === 0) {
      setErrorMsg('Minimal satu batch harus dimasukkan ke dalam dokumen segel.');
      return;
    }

    if (hasAnyConflict) {
      setErrorMsg('Terdapat nomor pack yang sudah pernah diterima pada batch yang dipilih. Mohon periksa kembali.');
      return;
    }

    // Validasi duplikasi batch dalam formulir
    const seenBatchKeys = new Set();
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      let key = '';
      if (item.isNewBatch) {
        if (!item.newNomorBatch.trim() || !item.newSeri.trim() || !item.newKepala.trim() || !item.newEmisiId) {
          setErrorMsg(`Data registrasi batch baru pada baris #${i + 1} belum lengkap.`);
          return;
        }
        key = `new_${item.newNomorBatch.trim().toLowerCase()}`;
      } else {
        if (!item.batchId && !item.selectedBatch) {
          setErrorMsg(`Silakan pilih batch terdaftar pada baris #${i + 1}.`);
          return;
        }
        key = `id_${item.batchId || item.selectedBatch.id}`;
      }

      if (seenBatchKeys.has(key)) {
        setErrorMsg(`Batch pada baris #${i + 1} duplikat. Satu nomor batch hanya boleh muncul satu kali dalam segel yang sama.`);
        return;
      }
      seenBatchKeys.add(key);

      const parsed = parsePackRange(item.packListInput);
      if (!parsed.isValid) {
        setErrorMsg(`Baris #${i + 1}: ${parsed.error}`);
        return;
      }
    }

    const payload = {
      no_segel: noSegel.trim(),
      tahun_anggaran: parseInt(tahunAnggaran, 10),
      tanggal_masuk: tanggalMasuk,
      jam_masuk: jamMasuk,
      shift_id: parseInt(shiftId, 10),
      kategori_penerimaan: kategoriPenerimaan,
      jenis_mesin_sortir: jenisMesinSortir.trim() ? jenisMesinSortir.trim() : null,
      petugas_khazprokhir: petugasKhazprokhir.trim() ? petugasKhazprokhir.trim() : null,
      catatan: catatan.trim() ? catatan.trim() : null,
      items: batchItems.map((item) => {
        if (item.isNewBatch) {
          return {
            nomor_batch: item.newNomorBatch.trim(),
            seri: item.newSeri.trim().toUpperCase(),
            kepala: item.newKepala.trim(),
            emisi_id: parseInt(item.newEmisiId, 10),
            nomor_pack_list: item.packListInput.trim(),
          };
        }
        return {
          batch_id: item.batchId || item.selectedBatch.id,
          nomor_pack_list: item.packListInput.trim(),
        };
      }),
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateBonMasuk(initialData.id, payload);
      } else {
        await createBonMasuk(payload);
      }
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.userMessage || err.message || 'Gagal menyimpan data bon masuk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Data Bon Masuk Khazai' : 'Input Penerimaan Bon Masuk Khazai'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Penyuntingan data segel fisik dan alokasi batch (Batch yang sudah disortir terkunci secara aman).'
              : 'Pencatatan serah terima fisik uang kertas dari Khazai ke Khazprokhir dalam satu nomor segel.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="my-1">
            <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[calc(88vh-140px)] pr-3">
          <form id="bonMasukForm" onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* 1. Header Dokumen Bon Masuk (2 Baris Terstruktur) */}
            <div className="rounded-xl border border-border p-3.5 dark:border-border-dark bg-surface-subtle/50 dark:bg-surface-subtle-dark/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                  Informasi Segel & Waktu Penerimaan
                </span>
                <Badge variant="outline" className="font-mono tabular-nums text-[11px]">
                  TA {tahunAnggaran}
                </Badge>
              </div>

              {/* Baris 1: Segel, TA, Tanggal, Jam, Shift */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="noSegel" className="text-xs font-medium">
                    Nomor Segel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="noSegel"
                    type="text"
                    placeholder="SGL-2026-001"
                    value={noSegel}
                    onChange={(e) => setNoSegel(e.target.value)}
                    className="font-mono tabular-nums text-xs uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tahunAnggaran" className="text-xs font-medium">
                    Tahun Anggaran
                  </Label>
                  <Input
                    id="tahunAnggaran"
                    type="number"
                    value={tahunAnggaran}
                    onChange={(e) => setTahunAnggaran(e.target.value)}
                    className="font-mono text-xs tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tanggalMasuk" className="text-xs font-medium">
                    Tanggal Masuk
                  </Label>
                  <Input
                    id="tanggalMasuk"
                    type="date"
                    value={tanggalMasuk}
                    onChange={(e) => setTanggalMasuk(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jamMasuk" className="text-xs font-medium">
                    Jam Masuk
                  </Label>
                  <Input
                    id="jamMasuk"
                    type="time"
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(e.target.value)}
                    className="text-xs font-mono tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="shiftId" className="text-xs font-medium">
                    Shift Kerja
                  </Label>
                  <Select value={shiftId} onValueChange={setShiftId}>
                    <SelectTrigger id="shiftId" className="text-xs">
                      <SelectValue placeholder="Pilih Shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.nama_shift || `Shift ${s.id}`} ({s.jam_mulai} - {s.jam_selesai})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baris 2: Petugas Penerima, Kategori, Mesin Sortir */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40 dark:border-border-dark/40">
                <div className="space-y-1">
                  <Label htmlFor="petugasKhazprokhir" className="text-xs font-medium">
                    Petugas Penerima Khazprokhir
                  </Label>
                  <Input
                    id="petugasKhazprokhir"
                    type="text"
                    placeholder="Nama penerima Khazprokhir"
                    value={petugasKhazprokhir}
                    onChange={(e) => setPetugasKhazprokhir(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="kategoriPenerimaan" className="text-xs font-medium">
                    Kategori Penerimaan
                  </Label>
                  <Select value={kategoriPenerimaan} onValueChange={setKategoriPenerimaan}>
                    <SelectTrigger id="kategoriPenerimaan" className="text-xs">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASINAL">MASINAL</SelectItem>
                      <SelectItem value="PARSIAL">PARSIAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jenisMesinSortir" className="text-xs font-medium">
                    Mesin Sortir Khazai
                  </Label>
                  <Input
                    id="jenisMesinSortir"
                    type="text"
                    placeholder="Contoh: BPS M7"
                    value={jenisMesinSortir}
                    onChange={(e) => setJenisMesinSortir(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Bagian Dynamic Batch Repeater */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                  Daftar Batch & Alokasi Pack dalam Segel Ini
                </Label>
                <p className="text-[11px] text-ink-muted">
                  Wadah bersegel dapat memuat lebih dari satu batch. Ketikkan rentang pack acak (contoh: <code className="font-mono">1-10, 13, 16, 20, 22</code>) atau gunakan visual matriks.
                </p>
              </div>

              <div className="space-y-2.5">
                {parsedItems.map((item, index) => {
                  const batchLabel = item.selectedBatch
                    ? `${item.selectedBatch.nomor_batch} (${item.selectedBatch.seri}${item.selectedBatch.kepala})`
                    : item.isNewBatch
                    ? item.newNomorBatch || 'Batch Baru'
                    : '';

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        item.hasConflict
                          ? 'border-destructive/60 bg-destructive/5'
                          : item.isLocked
                          ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
                          : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 dark:border-border-dark/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                            Batch #{index + 1}
                          </span>
                          {item.isLocked && (
                            <Badge variant="amber" className="text-[10px] gap-1 py-0 px-1.5">
                              <Lock className="h-2.5 w-2.5" strokeWidth={1.75} />
                              Terkunci (Sudah Masuk Sortir)
                            </Badge>
                          )}
                          {item.isNewBatch && (
                            <Badge variant="emerald" className="text-[10px] gap-1 py-0 px-1.5">
                              <Sparkles className="h-2.5 w-2.5" strokeWidth={1.75} />
                              Batch Baru
                            </Badge>
                          )}
                        </div>

                        {!item.isLocked && batchItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveBatchItem(item.id)}
                            className="h-6 w-6 text-ink-muted hover:text-destructive cursor-pointer"
                            title="Hapus Batch Ini dari Segel"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </Button>
                        )}
                      </div>

                      {/* Mode Batch: Existing vs New */}
                      {!item.isNewBatch ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                            {/* Pencarian Batch Terdaftar via Smart Combobox */}
                            <div className="md:col-span-4 space-y-1">
                              <Label className="text-xs font-medium">Pilih / Cari Batch</Label>
                              <BatchCombobox
                                batches={batches}
                                selectedBatch={item.selectedBatch}
                                disabled={item.isLocked}
                                onSelectBatch={(batch) => {
                                  updateBatchItem(item.id, {
                                    batchId: batch ? batch.id : null,
                                    selectedBatch: batch,
                                  });
                                }}
                                onRequestNewBatch={(parsedQuery) => {
                                  updateBatchItem(item.id, {
                                    isNewBatch: true,
                                    newSeri: parsedQuery.seri || '',
                                    newKepala: parsedQuery.kepala || '0',
                                    newNomorBatch: parsedQuery.raw || '',
                                    newEmisiId: emisiList.length > 0 ? String(emisiList[0].id) : '',
                                  });
                                }}
                              />
                            </div>

                            {/* Input Pack Acak & Trigger Matriks */}
                            <div className="md:col-span-5 space-y-1">
                              <Label className="text-xs font-medium">
                                Nomor Pack <span className="text-[10px] text-ink-muted font-normal">(1-100)</span>
                              </Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="text"
                                  placeholder="Contoh: 1-10, 13, 16, 20, 22"
                                  value={item.packListInput}
                                  disabled={item.isLocked}
                                  onChange={(e) => updateBatchItem(item.id, { packListInput: e.target.value })}
                                  className={`font-mono text-xs tabular-nums ${
                                    !item.parsed.isValid && item.packListInput.trim() !== ''
                                      ? 'border-destructive focus-visible:ring-destructive'
                                      : ''
                                  }`}
                                />
                                <PackMatrixPopover
                                  batchLabel={batchLabel}
                                  receivedPacks={item.receivedPackNumbers}
                                  selectedPacks={item.parsed.numbers}
                                  disabled={item.isLocked || (!item.selectedBatch && !item.isNewBatch)}
                                  onTogglePack={(packNum) => handleTogglePack(item.id, packNum)}
                                />
                              </div>
                              {!item.parsed.isValid && item.packListInput.trim() !== '' && (
                                <p className="text-[10px] text-destructive">{item.parsed.error}</p>
                              )}
                            </div>

                            {/* Live Calculator Baris */}
                            <div className="md:col-span-3 rounded-lg bg-surface-subtle dark:bg-surface-subtle-dark p-2 border border-border/50 dark:border-border-dark/50 text-right">
                              <div className="text-[10px] text-ink-muted flex items-center justify-end gap-1">
                                <Calculator className="h-3 w-3 text-emerald" strokeWidth={1.75} />
                                <span>Subtotal Batch</span>
                              </div>
                              <div className="text-xs font-bold font-mono tabular-nums text-ink dark:text-ink-dark mt-0.5">
                                {item.parsed.totalPack} Pack
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald dark:text-emerald-400">
                                {formatBilyet(item.parsed.jumlahBilyet)}
                              </div>
                            </div>
                          </div>

                          {/* Alert Konflik Nomor Pack yang Sudah Diterima */}
                          {item.hasConflict && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive flex items-center gap-1.5 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                              <span>
                                Pack #{item.conflictingPacks.join(', #')} sudah pernah diterima sebelumnya pada batch ini! Mohon hapus nomor pack yang bentrok.
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Form Registrasi Batch Baru Inline */
                        <div className="space-y-3 rounded-lg border border-emerald/30 bg-emerald/5 dark:bg-emerald/10 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald dark:text-emerald-400">
                              Registrasi Batch Baru
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateBatchItem(item.id, { isNewBatch: false })}
                              className="text-[11px] h-6 px-2 text-ink-secondary hover:text-ink dark:hover:text-ink-dark cursor-pointer"
                            >
                              Batal (Pilih Batch Terdaftar)
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-xs">Nomor Batch / Order</Label>
                              <Input
                                type="text"
                                placeholder="Contoh: ORD-101"
                                value={item.newNomorBatch}
                                onChange={(e) => updateBatchItem(item.id, { newNomorBatch: e.target.value })}
                                className="font-mono text-xs uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Seri</Label>
                              <Input
                                type="text"
                                placeholder="AA-BA"
                                value={item.newSeri}
                                onChange={(e) => updateBatchItem(item.id, { newSeri: e.target.value.toUpperCase() })}
                                className="font-mono text-xs uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Kepala</Label>
                              <Input
                                type="text"
                                placeholder="0"
                                value={item.newKepala}
                                onChange={(e) => updateBatchItem(item.id, { newKepala: e.target.value })}
                                className="font-mono text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Pecahan / Emisi</Label>
                              <Select
                                value={item.newEmisiId}
                                onValueChange={(val) => updateBatchItem(item.id, { newEmisiId: val })}
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Pilih Pecahan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {emisiList.map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>
                                      {e.denominasi?.nama} ({formatRupiah(e.denominasi?.nilai)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1 border-t border-emerald/20">
                            <div className="sm:col-span-8 space-y-1">
                              <Label className="text-xs font-medium">Nomor Pack (1-100)</Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="text"
                                  placeholder="Contoh: 1-10, 13, 16, 20, 22"
                                  value={item.packListInput}
                                  onChange={(e) => updateBatchItem(item.id, { packListInput: e.target.value })}
                                  className="font-mono text-xs tabular-nums"
                                />
                                <PackMatrixPopover
                                  batchLabel={item.newNomorBatch || 'Batch Baru'}
                                  receivedPacks={[]}
                                  selectedPacks={item.parsed.numbers}
                                  onTogglePack={(packNum) => handleTogglePack(item.id, packNum)}
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-4 rounded-lg bg-surface dark:bg-surface-dark p-2 text-right border border-border dark:border-border-dark">
                              <div className="text-[10px] text-ink-muted">Subtotal Batch</div>
                              <div className="text-xs font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                                {item.parsed.totalPack} Pack
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald dark:text-emerald-400">
                                {formatBilyet(item.parsed.jumlahBilyet)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Posisi Tombol Tambah Batch: Tepat di bawah baris formulir batch */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBatchItem}
                  className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer text-emerald hover:text-emerald border-dashed border-emerald/40 hover:bg-emerald/10 hover:border-emerald"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  + Tambah Batch ke Segel Ini
                </Button>
              </div>
            </div>

            {/* 3. Catatan Penerimaan (Diposisikan di Bawah) */}
            <div className="space-y-1 pt-1">
              <Label htmlFor="catatan" className="text-xs font-medium">
                Catatan / Keterangan (Opsional)
              </Label>
              <Input
                id="catatan"
                type="text"
                placeholder="Catatan kondisi serah terima, nomor referensi tambahan, dsb."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* 4. Widget Akumulasi Global Seluruh Batch dalam Segel */}
            <div className="rounded-xl border border-emerald/40 bg-emerald/5 dark:bg-emerald/10 p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-emerald" strokeWidth={1.75} />
                  <span>Akumulasi Global Isi Wadah Segel</span>
                </div>
                <div className="text-[11px] text-ink-muted">
                  Memuat <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{batchItems.length}</strong> Batch produksi
                </div>
              </div>

              <div className="text-right">
                <div data-testid="live-total-pack" className="text-sm font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                  {globalTotalPack} Pack
                </div>
                <div data-testid="live-total-bilyet" className="text-sm font-bold font-mono tabular-nums text-emerald dark:text-emerald-400">
                  {formatBilyet(globalTotalBilyet)}
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="pt-3 border-t border-border dark:border-border-dark flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="bonMasukForm"
            disabled={isSubmitting || isLoadingBatches || !allValid || hasAnyConflict || globalTotalPack === 0}
            className="cursor-pointer"
          >
            {isLoadingBatches ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Memeriksa Pack...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Catat Bon Masuk'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
