import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import BonMasukFormModal from '@/components/bon-masuk/BonMasukFormModal';
import BonMasukDetailModal from '@/components/bon-masuk/BonMasukDetailModal';
import BonMasukDeleteDialog from '@/components/bon-masuk/BonMasukDeleteDialog';
import {
  getBonMasukList,
  getBonMasukById,
  getTodayBonMasukSummary,
  getBatches,
  getMasterDenominasi,
  getMasterShift,
  getMasterEmisi,
} from '@/services/bonMasukService';
import { formatBilyet, formatIndonesianDate } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Boxes,
  Layers,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function BonMasukPage() {
  const { user } = useAuthStore();
  const canModify = user?.role === 'OPERATOR' || user?.role === 'SUPERVISOR';

  // State List & Data
  const [bonList, setBonList] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [todaySummary, setTodaySummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDenom, setSelectedDenom] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Master Data Options
  const [batches, setBatches] = useState([]);
  const [denominasiList, setDenominasiList] = useState([]);
  const [shiftList, setShiftList] = useState([]);
  const [emisiList, setEmisiList] = useState([]);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBon, setEditingBon] = useState(null);
  const [viewingBon, setViewingBon] = useState(null);
  const [deletingBon, setDeletingBon] = useState(null);

  // Load master data once on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [batchRes, denomRes, shiftRes, emisiRes] = await Promise.all([
          getBatches(),
          getMasterDenominasi(),
          getMasterShift(),
          getMasterEmisi(),
        ]);
        setBatches(batchRes || []);
        setDenominasiList(denomRes || []);
        setShiftList(shiftRes || []);
        setEmisiList(emisiRes || []);
      } catch (err) {
        console.error('Failed to load master data for bon-masuk:', err);
      }
    }
    loadMasterData();
  }, []);

  // Fetch bon masuk data & today summary
  const fetchData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const params = {
        page: currentPage,
        limit: 15,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (selectedDenom !== 'all') {
        params.denominasi_id = selectedDenom;
      }
      if (selectedShift !== 'all') {
        params.shift_id = selectedShift;
      }
      if (filterDate) {
        params.tanggal_masuk = filterDate;
      }

      const [listRes, summaryRes] = await Promise.all([
        getBonMasukList(params),
        getTodayBonMasukSummary(filterDate || undefined),
      ]);

      setBonList(listRes.data || []);
      setMeta(listRes.meta || { page: 1, limit: 15, total: 0, totalPages: 1 });
      setTodaySummary(summaryRes);
    } catch (err) {
      setErrorMsg(err.userMessage || err.message || 'Gagal memuat data bon masuk.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, searchTerm, selectedDenom, selectedShift, filterDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDenom('all');
    setSelectedShift('all');
    setFilterDate('');
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setEditingBon(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (bon) => {
    if (!bon.packs) {
      try {
        const fullBon = await getBonMasukById(bon.id);
        setEditingBon(fullBon.data || fullBon);
      } catch {
        setEditingBon(bon);
      }
    } else {
      setEditingBon(bon);
    }
    setIsFormOpen(true);
  };

  const handleOpenDetail = (bon) => {
    setViewingBon(bon);
  };

  const handleOpenDelete = (bon) => {
    setDeletingBon(bon);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">
              Penerimaan Bon Masuk Khazai
            </h1>
            <Badge variant="emerald" className="text-xs uppercase font-semibold">
              Modul 1
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Pencatatan serah terima fisik uang kertas dari Khazanah Awal, verifikasi nomor segel, dan alokasi batch 100 pack.
          </p>
        </div>

        {canModify && (
          <Button onClick={handleOpenCreate} className="shadow-xs cursor-pointer">
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Input Bon Masuk
          </Button>
        )}
      </div>

      {/* 2. Mini KPI Header Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border dark:border-border-dark shadow-xs bg-surface dark:bg-surface-dark">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Total Bon Masuk Hari Ini</span>
              <div className="text-2xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                {isLoading ? <Skeleton className="h-7 w-16" /> : todaySummary?.total_bon ?? 0}
                <span className="text-sm font-normal text-ink-muted ml-1.5 font-sans">Dokumen</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald/10 dark:bg-emerald/20 flex items-center justify-center text-emerald dark:text-emerald-400">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border dark:border-border-dark shadow-xs bg-surface dark:bg-surface-dark">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Total Pack Diterima Hari Ini</span>
              <div className="text-2xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
                {isLoading ? <Skeleton className="h-7 w-20" /> : todaySummary?.total_pack ?? 0}
                <span className="text-sm font-normal text-ink-muted ml-1.5 font-sans">Pack</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Boxes className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border dark:border-border-dark shadow-xs bg-surface dark:bg-surface-dark">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Total Bilyet Diterima Hari Ini</span>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald dark:text-emerald-400">
                {isLoading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  formatBilyet(todaySummary?.total_bilyet || 0)
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Error Alert if any */}
      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          <AlertTitle>Kesalahan Memuat Data</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs dark:border-border-dark dark:bg-surface-dark space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Pencarian Segel / Batch */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" strokeWidth={1.75} />
            <Input
              placeholder="Cari No. Segel / Batch..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Filter Denominasi */}
          <Select
            value={selectedDenom}
            onValueChange={(val) => {
              setSelectedDenom(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Pecahan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pecahan</SelectItem>
              {denominasiList.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Shift */}
          <Select
            value={selectedShift}
            onValueChange={(val) => {
              setSelectedShift(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Shift</SelectItem>
              {shiftList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nama || s.nama_shift}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Tanggal */}
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Pilih Tanggal"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-ink-muted">
            Ditemukan <strong className="text-ink dark:text-white font-mono">{meta.total}</strong> dokumen bon masuk
          </div>
          <div className="flex items-center gap-2">
            {(searchTerm || selectedDenom !== 'all' || selectedShift !== 'all' || filterDate) && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs h-8">
                Reset Filter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Segarkan
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Data Table (Shadcn UI) */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs dark:border-border-dark dark:bg-surface-dark overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-subtle/50 dark:bg-surface-subtle-dark/50">
                <TableHead className="w-[180px]">Tanggal & Jam</TableHead>
                <TableHead>Nomor Segel</TableHead>
                <TableHead>Batch / Seri / Kepala</TableHead>
                <TableHead>Pecahan</TableHead>
                <TableHead>Rentang Pack</TableHead>
                <TableHead>Total Volume</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="text-right w-[140px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : bonList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-ink-muted">
                      <Inbox className="h-8 w-8 opacity-40" strokeWidth={1.75} />
                      <p className="text-sm font-medium">Belum ada data bon masuk.</p>
                      {canModify && (
                        <Button variant="outline" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                          Input Bon Masuk Pertama
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bonList.map((bon) => {
                  const hasItems = bon.items && bon.items.length > 0;
                  const totalPacksInBon = bon.total_pack || (bon.pack_sampai ? bon.pack_sampai - bon.pack_dari + 1 : 0);
                  const batch = bon.batch || {};
                  const emisi = batch.emisi || {};
                  const denom = emisi.denominasi || {};
                  const shift = bon.shift || {};

                  return (
                    <TableRow key={bon.id} className="hover:bg-surface-subtle/50 dark:hover:bg-surface-subtle-dark/50">
                      <TableCell className="font-mono text-xs tabular-nums text-ink dark:text-ink-dark">
                        <div>{formatIndonesianDate(bon.tanggal_masuk)}</div>
                        <div className="text-ink-muted">{bon.jam_masuk} WIB</div>
                      </TableCell>

                      <TableCell>
                        <div className="font-mono tabular-nums font-semibold text-xs text-ink dark:text-ink-dark">
                          {bon.no_segel}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono tabular-nums">
                            TA {bon.tahun_anggaran || 2026}
                          </Badge>
                          <Badge
                            variant={bon.kategori_penerimaan === 'MASINAL' ? 'emerald' : 'amber'}
                            className="text-[10px] py-0 px-1"
                          >
                            {bon.kategori_penerimaan}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {hasItems ? (
                          <div className="space-y-1">
                            {bon.items.map((it, idx) => (
                              <div key={it.id || idx} className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                                  {it.batch?.nomor_batch || `B#${it.batch_id}`}
                                </span>
                                <span className="text-[11px] text-ink-muted font-mono tabular-nums">
                                  ({it.batch?.seri}{it.batch?.kepala})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono tabular-nums font-medium text-ink dark:text-ink-dark">{batch.nomor_batch || '-'}</div>
                            <div className="text-ink-muted font-mono tabular-nums text-[11px]">
                              Seri {batch.seri || '-'} ({batch.kepala || '-'})
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-emerald dark:text-emerald-400">
                        {hasItems ? (
                          <div className="space-y-1">
                            {bon.items.map((it, idx) => (
                              <div key={it.id || idx}>
                                {it.batch?.emisi?.denominasi?.nama || 'Uang Kertas'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          denom.nama || 'Uang Kertas'
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs tabular-nums text-ink dark:text-ink-dark">
                        {hasItems ? (
                          <div className="space-y-1">
                            {bon.items.map((it, idx) => (
                              <div key={it.id || idx} className="truncate max-w-[160px]" title={it.nomor_pack_list}>
                                Pack {it.nomor_pack_list}
                              </div>
                            ))}
                          </div>
                        ) : (
                          `Pack ${bon.pack_dari} - ${bon.pack_sampai}`
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-mono font-semibold tabular-nums text-ink dark:text-ink-dark">
                          {totalPacksInBon} Pack
                        </div>
                        <div className="text-ink-muted font-mono tabular-nums text-[11px]">
                          {formatBilyet(bon.jumlah_bilyet)}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                        {shift.nama || shift.nama_shift || 'Shift'}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => handleOpenDetail(bon)}
                            title="Lihat Detail Bon"
                          >
                            <Eye className="h-4 w-4 text-ink-muted hover:text-ink dark:hover:text-ink-dark" strokeWidth={1.75} />
                          </Button>
                          {canModify && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() => handleOpenEdit(bon)}
                                title="Edit Bon Masuk"
                              >
                                <Pencil className="h-4 w-4 text-blue-500 hover:text-blue-600" strokeWidth={1.75} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleOpenDelete(bon)}
                                title="Hapus / Batalkan Bon"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 dark:border-border-dark">
            <div className="text-xs text-ink-muted">
              Halaman <strong className="font-mono">{meta.page}</strong> dari{' '}
              <strong className="font-mono">{meta.totalPages}</strong>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="h-4 w-4 mr-1" strokeWidth={1.75} />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={currentPage >= meta.totalPages || isLoading}
                className="h-8 px-2.5"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Modals */}
      <BonMasukFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingBon}
        batches={batches}
        shifts={shiftList}
        denominasi={denominasiList}
        emisiList={emisiList}
        onSuccess={() => {
          fetchData();
          // Also refresh batches in case a new batch was registered
          getBatches().then((b) => setBatches(b || []));
        }}
      />

      <BonMasukDetailModal
        open={Boolean(viewingBon)}
        onOpenChange={(open) => !open && setViewingBon(null)}
        bonMasuk={viewingBon}
      />

      <BonMasukDeleteDialog
        open={Boolean(deletingBon)}
        onOpenChange={(open) => !open && setDeletingBon(null)}
        bonMasuk={deletingBon}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}

