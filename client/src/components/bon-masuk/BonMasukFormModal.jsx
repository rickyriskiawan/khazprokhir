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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createBonMasuk, updateBonMasuk } from '@/services/bonMasukService';
import { formatBilyet } from '@/utils/formatters';
import { Calculator, AlertCircle, Loader2 } from 'lucide-react';

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

  // Mode batch: 'existing' vs 'new'
  const [batchMode, setBatchMode] = useState('existing');

  // Form states
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [newNomorBatch, setNewNomorBatch] = useState('');
  const [newSeri, setNewSeri] = useState('');
  const [newKepala, setNewKepala] = useState('');
  const [newTahunAnggaran, setNewTahunAnggaran] = useState(new Date().getFullYear());
  const [newEmisiId, setNewEmisiId] = useState('');

  const [noSegel, setNoSegel] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(new Date().toISOString().split('T')[0]);
  const [jamMasuk, setJamMasuk] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [shiftId, setShiftId] = useState('');
  const [packDari, setPackDari] = useState(1);
  const [packSampai, setPackSampai] = useState(100);
  const [kategoriPenerimaan, setKategoriPenerimaan] = useState('MASINAL');
  const [jenisMesinSortir, setJenisMesinSortir] = useState('');
  const [catatan, setCatatan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync initialData when opening in Edit mode
  useEffect(() => {
    if (initialData) {
      setBatchMode('existing');
      setSelectedBatchId(initialData.batch_id ? String(initialData.batch_id) : '');
      setNoSegel(initialData.no_segel || '');
      setTanggalMasuk(
        initialData.tanggal_masuk
          ? String(initialData.tanggal_masuk).split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setJamMasuk(initialData.jam_masuk || '08:00');
      setShiftId(initialData.shift_id ? String(initialData.shift_id) : '');
      setPackDari(initialData.pack_dari !== undefined ? initialData.pack_dari : 1);
      setPackSampai(initialData.pack_sampai !== undefined ? initialData.pack_sampai : 100);
      setKategoriPenerimaan(initialData.kategori_penerimaan || 'MASINAL');
      setJenisMesinSortir(initialData.jenis_mesin_sortir || '');
      setCatatan(initialData.catatan || '');
      setErrorMsg(null);
    } else {
      // Reset form on Create
      setBatchMode('existing');
      setSelectedBatchId(batches.length > 0 ? String(batches[0].id) : '');
      setNewNomorBatch('');
      setNewSeri('');
      setNewKepala('0');
      setNewTahunAnggaran(new Date().getFullYear());
      setNewEmisiId(emisiList.length > 0 ? String(emisiList[0].id) : '');
      setNoSegel('');
      setTanggalMasuk(new Date().toISOString().split('T')[0]);
      const now = new Date();
      setJamMasuk(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setShiftId(shifts.length > 0 ? String(shifts[0].id) : '1');
      setPackDari(1);
      setPackSampai(100);
      setKategoriPenerimaan('MASINAL');
      setJenisMesinSortir('');
      setCatatan('');
      setErrorMsg(null);
    }
  }, [initialData, open, batches, shifts, emisiList]);

  // Live Calculations (Total Pack & Total Bilyet)
  const packDariNum = parseInt(packDari, 10);
  const packSampaiNum = parseInt(packSampai, 10);
  const isValidRange =
    !isNaN(packDariNum) &&
    !isNaN(packSampaiNum) &&
    packDariNum >= 1 &&
    packSampaiNum <= 100 &&
    packDariNum <= packSampaiNum;

  const totalPack = isValidRange ? packSampaiNum - packDariNum + 1 : 0;
  const totalBilyet = totalPack * 45000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!noSegel.trim()) {
      setErrorMsg('Nomor segel fisik wajib diisi.');
      return;
    }

    if (!isValidRange) {
      setErrorMsg('Rentang pack tidak valid. Nomor pack awal harus 1-100 dan tidak boleh lebih besar dari pack akhir.');
      return;
    }

    if (!shiftId) {
      setErrorMsg('Shift kerja wajib dipilih.');
      return;
    }

    let payload = {
      no_segel: noSegel.trim(),
      tanggal_masuk: tanggalMasuk,
      jam_masuk: jamMasuk,
      shift_id: parseInt(shiftId, 10),
      pack_dari: packDariNum,
      pack_sampai: packSampaiNum,
      kategori_penerimaan: kategoriPenerimaan,
      jenis_mesin_sortir: jenisMesinSortir.trim() ? jenisMesinSortir.trim() : null,
      catatan: catatan.trim() ? catatan.trim() : null,
    };

    if (batchMode === 'existing') {
      const selectedBatch = batches.find((b) => String(b.id) === String(selectedBatchId));
      if (!selectedBatch) {
        setErrorMsg('Silakan pilih salah satu batch terdaftar.');
        return;
      }
      payload.nomor_batch = selectedBatch.nomor_batch;
      payload.tahun_anggaran = selectedBatch.tahun_anggaran;
    } else {
      // Registrasi batch baru
      if (!newNomorBatch.trim() || !newSeri.trim() || !newKepala.trim() || !newEmisiId) {
        setErrorMsg('Semua data registrasi batch baru (Nomor, Seri, Kepala, Emisi) wajib diisi.');
        return;
      }
      payload.nomor_batch = newNomorBatch.trim();
      payload.seri = newSeri.trim();
      payload.kepala = newKepala.trim();
      payload.tahun_anggaran = parseInt(newTahunAnggaran, 10);
      payload.emisi_id = parseInt(newEmisiId, 10);
    }

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Data Bon Masuk Khazai' : 'Input Penerimaan Bon Masuk Khazai'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Koreksi nomor segel, metadata serah terima, atau penyesuaian alokasi rentang nomor pack.'
              : 'Pencatatan penerimaan fisik uang kertas dari Khazanah Awal (Khazai) dan alokasi pack batch.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bagian 1: Pengelolaan Batch */}
          {!isEdit && (
            <div className="space-y-2 rounded-xl border border-border p-3 dark:border-border-dark bg-surface-subtle/50 dark:bg-surface-subtle-dark/50">
              <Label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                Identitas Batch Uang Kertas
              </Label>
              <Tabs value={batchMode} onValueChange={setBatchMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Pilih Batch Terdaftar</TabsTrigger>
                  <TabsTrigger value="new">Registrasi Batch Baru</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="batch-select">Batch Produksi</Label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger id="batch-select">
                        <SelectValue placeholder="Pilih batch yang tersedia" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.nomor_batch} ({b.seri} - {b.kepala}) — {b.emisi?.denominasi?.nama || 'Emisi'}{' '}
                            TA {b.tahun_anggaran}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="new" className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-nomor-batch">Nomor Batch / Order</Label>
                      <Input
                        id="new-nomor-batch"
                        placeholder="Contoh: ORD-2026-001"
                        value={newNomorBatch}
                        onChange={(e) => setNewNomorBatch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-tahun">Tahun Anggaran</Label>
                      <Input
                        id="new-tahun"
                        type="number"
                        value={newTahunAnggaran}
                        onChange={(e) => setNewTahunAnggaran(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-seri">Seri</Label>
                      <Input
                        id="new-seri"
                        placeholder="AA-BA"
                        value={newSeri}
                        onChange={(e) => setNewSeri(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-kepala">Kepala</Label>
                      <Input
                        id="new-kepala"
                        placeholder="0"
                        value={newKepala}
                        onChange={(e) => setNewKepala(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-emisi">Pecahan / Emisi</Label>
                      <Select value={newEmisiId} onValueChange={setNewEmisiId}>
                        <SelectTrigger id="new-emisi">
                          <SelectValue placeholder="Pilih Pecahan" />
                        </SelectTrigger>
                        <SelectContent>
                          {emisiList.map((em) => (
                            <SelectItem key={em.id} value={String(em.id)}>
                              {em.denominasi?.nama} ({em.kode_emisi})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Bagian 2: Metadata Bon & Segel Fisik */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="no-segel">
                Nomor Segel Fisik <span className="text-red-500">*</span>
              </Label>
              <Input
                id="no-segel"
                placeholder="Contoh: SGL-20260915-001"
                value={noSegel}
                onChange={(e) => setNoSegel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shift-select">
                Shift Kerja <span className="text-red-500">*</span>
              </Label>
              <Select value={shiftId} onValueChange={setShiftId}>
                <SelectTrigger id="shift-select">
                  <SelectValue placeholder="Pilih Shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nama_shift} ({s.jam_mulai} - {s.jam_selesai})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tanggal-masuk">Tanggal Masuk</Label>
              <Input
                id="tanggal-masuk"
                type="date"
                value={tanggalMasuk}
                onChange={(e) => setTanggalMasuk(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="jam-masuk">Jam Masuk (24-Jam)</Label>
              <Input
                id="jam-masuk"
                type="time"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Bagian 3: Rentang Pack & Live Calculation Widget */}
          <div className="rounded-xl border border-border p-3.5 dark:border-border-dark space-y-3 bg-surface dark:bg-surface-dark">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                Alokasi Rentang Pack (1 s/d 100)
              </Label>
              <span className="text-xs text-ink-muted">1 Pack = 45.000 Bilyet</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pack-dari">Pack Dari (Awal)</Label>
                <Input
                  id="pack-dari"
                  type="number"
                  min="1"
                  max="100"
                  value={packDari}
                  onChange={(e) => setPackDari(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pack-sampai">Pack Sampai (Akhir)</Label>
                <Input
                  id="pack-sampai"
                  type="number"
                  min="1"
                  max="100"
                  value={packSampai}
                  onChange={(e) => setPackSampai(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </div>
            </div>

            {/* LIVE CALCULATION WIDGET (Strict: Total Pack & Total Bilyet) */}
            <div className="rounded-xl bg-surface-subtle p-3 dark:bg-surface-subtle-dark border border-border/60 dark:border-border-dark/60">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted mb-2">
                <Calculator className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />
                <span>Kalkulasi Real-Time Penerimaan</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark">Total Pack</div>
                  <div
                    data-testid="live-total-pack"
                    className="text-lg font-bold font-mono tabular-nums text-ink dark:text-white"
                  >
                    {isValidRange ? `${totalPack} Pack` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-secondary dark:text-ink-secondary-dark">Total Bilyet</div>
                  <div
                    data-testid="live-total-bilyet"
                    className="text-lg font-bold font-mono tabular-nums text-emerald dark:text-emerald-light"
                  >
                    {isValidRange ? formatBilyet(totalBilyet) : '-'}
                  </div>
                </div>
              </div>
              {!isValidRange && (
                <p className="mt-2 text-xs text-red-500">
                  Rentang tidak valid: Pack Dari harus ≤ Pack Sampai (rentang 1–100).
                </p>
              )}
            </div>
          </div>

          {/* Bagian 4: Kategori & Mesin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kategori-penerimaan">Kategori Penerimaan</Label>
              <Select value={kategoriPenerimaan} onValueChange={setKategoriPenerimaan}>
                <SelectTrigger id="kategori-penerimaan">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASINAL">MASINAL</SelectItem>
                  <SelectItem value="PARSIAL">PARSIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesin-sortir">Jenis Mesin Sortir (Opsional)</Label>
              <Input
                id="mesin-sortir"
                placeholder="Contoh: BPS-01 atau CUTTER"
                value={jenisMesinSortir}
                onChange={(e) => setJenisMesinSortir(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="catatan">Catatan / Keterangan Khusus</Label>
            <Input
              id="catatan"
              placeholder="Catatan kondisi serah terima uang kertas..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValidRange} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                  Menyimpan...
                </>
              ) : isEdit ? (
                'Simpan Perubahan'
              ) : (
                'Catat Bon Masuk'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

