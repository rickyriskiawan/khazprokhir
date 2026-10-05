import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check, X } from 'lucide-react';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';
import { formatIndonesianDate } from '@/utils/formatters';

const getDenomCode = (sesi) => sesi?.batch?.emisi?.denominasi?.nama || '';

/**
 * Combobox pemilihan sesi sortir yang siap dikemas.
 * Mencari berdasarkan nomor batch, seri, atau tanggal sortir.
 */
export default function SesiSortirCombobox({
  sessions = [],
  selectedSession = null,
  onSelectSession,
  disabled = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      return;
    }
    if (selectedSession) {
      const b = selectedSession.batch;
      setSearchTerm(`${b?.nomor_batch} (${b?.seri}${b?.kepala || ''})`);
    } else {
      setSearchTerm('');
    }
  }, [selectedSession]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((s) => {
      const b = s.batch || {};
      const nomorMatch = b.nomor_batch?.toLowerCase().includes(term);
      const seriKepala = `${b.seri || ''}${b.kepala || ''}`.toLowerCase();
      const seriMatch = b.seri?.toLowerCase().includes(term);
      const tanggal = formatIndonesianDate(s.tanggal_sortir).toLowerCase();
      return nomorMatch || seriMatch || seriKepala.includes(term) || tanggal.includes(term);
    });
  }, [sessions, searchTerm]);

  const handleSelect = (sesi) => {
    isTypingRef.current = false;
    onSelectSession(sesi);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    isTypingRef.current = false;
    onSelectSession(null);
    setSearchTerm('');
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search
          className="absolute left-2.5 h-4 w-4 text-ink-secondary dark:text-ink-secondary-dark pointer-events-none"
          strokeWidth={1.75}
        />
        <Input
          type="text"
          placeholder="Cari Sesi Sortir (No. Batch / Seri)..."
          value={searchTerm}
          onChange={(e) => {
            isTypingRef.current = true;
            setSearchTerm(e.target.value);
            if (selectedSession) onSelectSession(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="pl-9 pr-8 text-xs font-mono tabular-nums"
          data-testid="sesi-combobox-input"
        />
        {selectedSession && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Bersihkan pilihan sesi"
            className="absolute right-2 text-ink-secondary hover:text-ink dark:text-ink-secondary-dark dark:hover:text-ink-dark cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg dark:border-border-dark dark:bg-surface-dark">
          {filteredSessions.length > 0 ? (
            <div className="space-y-1">
              {filteredSessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                const denomNama = getDenomCode(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark ${
                      isSelected
                        ? 'bg-emerald/10 font-semibold text-emerald dark:bg-emerald-500/15'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono tabular-nums font-medium">
                        {s.batch?.nomor_batch}
                        <span className="ml-1.5 text-[11px] font-normal text-ink-secondary dark:text-ink-secondary-dark">
                          {s.batch?.seri}
                          {s.batch?.kepala || ''}
                        </span>
                      </span>
                      <span className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark">
                        Sesi #{s.id} • {formatIndonesianDate(s.tanggal_sortir)} •{' '}
                        <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">
                          {s.total_pack}
                        </strong>{' '}
                        Pack = <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{s.total_doos}</strong> Doos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {denomNama && (
                        <span
                          className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-mono font-bold border ${
                            DENOM_COLOR_MAP[denomNama] ||
                            'bg-surface-subtle text-ink-secondary border-border dark:bg-surface-subtle-dark dark:text-ink-secondary-dark'
                          }`}
                        >
                          {denomNama}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2 text-center text-xs text-ink-secondary dark:text-ink-secondary-dark">
              {sessions.length === 0
                ? 'Tidak ada sesi sortir yang siap dikemas saat ini.'
                : `Tidak ada sesi yang cocok dengan "${searchTerm}".`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
