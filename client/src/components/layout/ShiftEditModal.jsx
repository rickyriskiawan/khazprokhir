import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertCircle, X, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="shift-modal-title"
                className="text-base font-semibold text-ink dark:text-white tracking-tight"
              >
                Pengaturan Jam Kerja Shift
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-0.5">
                Konfigurasi jadwal kerja fisik & peralihan (Khusus Supervisor)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Shift Form List */}
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
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
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
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
        <div className="mt-6 pt-4 border-t border-border dark:border-border-dark flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </div>
  );
}
