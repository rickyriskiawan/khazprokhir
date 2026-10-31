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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getTargetProduksiList,
  getMasterDenominasi,
  getMasterEmisi,
} from '@/services/targetProduksiService';
import TargetProduksiFormModal from '@/components/target-produksi/TargetProduksiFormModal';
import TargetProduksiDeleteDialog from '@/components/target-produksi/TargetProduksiDeleteDialog';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import { useAuthStore } from '@/stores/authStore';
import {
  Target,
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  Pencil,
  Trash2,
  Inbox,
} from 'lucide-react';

export default function TargetProduksiPage() {
  const { user } = useAuthStore();
  const isSupervisor = user?.role === 'SUPERVISOR';

  const [groupedData, setGroupedData] = useState([]);
  const [allTahunAnggaran, setAllTahunAnggaran] = useState([]);
  const [denominasiList, setDenominasiList] = useState([]);
  const [emisiList, setEmisiList] = useState([]);
  const [selectedTahunAnggaran, setSelectedTahunAnggaran] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & Dialog states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emisiGroup) => {
    setEditingGroup(emisiGroup);
    setIsFormModalOpen(true);
  };

  const handleSuccessMutation = () => {
    loadMasterData();
    loadTargets();
  };

  const loadMasterData = useCallback(async () => {
    try {
      const [denomRes, emisiRes] = await Promise.all([
        getMasterDenominasi(),
        getMasterEmisi(),
      ]);
      setDenominasiList(denomRes || []);
      setEmisiList(emisiRes || []);
    } catch (err) {
      console.error('Gagal memuat data master denominasi/emisi:', err);
    }
  }, []);

  const loadTargets = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = {};
      if (selectedTahunAnggaran !== 'all') {
        params.tahun_anggaran = selectedTahunAnggaran;
      }
      const res = await getTargetProduksiList(params);
      const groups = res?.meta?.grouped || [];
      setGroupedData(groups);
      if (selectedTahunAnggaran === 'all') {
        setAllTahunAnggaran(
          Array.from(new Set(groups.map((g) => g.tahun_anggaran))).sort(
            (a, b) => b - a
          )
        );
      }
    } catch (err) {
      console.error('Gagal memuat data target produksi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTahunAnggaran]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const availableTahunAnggaran =
    allTahunAnggaran.length > 0
      ? allTahunAnggaran
      : Array.from(new Set(groupedData.map((g) => g.tahun_anggaran))).sort(
          (a, b) => b - a
        );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink-dark flex items-center gap-2.5">
            <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Target Produksi
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Kuota produksi uang kertas per Tahun Anggaran dan Tahun Emisi (1 Doos = 20.000 Bilyet, sisa bilyet dibulatkan ke atas).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={selectedTahunAnggaran}
            onValueChange={setSelectedTahunAnggaran}
          >
            <SelectTrigger
              className="h-9 w-[190px] text-xs bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
              aria-label="Filter Tahun Anggaran"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-ink-muted" />
              <SelectValue placeholder="Semua Tahun Anggaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun Anggaran</SelectItem>
              {availableTahunAnggaran.map((ta) => (
                <SelectItem key={ta} value={String(ta)}>
                  TA {ta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTargets}
            disabled={refreshing}
            className="h-9 text-xs"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Muat Ulang
          </Button>

          {isSupervisor && (
            <Button
              variant="emerald"
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 px-3.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Tambah Target Produksi
            </Button>
          )}
        </div>
      </div>

      {/* Daftar Kelompok Tahun Anggaran */}
      {loading ? (
        <div className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-8 text-center text-xs text-ink-muted shadow-xs">
          Memuat data Target Produksi...
        </div>
      ) : groupedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-10 text-center shadow-xs">
          <Inbox className="h-8 w-8 text-ink-muted/60 mb-2" />
          <p className="text-sm font-medium text-ink dark:text-ink-dark">
            Belum ada data Target Produksi
          </p>
          <p className="text-xs text-ink-muted mt-1">
            Silakan tambahkan Target Produksi baru berdasarkan Tahun Anggaran dan Tahun Emisi.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedData.map((taGroup) => (
            <div
              key={taGroup.tahun_anggaran}
              className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xs overflow-hidden"
            >
              {/* Level 1: Header Kartu Tahun Anggaran */}
              <div className="flex flex-col gap-2 border-b border-border dark:border-border-dark bg-surface-subtle dark:bg-surface-subtle-dark px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <Badge variant="emerald" className="text-xs font-semibold px-2.5 py-0.5">
                    Tahun Anggaran {taGroup.tahun_anggaran}
                  </Badge>
                  <span className="text-xs text-ink-muted">
                    {taGroup.emisi_groups?.length || 0} Tahun Emisi
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-ink-muted">Total Bilyet TA: </span>
                    <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                      {Number(taGroup.total_bilyet || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted">Total Doos TA: </span>
                    <span className="font-mono tabular-nums font-semibold text-ink dark:text-ink-dark">
                      {Number(taGroup.total_doos || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Level 2: Sub-panel per Tahun Emisi */}
              <div className="p-4 space-y-4">
                {(taGroup.emisi_groups || []).map((emisiGroup) => (
                  <div
                    key={`${taGroup.tahun_anggaran}-${emisiGroup.tahun_emisi}`}
                    className="rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 border-b border-border dark:border-border-dark bg-surface-subtle/60 dark:bg-surface-subtle-dark/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-ink dark:text-ink-dark">
                          Tahun Emisi {emisiGroup.tahun_emisi} ({emisiGroup.kode_emisi || `TE ${emisiGroup.tahun_emisi}`})
                        </span>
                        {emisiGroup.catatan && (
                          <span className="text-xs text-ink-muted">
                            — {emisiGroup.catatan}
                          </span>
                        )}
                      </div>

                      {isSupervisor && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(emisiGroup)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingGroup(emisiGroup)}
                            className="h-7 px-2.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Tabel 3 Kolom: Pecahan (Sandi), Target (Bilyet), Target (Doos) */}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-surface-subtle/40 dark:bg-surface-subtle-dark/40">
                          <TableHead className="w-[180px] text-xs font-semibold">
                            Pecahan
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold">
                            Target (Bilyet)
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold">
                            Target (Doos)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(emisiGroup.items || []).map((item) => {
                          const colorToken =
                            DENOM_COLOR_MAP[item.kode_pecahan] || DENOM_COLOR_MAP.Y;
                          return (
                            <TableRow
                              key={item.id || `${item.denominasi_id}-${item.sandi}`}
                            >
                              <TableCell className="py-2">
                                <span
                                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-semibold border ${colorToken?.badge || ''}`}
                                >
                                  {item.sandi}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono tabular-nums text-xs">
                                {Number(item.target_bilyet || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono tabular-nums text-xs font-medium">
                                {Number(item.target_doos || 0).toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Baris Total */}
                        <TableRow className="bg-surface-subtle dark:bg-surface-subtle-dark font-semibold border-t-2 border-border dark:border-border-dark">
                          <TableCell className="py-2 text-xs font-bold">
                            Total
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-xs font-bold">
                            {Number(emisiGroup.total_bilyet || 0).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(emisiGroup.total_doos || 0).toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Target Produksi */}
      <TargetProduksiFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleSuccessMutation}
        denominasiList={denominasiList}
        emisiList={emisiList}
        editingGroup={editingGroup}
      />

      {/* Dialog Konfirmasi Hapus Target Produksi */}
      <TargetProduksiDeleteDialog
        isOpen={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        onSuccess={handleSuccessMutation}
        targetGroup={deletingGroup}
      />
    </div>
  );
}
