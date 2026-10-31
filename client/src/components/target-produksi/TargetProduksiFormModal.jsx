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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  createTargetProduksiGroup,
  updateTargetProduksiGroup,
  calculateDoosCeiling,
} from '@/services/targetProduksiService';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import { AlertCircle, Target } from 'lucide-react';

export default function TargetProduksiFormModal({
  isOpen,
  onClose,
  onSuccess,
  denominasiList = [],
  emisiList = [],
  editingGroup = null,
}) {
  const isEditMode = Boolean(editingGroup);
  const currentYear = new Date().getFullYear();

  const [tahunAnggaran, setTahunAnggaran] = useState(String(currentYear));
  const [tahunEmisi, setTahunEmisi] = useState('2022');
  const [catatan, setCatatan] = useState('');
  const [bilyetByDenomId, setBilyetByDenomId] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Daftar tahun emisi unik dari Master Emisi
  const availableEmisiYears = useMemo(() => {
    const years = Array.from(
      new Set(
        (emisiList || [])
          .map((e) => String(e.tahun || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => Number(b) - Number(a));
    return years.length > 0 ? years : ['2022'];
  }, [emisiList]);

  const sortedDenominasi = useMemo(() => {
    return [...(denominasiList || [])].sort((a, b) => b.nilai - a.nilai);
  }, [denominasiList]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');

    if (editingGroup) {
      setTahunAnggaran(String(editingGroup.tahun_anggaran));
      setTahunEmisi(String(editingGroup.tahun_emisi));
      setCatatan(editingGroup.catatan || '');

      const initialMap = {};
      for (const denom of sortedDenominasi) {
        const found = (editingGroup.items || []).find(
          (i) => Number(i.denominasi_id) === Number(denom.id)
        );
        initialMap[denom.id] = found ? String(found.target_bilyet || '0') : '0';
      }
      setBilyetByDenomId(initialMap);
    } else {
      setTahunAnggaran(String(currentYear));
      setTahunEmisi(availableEmisiYears[0] || '2022');
      setCatatan('');
      const emptyMap = {};
      for (const denom of sortedDenominasi) {
        emptyMap[denom.id] = '';
      }
      setBilyetByDenomId(emptyMap);
    }
  }, [isOpen, editingGroup, sortedDenominasi, availableEmisiYears, currentYear]);

  const handleBilyetChange = (denomId, rawValue) => {
    const cleanDigits = String(rawValue || '').replace(/\D/g, '');
    setBilyetByDenomId((prev) => ({
      ...prev,
      [denomId]: cleanDigits,
    }));
  };

  const formatInputThousand = (digitsStr) => {
    if (!digitsStr) return '';
    try {
      return BigInt(digitsStr).toLocaleString('id-ID');
    } catch {
      return digitsStr;
    }
  };

  const summaryTotals = useMemo(() => {
    let totalBilyet = 0n;
    let totalDoos = 0;

    for (const denom of sortedDenominasi) {
      const clean = String(bilyetByDenomId[denom.id] || '0').replace(/\D/g, '');
      const b = clean ? BigInt(clean) : 0n;
      totalBilyet += b;
      totalDoos += calculateDoosCeiling(b);
    }

    return {
      totalBilyet: totalBilyet.toString(),
      totalDoos,
    };
  }, [sortedDenominasi, bilyetByDenomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const taInt = parseInt(tahunAnggaran, 10);
    const teInt = parseInt(tahunEmisi, 10);

    if (isNaN(taInt) || taInt < 2000 || taInt > 2100) {
      setErrorMsg('Tahun Anggaran harus berupa angka 4 digit yang valid (2000–2100).');
      return;
    }
    if (isNaN(teInt) || teInt < 2000 || teInt > 2100) {
      setErrorMsg('Tahun Emisi harus berupa angka 4 digit yang valid (2000–2100).');
      return;
    }

    const itemsPayload = sortedDenominasi.map((denom) => {
      const clean = String(bilyetByDenomId[denom.id] || '0').replace(/\D/g, '');
      return {
        denominasi_id: denom.id,
        target_bilyet: clean || '0',
      };
    });

    const hasPositive = itemsPayload.some((i) => BigInt(i.target_bilyet || '0') > 0n);
    if (!hasPositive) {
      setErrorMsg('Minimal satu pecahan harus memiliki Target Bilyet lebih dari 0.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditMode) {
        await updateTargetProduksiGroup(taInt, teInt, {
          catatan: catatan.trim() || null,
          items: itemsPayload,
        });
      } else {
        await createTargetProduksiGroup({
          tahun_anggaran: taInt,
          tahun_emisi: teInt,
          catatan: catatan.trim() || null,
          items: itemsPayload,
        });
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal menyimpan Target Produksi.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const twoDigitEmisi = String(tahunEmisi || '22').slice(-2);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {isEditMode
              ? `Edit Target Produksi — TA ${editingGroup.tahun_anggaran} (TE ${editingGroup.tahun_emisi})`
              : 'Tambah Target Produksi'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Masukkan kuota produksi dalam satuan Bilyet untuk ketujuh pecahan. Sisa bilyet di bawah 20.000 otomatis dibulatkan menjadi 1 Doos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="input-tahun-anggaran" className="text-xs">
                Tahun Anggaran
              </Label>
              <Input
                id="input-tahun-anggaran"
                aria-label="Tahun Anggaran"
                type="number"
                min={2000}
                max={2100}
                value={tahunAnggaran}
                onChange={(e) => setTahunAnggaran(e.target.value)}
                disabled={isEditMode}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-tahun-emisi" className="text-xs">
                Tahun Emisi
              </Label>
              <Input
                id="input-tahun-emisi"
                aria-label="Tahun Emisi"
                type="number"
                min={2000}
                max={2100}
                value={tahunEmisi}
                onChange={(e) => setTahunEmisi(e.target.value)}
                disabled={isEditMode}
                placeholder="Contoh: 2022 atau 2026"
                className="h-8 text-xs font-mono"
                required
              />
              {!isEditMode && availableEmisiYears.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[11px] text-ink-muted mr-1">
                    Master Emisi:
                  </span>
                  {availableEmisiYears.map((yr) => (
                    <Badge
                      key={yr}
                      variant={String(tahunEmisi) === String(yr) ? 'emerald' : 'outline'}
                      className="cursor-pointer text-[10px] px-1.5 py-0"
                      onClick={() => setTahunEmisi(String(yr))}
                    >
                      TE {yr}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabel Input Target per Pecahan */}
          <div className="rounded-lg border border-border dark:border-border-dark overflow-hidden">
            <Table className="text-xs">
              <TableHeader className="bg-surface-subtle dark:bg-surface-subtle-dark">
                <TableRow>
                  <TableHead className="h-9 px-3 py-2 w-[130px]">
                    Pecahan
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2">
                    Target (Bilyet)
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-right w-[140px]">
                    Target (Doos)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDenominasi.map((denom) => {
                  const rawBilyet = bilyetByDenomId[denom.id] ?? '';
                  const doosPreview = calculateDoosCeiling(rawBilyet || '0');
                  const sandiPreview = `${denom.nama}'${twoDigitEmisi}`;
                  const colorToken =
                    DENOM_COLOR_MAP[denom.nama] || DENOM_COLOR_MAP.Y;

                  return (
                    <TableRow key={denom.id}>
                      <TableCell className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-semibold border ${colorToken?.badge || ''}`}
                        >
                          {sandiPreview}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <Input
                          aria-label={`Target Bilyet ${denom.nama}`}
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formatInputThousand(rawBilyet)}
                          onChange={(e) =>
                            handleBilyetChange(denom.id, e.target.value)
                          }
                          className="h-8 text-xs font-mono text-right"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-xs font-medium">
                        {doosPreview.toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="border-t-2 font-semibold">
                <TableRow>
                  <TableCell className="px-3 py-2 text-xs font-bold">Total</TableCell>
                  <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-xs font-bold">
                    {BigInt(summaryTotals.totalBilyet).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {summaryTotals.totalDoos.toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="input-catatan-target" className="text-xs">
              Catatan (Opsional)
            </Label>
            <Input
              id="input-catatan-target"
              aria-label="Catatan Target Produksi"
              type="text"
              placeholder="Catatan tambahan untuk Tahun Emisi ini..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="emerald"
              size="sm"
              disabled={submitting}
              className="h-8 text-xs font-semibold"
            >
              {submitting
                ? 'Menyimpan...'
                : isEditMode
                  ? 'Simpan Perubahan'
                  : 'Simpan Target Produksi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
