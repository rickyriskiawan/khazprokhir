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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import KemasFormModal from '@/components/kemas/KemasFormModal';
import { getKemasList, getKemasSummary } from '@/services/kemasService';
import { getMasterShift } from '@/services/bonMasukService';
import { formatBilyet, formatIndonesianDate } from '@/utils/formatters';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import { useAuthStore } from '@/stores/authStore';
import { getKemasStatusConfig, formatDoosRangeCompact } from '@/components/kemas/kemasConstants';
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Boxes,
  PackageCheck,
  CalendarRange,
} from 'lucide-react';

export default function HasilKemasPage() {
  const { user } = useAuthStore();
  const canCreate = user?.role === 'OPERATOR' || user?.role === 'SUPERVISOR';

  // Data states
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState('all');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Master data
  const [shifts, setShifts] = useState([]);

  // Modal
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    async function loadMaster() {
      try {
        const shiftRes = await getMasterShift();
        setShifts(shiftRes || []);
      } catch (err) {
        console.error('Failed to load master data for kemas:', err);
      }
    }
    loadMaster();
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      setRefreshing(true);

      const filterParams = {};
      if (searchTerm.trim()) filterParams.search = searchTerm.trim();
      if (selectedShift !== 'all') filterParams.shift_id = selectedShift;
      if (tanggalDari) filterParams.tanggal_dari = tanggalDari;
      if (tanggalSampai) filterParams.tanggal_sampai = tanggalSampai;

      const [listRes, summaryRes] = await Promise.all([
        getKemasList({ ...filterParams, page: currentPage, limit: 15 }),
        getKemasSummary(filterParams),
      ]);

      setRecords(listRes.data || []);
      if (listRes.meta) setMeta(listRes.meta);
      if (summaryRes) setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load hasil kemas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, selectedShift, tanggalDari, tanggalSampai]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedShift('all');
    setTanggalDari('');
    setTanggalSampai('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) || selectedShift !== 'all' || Boolean(tanggalDari) || Boolean(tanggalSampai);

  const siapKemas = summary?.siap_kemas;
  const hasilKemas = summary?.hasil_kemas;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink-dark flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Pengemasan Doos & Hasil Kemas
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Pencatatan pengemasan pack tersortir ke dalam doos sesuai rasio fisik resmi 4 Pack = 9 Doos.
          </p>
        </div>

        {canCreate && (
          <Button
            type="button"
            variant="emerald"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="h-10 px-4 text-xs font-semibold shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Catat Hasil Kemas
          </Button>
        )}
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Siap Kemas (Antrian WIP)</span>
            <span className="text-xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
              {siapKemas?.total_doos?.toLocaleString('id-ID') || 0} Doos
            </span>
            <span className="text-[11px] text-ink-muted block mt-0.5 font-mono tabular-nums">
              {siapKemas?.total_kemas || 0} kemas • {siapKemas?.total_pack || 0} Pack
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PackageCheck className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Hasil Kemas (Selesai)</span>
            <span className="text-xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
              {hasilKemas?.total_doos?.toLocaleString('id-ID') || 0} Doos
            </span>
            <span className="text-[11px] text-ink-muted block mt-0.5 font-mono tabular-nums">
              {hasilKemas?.total_kemas || 0} kemas • {formatBilyet(hasilKemas?.total_bilyet || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari Nomor Batch / Seri..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <Select
            value={selectedShift}
            onValueChange={(val) => {
              setSelectedShift(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Semua Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Shift</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nama || s.nama_shift}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <CalendarRange className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="date"
              aria-label="Tanggal Mulai"
              value={tanggalDari}
              onChange={(e) => {
                setTanggalDari(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <CalendarRange className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="date"
                aria-label="Tanggal Selesai"
                value={tanggalSampai}
                onChange={(e) => {
                  setTanggalSampai(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-9 text-xs"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={loadRecords}
              disabled={refreshing}
              aria-label="Segarkan Data Hasil Kemas"
              className="h-9 w-9 shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-canvas dark:bg-canvas-dark/50">
              <TableHead className="text-xs font-semibold">Tanggal</TableHead>
              <TableHead className="text-xs font-semibold">Rentang No. Doos</TableHead>
              <TableHead className="text-xs font-semibold">Batch & Seri</TableHead>
              <TableHead className="text-xs font-semibold">Pack</TableHead>
              <TableHead className="text-xs font-semibold">Penginput</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-xs text-ink-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Memuat data hasil kemas...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-xs text-ink-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-ink-muted/60" />
                    <span className="font-medium text-ink dark:text-ink-dark">Belum Ada Riwayat Kemas</span>
                    <p className="max-w-sm text-[11px]">
                      Tidak ada catatan pengemasan doos yang sesuai dengan kriteria filter saat ini.
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Reset Filter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              records.map((row) => {
                const statusCfg = getKemasStatusConfig(row.status);
                const denomNama = row.batch?.emisi?.denominasi?.nama || row.denominasi?.nama || '';
                const penginput = row.operator?.full_name || row.operator?.username || '-';

                return (
                  <TableRow key={row.id} className="hover:bg-canvas dark:bg-canvas-dark/40 transition-colors">
                    <TableCell className="text-xs">
                      <span className="font-medium text-ink dark:text-ink-dark">
                        {formatIndonesianDate(row.tanggal_kemas)}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {row.shift?.nama || row.shift?.nama_shift || `Shift ${row.shift_id}`}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={1.75} />
                        <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                          {formatDoosRangeCompact(row.no_doos_awal, row.no_doos_akhir)}
                        </span>
                      </div>
                      <span className="block text-[11px] text-ink-muted font-mono tabular-nums">
                        {row.total_doos} Doos
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                          {row.batch?.nomor_batch}
                        </span>
                        {denomNama && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              DENOM_COLOR_MAP[denomNama] || ''
                            }`}
                          >
                            {denomNama}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-muted font-mono tabular-nums">
                        {row.batch?.seri}
                        {row.batch?.kepala || ''} • TA {row.batch?.tahun_anggaran}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs font-mono tabular-nums">
                      <span className="font-semibold text-ink dark:text-ink-dark block">
                        {row.total_pack} Pack
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {formatBilyet(row.total_bilyet)}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-medium text-ink dark:text-ink-dark block">{penginput}</span>
                      {row.proses_sortir_id && (
                        <span className="text-[11px] text-ink-muted font-mono tabular-nums">
                          Sesi Sortir #{row.proses_sortir_id}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge variant={statusCfg.badgeVariant} className="text-[10px] font-bold uppercase">
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border dark:border-border-dark bg-canvas dark:bg-canvas-dark/30 flex items-center justify-between text-xs text-ink-muted">
            <span>
              Menampilkan {records.length} dari {meta.total} hasil kemas
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Sebelumnya
              </Button>
              <span className="font-mono tabular-nums px-2">
                Halaman {currentPage} dari {meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Berikutnya
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <KemasFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        shifts={shifts}
        onSuccess={() => {
          loadRecords();
        }}
      />
    </div>
  );
}
