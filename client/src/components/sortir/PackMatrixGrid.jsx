import React, { useState, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { formatBilyet, formatCompactRupiah } from '@/utils/formatters';
import {
  Check,
  Lock,
  Layers,
  Box,
  Coins,
  CheckCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DENOM_COLOR_MAP, STATUS_CONFIG } from './sortirConstants';

/**
 * PackMatrixGrid: Interactive 100-Pack Matrix Grid Component
 * Visualisasi matriks 10x10 dengan Atomic Quad-Pack Selection, Live Accumulator,
 * Synchronized Hover, dan Strict Atomic Locking.
 */
export default function PackMatrixGrid({
  packs = [],
  selectedPacks = [],
  onSelectionChange,
  selectable = true,
  selectableStatuses = ['RECEIVED'],
  batchInfo = null,
  nominalPecahan = null,
  className = '',
}) {
  const [hoveredQuadIndex, setHoveredQuadIndex] = useState(null);

  // Map packs by nomor_pack (1-100)
  const packMap = useMemo(() => {
    const map = new Map();
    for (const p of packs) {
      if (p && p.nomor_pack) {
        map.set(p.nomor_pack, p);
      }
    }
    return map;
  }, [packs]);

  // Set of selected pack numbers for fast lookup
  const selectedSet = useMemo(() => new Set(selectedPacks), [selectedPacks]);

  // 25 Quads calculation and eligibility
  const quads = useMemo(() => {
    const list = [];
    for (let q = 0; q < 25; q++) {
      const quadStart = q * 4 + 1;
      const quadEnd = quadStart + 3;
      const packNumbers = [quadStart, quadStart + 1, quadStart + 2, quadStart + 3];

      const quadPacks = packNumbers.map((num) => {
        return (
          packMap.get(num) || {
            nomor_pack: num,
            status: 'PENDING',
            jumlah_brood: 45,
            jumlah_bilyet: 45000,
          }
        );
      });

      // Strict atomic check: All 4 packs must match selectableStatuses
      const firstIneligible = quadPacks.find(
        (p) => !selectableStatuses.includes(p.status)
      );
      const isEligible = !firstIneligible;

      let lockReason = null;
      if (!isEligible) {
        lockReason = `Kelompok terkunci: Pack #${firstIneligible.nomor_pack} berstatus ${firstIneligible.status}`;
      }

      list.push({
        quadIndex: q,
        quadNumber: q + 1,
        quadStart,
        quadEnd,
        packNumbers,
        quadPacks,
        isEligible,
        lockReason,
      });
    }
    return list;
  }, [packMap, selectableStatuses]);

  // Counts breakdown for legend
  const statusCounts = useMemo(() => {
    const counts = {
      PENDING: 0,
      RECEIVED: 0,
      SORTED: 0,
      PACKED: 0,
      SHIPPED: 0,
    };
    for (let i = 1; i <= 100; i++) {
      const p = packMap.get(i);
      const st = p?.status || 'PENDING';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.PENDING++;
      }
    }
    return counts;
  }, [packMap]);

  // Handle click on a pack in a quad (Atomic Quad Selection)
  const handlePackClick = (packNum) => {
    if (!selectable) return;
    const quadIndex = Math.floor((packNum - 1) / 4);
    const quad = quads[quadIndex];

    if (!quad || !quad.isEligible) return;

    const allQuadSelected = quad.packNumbers.every((num) => selectedSet.has(num));

    let nextSelected;
    if (allQuadSelected) {
      // Deselect all 4 packs of this quad
      nextSelected = selectedPacks.filter((num) => !quad.packNumbers.includes(num));
    } else {
      // Select all 4 packs of this quad
      nextSelected = Array.from(new Set([...selectedPacks, ...quad.packNumbers])).sort(
        (a, b) => a - b
      );
    }

    if (onSelectionChange) {
      onSelectionChange(nextSelected);
    }
  };

  // Quick Action: Select All Ready Quads
  const handleSelectAllReady = () => {
    if (!selectable) return;
    const eligiblePacks = [];
    for (const q of quads) {
      if (q.isEligible) {
        eligiblePacks.push(...q.packNumbers);
      }
    }
    const nextSelected = Array.from(new Set(eligiblePacks)).sort((a, b) => a - b);
    if (onSelectionChange) {
      onSelectionChange(nextSelected);
    }
  };

  // Quick Action: Reset Selection
  const handleResetSelection = () => {
    if (!selectable) return;
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  // Live Accumulator calculations (Interactive Selection Mode vs Audit Mode)
  const totalSelectedPacks = selectedPacks.length;
  const selectedQuadsCount = Math.floor(totalSelectedPacks / 4);
  const setaraDoos = (totalSelectedPacks / 4) * 9;
  const totalBilyet = totalSelectedPacks * 45000;

  // Batch-wide totals for read-only audit mode
  const totalProcessedPacks =
    statusCounts.RECEIVED +
    statusCounts.SORTED +
    statusCounts.PACKED +
    statusCounts.SHIPPED;
  const processedQuadsCount = Math.floor(totalProcessedPacks / 4);
  const processedDoos = (totalProcessedPacks / 4) * 9;
  const processedBilyet = totalProcessedPacks * 45000;

  const displayPackCount = selectable ? totalSelectedPacks : totalProcessedPacks;
  const displayQuadCount = selectable ? selectedQuadsCount : processedQuadsCount;
  const displayDoosCount = selectable ? setaraDoos : processedDoos;
  const displayBilyetCount = selectable ? totalBilyet : processedBilyet;

  const effectiveNominal =
    nominalPecahan ||
    batchInfo?.emisi?.denominasi?.nilai_nominal ||
    batchInfo?.emisi?.denominasi?.nilai ||
    0;
  const totalNominal = displayBilyetCount * effectiveNominal;

  // Batch header metadata
  const denomCode =
    batchInfo?.emisi?.denominasi?.nama ||
    batchInfo?.emisi?.denominasi?.kode_denominasi ||
    '';
  const denomBadgeStyle = DENOM_COLOR_MAP[denomCode] || 'bg-slate-100 text-slate-700';

  const readyQuadsCount = quads.filter((q) => q.isEligible).length;

  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-soft-card dark:border-border-dark dark:bg-surface-dark dark:shadow-soft-card-dark ${className}`}
    >
      {/* 1. Header Batch & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald/10 text-emerald border border-emerald/20 dark:bg-emerald/15">
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-ink dark:text-ink-dark">
                Matriks Produksi 100 Pack
              </h3>
              {denomCode && (
                <span
                  className={`inline-flex items-center justify-center font-bold px-2 py-0.5 text-xs rounded-md border ${denomBadgeStyle}`}
                >
                  {denomCode}
                </span>
              )}
            </div>
            {batchInfo ? (
              <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark flex items-center gap-1.5 mt-0.5">
                <span>Batch:</span>
                <strong className="font-mono text-ink dark:text-ink-dark">
                  {batchInfo.nomor_batch}
                </strong>
                <span className="opacity-40">•</span>
                <span className="font-mono text-ink dark:text-ink-dark">
                  {batchInfo.seri}
                  {batchInfo.kepala !== undefined ? batchInfo.kepala : ''}
                </span>
                <span className="opacity-40">•</span>
                <span>TA {batchInfo.tahun_anggaran}</span>
              </p>
            ) : (
              <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-0.5">
                Visualisasi 10x10 keterisian dan status pack per batch
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons (selectable mode only) */}
        {selectable && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-select-all-ready"
              disabled={readyQuadsCount === 0}
              onClick={handleSelectAllReady}
              className="h-8 text-xs font-medium border-border hover:border-emerald hover:text-emerald dark:border-border-dark"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
              Pilih Semua yang Siap ({readyQuadsCount * 4})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-reset-selection"
              disabled={totalSelectedPacks === 0}
              onClick={handleResetSelection}
              className="h-8 text-xs font-medium border-border text-ink-secondary hover:text-rose-600 hover:border-rose-200 dark:border-border-dark dark:text-ink-secondary-dark dark:hover:text-rose-400"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
              Reset Pilihan
            </Button>
          </div>
        )}
      </div>

      {/* 2. Live Volume Accumulator (Selection Mode) or Audit Summary (Read-Only Mode) */}
      <div className="my-3 p-3 rounded-xl bg-surface-subtle/80 border border-border/80 dark:bg-surface-subtle-dark/40 dark:border-border-dark/80">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                {selectable ? 'Alokasi Pack' : 'Total Diterima'}
              </div>
              <div
                data-testid="accumulator-pack-count"
                className="font-mono text-sm font-bold tabular-nums text-ink dark:text-ink-dark"
              >
                {displayPackCount} Pack
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                {selectable ? 'Kelompok Quad' : 'Quad Selesai'}
              </div>
              <div
                data-testid="accumulator-quad-count"
                className="font-mono text-sm font-bold tabular-nums text-ink dark:text-ink-dark"
              >
                {displayQuadCount} / 25 Quad
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Box className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                Setara Hasil Kemas
              </div>
              <div
                data-testid="accumulator-doos-count"
                className="font-mono text-sm font-bold tabular-nums text-purple-700 dark:text-purple-300"
              >
                {displayDoosCount} Doos
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-secondary dark:text-ink-secondary-dark">
                Volume Bilyet
              </div>
              <div
                data-testid="accumulator-bilyet-count"
                className="font-mono text-sm font-bold tabular-nums text-ink dark:text-ink-dark"
              >
                {formatBilyet(displayBilyetCount)}
              </div>
              {effectiveNominal > 0 && totalNominal > 0 && (
                <div
                  data-testid="accumulator-nominal"
                  className="font-mono text-[11px] tabular-nums text-emerald font-semibold"
                >
                  {formatCompactRupiah(totalNominal)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Matriks 10x10 Grid */}
      <TooltipProvider delayDuration={100}>
        <div
          role="grid"
          aria-label="Matriks 100 Pack"
          className="grid grid-cols-10 gap-1.5 p-3 rounded-xl border border-border bg-canvas/60 dark:border-border-dark dark:bg-canvas-dark/40 overflow-x-auto"
        >
          {Array.from({ length: 100 }, (_, i) => {
            const packNum = i + 1;
            const quadIndex = Math.floor((packNum - 1) / 4);
            const quad = quads[quadIndex];
            const packData = packMap.get(packNum) || {
              nomor_pack: packNum,
              status: 'PENDING',
              jumlah_brood: 45,
              jumlah_bilyet: 45000,
            };

            const isSelected = selectedSet.has(packNum);
            const isHovered = hoveredQuadIndex === quadIndex;
            const isLocked = selectable && !quad.isEligible;
            const statusCfg = STATUS_CONFIG[packData.status] || STATUS_CONFIG.PENDING;

            // Brood and Bilyet calculation for pack
            const startBilyet = (packNum - 1) * 45000 + 1;
            const endBilyet = packNum * 45000;
            const startBrood = (packNum - 1) * 45 + 1;
            const endBrood = packNum * 45;

            // Operational context message for tooltip line 4
            let operationalText = '✅ Siap diproses';
            if (isLocked) {
              operationalText = `⚠️ ${quad.lockReason}`;
            } else if (packData.no_doos_range) {
              operationalText = `📦 ${packData.no_doos_range}`;
            } else if (packData.proses_sortir_id) {
              operationalText = `✂️ Sesi Sortir #${packData.proses_sortir_id}`;
            } else if (packData.bon_masuk_id) {
              operationalText = `📄 Bon Masuk #${packData.bon_masuk_id}`;
            }

            // Cell styling
            let cellStyle =
              'h-8 sm:h-9 w-full flex items-center justify-center rounded-lg font-mono text-xs tabular-nums border transition-all select-none relative';

            if (isSelected) {
              cellStyle +=
                ' bg-emerald text-white border-emerald shadow-xs font-bold ring-1 ring-emerald hover:bg-emerald/90 cursor-pointer';
            } else if (isLocked) {
              cellStyle += ` ${statusCfg.bgClass} opacity-60 cursor-not-allowed`;
            } else if (selectable) {
              cellStyle += ` ${statusCfg.bgClass} cursor-pointer`;
            } else {
              // Read-only mode
              cellStyle += ` ${statusCfg.bgClass} cursor-default`;
            }

            // Synchronized quad hover ring
            if (isHovered) {
              cellStyle +=
                ' ring-2 ring-emerald-500/80 dark:ring-emerald-400/80 ring-offset-1 ring-offset-surface dark:ring-offset-surface-dark z-10 scale-[1.03]';
            }

            return (
              <Tooltip key={packNum}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="gridcell"
                    disabled={isLocked || !selectable}
                    data-testid={`pack-cell-${packNum}`}
                    data-quad-index={quadIndex}
                    data-quad-hovered={isHovered ? 'true' : 'false'}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-status={packData.status}
                    onClick={() => handlePackClick(packNum)}
                    onMouseEnter={() => setHoveredQuadIndex(quadIndex)}
                    onMouseLeave={() => setHoveredQuadIndex(null)}
                    aria-label={`Pack nomor ${packNum}, status ${statusCfg.label}`}
                    className={cellStyle}
                  >
                    {isSelected && (
                      <Check className="h-2.5 w-2.5 mr-0.5 inline-block shrink-0" strokeWidth={2.5} />
                    )}
                    {isLocked && !isSelected && (
                      <Lock className="h-2 w-2 mr-0.5 inline-block shrink-0 opacity-70" strokeWidth={2} />
                    )}
                    <span>{packNum}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2.5 shadow-floating-tooltip text-left">
                  <div className="space-y-1 text-xs font-sans max-w-[240px]">
                    {/* Baris 1: Header Pack & Quad */}
                    <div className="font-semibold flex items-center justify-between gap-2 border-b border-border/40 pb-1">
                      <span>Pack #{packNum}</span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        Quad {quad.quadNumber} (Pack {quad.quadStart}–{quad.quadEnd})
                      </span>
                    </div>

                    {/* Baris 2: Rentang Bilyet & Brood */}
                    <div className="text-[11px] font-mono tabular-nums text-ink-secondary dark:text-ink-secondary-dark">
                      <div>
                        Bilyet: {startBilyet.toLocaleString('id-ID')} – {endBilyet.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        Brood {startBrood} – {endBrood} (45 Brood)
                      </div>
                    </div>

                    {/* Baris 3: Status Pack */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusCfg.dotClass}`} />
                      <span className="font-medium text-xs">{statusCfg.label}</span>
                    </div>

                    {/* Baris 4: Informasi Operasional / Keterangan Kunci */}
                    <div
                      className={`text-[10px] pt-0.5 leading-snug ${
                        isLocked
                          ? 'text-amber-500 dark:text-amber-400 font-medium'
                          : 'text-ink-muted'
                      }`}
                    >
                      {operationalText}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* 4. Legenda Status Warna & Keterangan Quad */}
      <div className="mt-3 pt-3 border-t border-border dark:border-border-dark flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-slate-300 bg-slate-100 dark:bg-slate-900/60 dark:border-slate-800" />
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              Belum Diterima (<strong data-testid="legend-pending">{statusCounts.PENDING}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-sky-300 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800" />
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              Diterima (<strong data-testid="legend-received">{statusCounts.RECEIVED}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800" />
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              Selesai Sortir (<strong data-testid="legend-sorted">{statusCounts.SORTED}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-purple-300 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-800" />
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              Dikemas (<strong data-testid="legend-packed">{statusCounts.PACKED}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:border-cyan-800" />
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              Terkirim (<strong data-testid="legend-shipped">{statusCounts.SHIPPED}</strong>)
            </span>
          </div>

          {selectable && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald text-white border border-emerald" />
              <span className="text-ink-secondary dark:text-ink-secondary-dark">
                Dipilih (<strong>{totalSelectedPacks}</strong>)
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-ink-muted font-mono">
          1 Quad = 4 Pack (9 Doos / 180.000 Bilyet)
        </div>
      </div>
    </div>
  );
}
