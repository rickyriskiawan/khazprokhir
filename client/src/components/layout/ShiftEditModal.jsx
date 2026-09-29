import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { useShiftStore } from '../../stores/shiftStore';

export default function ShiftEditModal({ isOpen, onClose }) {
  const { shifts, updateShift, isLoading } = useShiftStore();
  const [formData, setFormData] = useState(() =>
    (shifts || []).map((s) => ({
      id: s.id,
      nama: s.nama,
      jam_mulai: s.jam_mulai,
      jam_selesai: s.jam_selesai,
      is_active: s.is_active !== false,
    }))
  );
  const [prevShifts, setPrevShifts] = useState(shifts);
  const [savingId, setSavingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (prevShifts !== shifts) {
    setPrevShifts(shifts);
    setFormData(
      (shifts || []).map((s) => ({
        id: s.id,
        nama: s.nama,
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        is_active: s.is_active !== false,
      }))
    );
  }

  const handleChange = (id, field, value) => {
    setFormData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveShift = async (item) => {
    setSavingId(item.id);
    setSuccessMsg('');
    setErrorMsg('');

    const res = await updateShift(item.id, {
      nama: item.nama,
      jam_mulai: item.jam_mulai,
      jam_selesai: item.jam_selesai,
      is_active: item.is_active,
    });

    setSavingId(null);
    if (res.success) {
      setSuccessMsg(`Jadwal ${item.nama} berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan perubahan shift.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6">
        <div className="flex items-center gap-3 pb-3 border-b border-border dark:border-border-dark">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <DialogHeader>
            <DialogTitle>Pengaturan Jam Kerja Shift</DialogTitle>
            <DialogDescription>
              Konfigurasi jadwal kerja fisik & peralihan (Khusus Supervisor)
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Alerts */}
        {successMsg && (
          <Alert variant="emerald" className="mt-2 py-2.5">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {errorMsg && (
          <Alert variant="destructive" className="mt-2 py-2.5">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Shift Form List */}
        <div className="mt-3 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {formData.map((item) => {
            const isSaving = savingId === item.id;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-canvas dark:bg-surface-subtle-dark border border-border dark:border-border-dark flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink dark:text-white">
                      {item.nama}
                    </span>
                    <Badge variant={item.is_active ? 'emerald' : 'secondary'} className="text-[10px] px-2 py-0.5">
                      {item.is_active ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-secondary dark:text-ink-secondary-dark">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(e) => handleChange(item.id, 'is_active', e.target.checked)}
                      className="rounded border-border text-pitch focus:ring-pitch"
                    />
                    <span>Status Aktif</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-ink-muted block mb-1">
                      Jam Mulai (WIB)
                    </label>
                    <Input
                      type="time"
                      value={item.jam_mulai || ''}
                      onChange={(e) => handleChange(item.id, 'jam_mulai', e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-muted block mb-1">
                      Jam Selesai (WIB)
                    </label>
                    <Input
                      type="time"
                      value={item.jam_selesai || ''}
                      onChange={(e) => handleChange(item.id, 'jam_selesai', e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSaveShift(item)}
                    disabled={isSaving || isLoading}
                    className="h-7 text-xs gap-1.5 px-3"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Shift'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-4 pt-3 border-t border-border dark:border-border-dark flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
