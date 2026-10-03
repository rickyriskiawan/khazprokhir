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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SortirFormModal from '@/components/sortir/SortirFormModal';
import SortirDetailModal from '@/components/sortir/SortirDetailModal';
import SortirCancelDialog from '@/components/sortir/SortirCancelDialog';
import {
  getSortirList,
  getTodaySortirSummary,
  formatCompactPackRanges,
} from '@/services/sortirService';
import { getBatches, getMasterShift } from '@/services/bonMasukService';
import { formatBilyet, formatIndonesianDate } from '@/utils/formatters';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Layers,
  Coins,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function ProsesSortirPage() {
  const { user } = useAuthStore();
  const canCreate = user?.role === 'OPERATOR' || user?.role === 'SUPERVISOR';
  const canCancel = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';

  // Data states
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Master data
  const [batches, setBatches] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState(null);
  const [cancelingSession, setCancelingSession] = useState(null);

  // Fetch master data on mount
  useEffect(() => {
    async function loadMaster() {
      try {
        const [batchRes, shiftRes] = await Promise.all([
          getBatches(),
          getMasterShift(),
        ]);
        setBatches(batchRes || []);
        setShifts(shiftRes || []);
      } catch (err) {
        console.error('Failed to load master data for sortir:', err);
      }
    }
    loadMaster();
  }, []);

  // Fetch sortir sessions list
  const loadSessions = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = {
        page: currentPage,
        limit: 15,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedShift !== 'all') params.shift_id = selectedShift;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (filterDate) params.tanggal_sortir = filterDate;

      const [listRes, summaryRes] = await Promise.all([
        getSortirList(params),
        getTodaySortirSummary(),
      ]);

      setSessions(listRes.data || []);
      if (listRes.meta) setMeta(listRes.meta);
      if (summaryRes) setTodaySummary(summaryRes);
    } catch (err) {
      console.error('Failed to load sortir sessions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, selectedShift, selectedStatus, filterDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedShift('all');
    setSelectedStatus('all');
    setFilterDate('');
    setCurrentPage(1);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto pb-12">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink-dark flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Proses & Hasil Sortir Pack
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Pencatatan hasil verifikasi dan penataan fisik pack uang kertas menuju tahap pengemasan doos.
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
            + Catat Hasil Sortir
          </Button>
        )}
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Total Pack Disortir Hari Ini</span>
            <span className="text-xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
              {todaySummary?.total_pack?.toLocaleString('id-ID') || 0} Pack
            </span>
            <span className="text-[11px] text-ink-muted block mt-0.5 font-mono tabular-nums">
              ({Math.floor((todaySummary?.total_pack || 0) / 4)} Quad = {((todaySummary?.total_pack || 0) / 4) * 9} Doos)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Volume Bilyet Hari Ini</span>
            <span className="text-xl font-bold font-mono tabular-nums text-ink dark:text-ink-dark">
              {formatBilyet(todaySummary?.total_bilyet || 0)}
            </span>
            <span className="text-[11px] text-ink-muted block mt-0.5 font-mono tabular-nums">
              {(todaySummary?.total_brood || 0).toLocaleString('id-ID')} Brood
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari Batch / Penyortir..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* Filter Shift */}
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
                  {s.nama_shift}
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
            className="h-9 text-xs"
          />

          {/* Filter Status & Refresh */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs flex-1">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={loadSessions}
              disabled={refreshing}
              aria-label="Segarkan Data Sesi Sortir"
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
              <TableHead className="text-xs font-semibold">Batch & Pecahan</TableHead>
              <TableHead className="text-xs font-semibold">Shift</TableHead>
              <TableHead className="text-xs font-semibold">Rentang Pack</TableHead>
              <TableHead className="text-xs font-semibold">Volume Fisik</TableHead>
              <TableHead className="text-xs font-semibold">Penyortir</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-xs text-ink-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Memuat data hasil sortir...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-xs text-ink-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-ink-muted/60" />
                    <span className="font-medium text-ink dark:text-ink-dark">Belum Ada Riwayat Sortir</span>
                    <p className="max-w-sm text-[11px]">
                      Tidak ada catatan sesi sortir yang sesuai dengan kriteria filter saat ini.
                    </p>
                    {(searchTerm || selectedShift !== 'all' || selectedStatus !== 'all' || filterDate) && (
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
              sessions.map((session) => {
                const denomNama = session.batch?.emisi?.denominasi?.nama || '';
                const packRangeInfo = formatCompactPackRanges(
                  session.nomor_pack_list || `${session.pack_dari}-${session.pack_sampai}`
                );

                // Check safety locking: is any pack in this session PACKED or SHIPPED?
                const isLocked = session.sortir_pack_details?.some(
                  (spd) =>
                    spd.pack_detail?.status === 'PACKED' ||
                    spd.pack_detail?.status === 'SHIPPED'
                );

                return (
                  <TableRow key={session.id} className="hover:bg-canvas dark:bg-canvas-dark/40 transition-colors">
                    <TableCell className="text-xs">
                      <span className="font-medium text-ink dark:text-ink-dark">
                        {formatIndonesianDate(session.tanggal_sortir)}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                          {session.batch?.nomor_batch}
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
                        {session.batch?.seri}{session.batch?.kepala}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-ink-secondary">
                      {session.shift?.nama_shift || `Shift ${session.shift_id}`}
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono tabular-nums text-ink dark:text-ink-dark font-medium">
                          {packRangeInfo.display}
                        </span>
                        {packRangeInfo.isTruncated && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-[10px] font-mono font-semibold text-ink-muted">
                                  +{packRangeInfo.remainingGroups} grup
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs font-mono max-w-xs p-2">
                                <p className="font-semibold mb-1">Seluruh Pack Disortir:</p>
                                <p>{packRangeInfo.full}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono tabular-nums">
                        {session.total_pack} Pack ({session.total_pack / 4} Quad)
                      </span>
                    </TableCell>

                    <TableCell className="text-xs font-mono tabular-nums">
                      <span className="font-semibold text-ink dark:text-ink-dark block">
                        {formatBilyet(session.total_bilyet)}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {session.total_brood?.toLocaleString('id-ID')} Brood
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-medium text-ink dark:text-ink-dark block">
                        {session.penyortir_1}
                      </span>
                      {session.penyortir_2 && (
                        <span className="text-[11px] text-ink-muted">
                          & {session.penyortir_2}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge
                        variant={session.status === 'COMPLETED' ? 'emerald' : 'secondary'}
                        className="text-[10px] font-bold uppercase"
                      >
                        {session.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingSession(session)}
                          aria-label="Lihat Detail Sesi Sortir"
                          title="Lihat Detail Sesi & Matriks"
                          className="h-8 w-8 text-ink-muted hover:text-ink dark:text-ink-dark"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.75} />
                        </Button>

                        {canCancel && session.status !== 'CANCELLED' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={isLocked}
                                    onClick={() => setCancelingSession(session)}
                                    aria-label="Batalkan Sesi"
                                    className="h-8 w-8 text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40"
                                  >
                                    {isLocked ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-xs">
                                {isLocked
                                  ? 'Tidak dapat dibatalkan karena pack telah dikemas dalam doos (Modul 3).'
                                  : 'Batalkan sesi sortir ini (mengembalikan status pack ke RECEIVED).'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
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
              Menampilkan {sessions.length} dari {meta.total} sesi sortir
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
      <SortirFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        batches={batches}
        shifts={shifts}
        onSuccess={() => {
          loadSessions();
        }}
      />

      {/* Detail Modal */}
      <SortirDetailModal
        open={Boolean(viewingSession)}
        onOpenChange={(open) => {
          if (!open) setViewingSession(null);
        }}
        session={viewingSession}
      />

      {/* Cancel Confirmation Dialog */}
      <SortirCancelDialog
        open={Boolean(cancelingSession)}
        onOpenChange={(open) => {
          if (!open) setCancelingSession(null);
        }}
        session={cancelingSession}
        onSuccess={() => {
          loadSessions();
        }}
      />
    </div>
  );
}
