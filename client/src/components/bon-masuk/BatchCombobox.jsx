import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Check, X } from 'lucide-react';
import { parseBatchSearchQuery } from '@/utils/packParser';
import { DENOM_COLOR_MAP } from '@/constants/denominationColors';

export { parseBatchSearchQuery, DENOM_COLOR_MAP };

const getBatchDenomCode = (batch) => batch?.emisi?.denominasi?.nama || '';

export default function BatchCombobox({
  batches = [],
  selectedBatch = null,
  onSelectBatch,
  onRequestNewBatch,
  disabled = false,
  error = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Sync displayed search term with selectedBatch
  useEffect(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      return;
    }
    if (selectedBatch) {
      const denomKode = getBatchDenomCode(selectedBatch);
      const suffix = denomKode ? ` - ${denomKode}` : '';
      setSearchTerm(`${selectedBatch.nomor_batch} (${selectedBatch.seri}${selectedBatch.kepala})${suffix}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedBatch]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanTerm = searchTerm.trim().toLowerCase();

  const filteredBatches = batches.filter((b) => {
    if (!cleanTerm) return true;
    const nomorMatch = b.nomor_batch?.toLowerCase().includes(cleanTerm);
    const seriKepala = `${b.seri || ''}${b.kepala || ''}`.toLowerCase();
    const seriKepalaSpace = `${b.seri || ''} ${b.kepala || ''}`.toLowerCase();
    const seriMatch = b.seri?.toLowerCase().includes(cleanTerm);
    return nomorMatch || seriKepala.includes(cleanTerm) || seriKepalaSpace.includes(cleanTerm) || seriMatch;
  });

  const parsedQuery = parseBatchSearchQuery(searchTerm);

  const handleSelect = (b) => {
    isTypingRef.current = false;
    onSelectBatch(b);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    isTypingRef.current = false;
    onSelectBatch(null);
    setSearchTerm('');
    setIsOpen(true);
  };

  const handleRequestNew = () => {
    if (onRequestNewBatch) {
      onRequestNewBatch(parsedQuery);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-ink-secondary dark:text-ink-secondary-dark pointer-events-none" strokeWidth={1.75} />
        <Input
          type="text"
          placeholder="Cari Batch (No. Batch / AA-BA0)..."
          value={searchTerm}
          onChange={(e) => {
            isTypingRef.current = true;
            setSearchTerm(e.target.value);
            if (selectedBatch) {
              onSelectBatch(null);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className={`pl-9 pr-8 text-xs font-mono tabular-nums ${
            error ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
        />
        {selectedBatch && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-ink-secondary hover:text-ink dark:text-ink-secondary-dark dark:hover:text-ink-dark cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg dark:border-border-dark dark:bg-surface-dark">
          {filteredBatches.length > 0 ? (
            <div className="space-y-1">
              {filteredBatches.map((b) => {
                const isSelected = selectedBatch?.id === b.id;
                const denomNama = getBatchDenomCode(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelect(b)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark ${
                      isSelected ? 'bg-emerald/10 font-semibold text-emerald dark:bg-emerald-500/15' : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono tabular-nums font-medium">{b.nomor_batch}</span>
                      <span className="text-[11px] text-ink-secondary dark:text-ink-secondary-dark">
                        Seri: <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{b.seri}</strong> Kepala: <strong className="font-mono tabular-nums text-ink dark:text-ink-dark">{b.kepala}</strong> (TA <span className="font-mono tabular-nums">{b.tahun_anggaran}</span>)
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
              Tidak ada batch terdaftar yang cocok dengan &quot;{searchTerm}&quot;.
            </div>
          )}

          {/* Tombol Buat Batch Baru jika belum ada atau mencari batch baru */}
          {onRequestNewBatch && (
            <div className="mt-1 border-t border-border pt-1 dark:border-border-dark">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRequestNew}
                className="w-full justify-start text-xs text-emerald hover:text-emerald hover:bg-emerald/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10 cursor-pointer"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                <span>
                  + Registrasi Batch Baru: Seri <strong className="font-mono">{parsedQuery.seri || '...'}</strong> Kepala <strong className="font-mono">{parsedQuery.kepala || '0'}</strong>
                </span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
