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
    <div className="space-y-4">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Target Produksi
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kuota produksi uang kertas per Tahun Anggaran dan Tahun Emisi (1 Doos = 20.000 Bilyet, sisa bilyet dibulatkan ke atas).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedTahunAnggaran}
            onValueChange={setSelectedTahunAnggaran}
          >
            <SelectTrigger
              className="h-8 w-[180px] text-xs"
              aria-label="Filter Tahun Anggaran"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
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
            className="h-8 text-xs"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Muat Ulang
          </Button>

          {isSupervisor && (
            <Button size="sm" onClick={handleOpenCreate} className="h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tambah Target Produksi
            </Button>
          )}
        </div>
      </div>

      {/* Daftar Kelompok Tahun Anggaran */}
      {loading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-xs text-muted-foreground">
          Memuat data Target Produksi...
        </div>
      ) : groupedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-10 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">
            Belum ada data Target Produksi
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Silakan tambahkan Target Produksi baru berdasarkan Tahun Anggaran dan Tahun Emisi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedData.map((taGroup) => (
            <div
              key={taGroup.tahun_anggaran}
              className="rounded-lg border bg-card shadow-sm overflow-hidden"
            >
              {/* Level 1: Header Kartu Tahun Anggaran */}
              <div className="flex flex-col gap-2 border-b bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <Badge variant="default" className="text-xs font-semibold px-2.5 py-0.5">
                    Tahun Anggaran {taGroup.tahun_anggaran}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {taGroup.emisi_groups?.length || 0} Tahun Emisi
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Bilyet TA: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {Number(taGroup.total_bilyet || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Doos TA: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {Number(taGroup.total_doos || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Level 2: Sub-panel per Tahun Emisi */}
              <div className="divide-y p-4 space-y-4">
                {(taGroup.emisi_groups || []).map((emisiGroup) => (
                  <div
                    key={`${taGroup.tahun_anggaran}-${emisiGroup.tahun_emisi}`}
                    className="rounded-md border bg-background overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 border-b bg-muted/20 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Tahun Emisi {emisiGroup.tahun_emisi} ({emisiGroup.kode_emisi || `TE ${emisiGroup.tahun_emisi}`})
                        </span>
                        {emisiGroup.catatan && (
                          <span className="text-xs text-muted-foreground">
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
                            className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
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
                        <TableRow className="bg-muted/10">
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
                            <TableRow key={item.id || `${item.denominasi_id}-${item.sandi}`}>
                              <TableCell className="py-2">
                                <span
                                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-semibold border ${colorToken?.badge || ''}`}
                                >
                                  {item.sandi}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono text-xs">
                                {Number(item.target_bilyet || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono text-xs font-medium">
                                {Number(item.target_doos || 0).toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Baris Total */}
                        <TableRow className="bg-muted/30 font-semibold border-t-2">
                          <TableCell className="py-2 text-xs font-bold">
                            Total
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs font-bold">
                            {Number(emisiGroup.total_bilyet || 0).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs font-bold">
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
