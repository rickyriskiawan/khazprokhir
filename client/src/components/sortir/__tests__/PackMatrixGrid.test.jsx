import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PackMatrixGrid from '../PackMatrixGrid.jsx';

describe('PackMatrixGrid Component (FE-06)', () => {
  // Mock data: 100 packs with different statuses
  // Quad 1 (1-4): all RECEIVED (eligible)
  // Quad 2 (5-8): all RECEIVED (eligible)
  // Quad 3 (9-12): Pack 9, 10, 11 RECEIVED, Pack 12 PENDING (ineligible / locked)
  // Quad 4 (13-16): all SORTED
  // Quad 5 (17-20): all PACKED
  // Quad 6 (21-24): all SHIPPED
  // Other packs (25-100): PENDING
  const generateMockPacks = () => {
    const packs = [];
    for (let i = 1; i <= 100; i++) {
      let status = 'PENDING';
      let noDoos = null;
      let sortirId = null;

      if (i >= 1 && i <= 8) {
        status = 'RECEIVED';
      } else if (i >= 9 && i <= 11) {
        status = 'RECEIVED';
      } else if (i === 12) {
        status = 'PENDING';
      } else if (i >= 13 && i <= 16) {
        status = 'SORTED';
        sortirId = 101;
      } else if (i >= 17 && i <= 20) {
        status = 'PACKED';
        noDoos = 'Doos 0001 - 0009';
      } else if (i >= 21 && i <= 24) {
        status = 'SHIPPED';
        noDoos = 'Doos 0010 - 0018';
      }

      packs.push({
        id: i,
        nomor_pack: i,
        status,
        jumlah_brood: 45,
        jumlah_bilyet: 45000,
        proses_sortir_id: sortirId,
        no_doos_range: noDoos,
      });
    }
    return packs;
  };

  const sampleBatch = {
    id: 1,
    nomor_batch: '1822001',
    seri: 'AA-BA',
    kepala: 0,
    tahun_anggaran: 2026,
    emisi: {
      kode_emisi: 'TE2022',
      denominasi: {
        nama: 'Y',
        kode_denominasi: 'Y',
        nilai_nominal: 100000,
      },
    },
  };

  describe('1. Render 100 Petak Matriks 10x10 & Pewarnaan Status', () => {
    it('merender tepat 100 petak nomor pack dari 1 sampai 100', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          batchInfo={sampleBatch}
        />
      );

      // Verify all 100 pack cells exist
      for (let i = 1; i <= 100; i++) {
        expect(screen.getByTestId(`pack-cell-${i}`)).toBeInTheDocument();
      }
    });

    it('menampilkan status warna yang sesuai dan legenda penghitungan status', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          batchInfo={sampleBatch}
        />
      );

      // RECEIVED packs: 1-8 (8 packs) + 9-11 (3 packs) = 11 packs
      // SORTED packs: 13-16 = 4 packs
      // PACKED packs: 17-20 = 4 packs
      // SHIPPED packs: 21-24 = 4 packs
      // PENDING packs: 100 - (11 + 4 + 4 + 4) = 77 packs

      expect(screen.getByTestId('legend-received')).toHaveTextContent('11');
      expect(screen.getByTestId('legend-sorted')).toHaveTextContent('4');
      expect(screen.getByTestId('legend-packed')).toHaveTextContent('4');
      expect(screen.getByTestId('legend-shipped')).toHaveTextContent('4');
      expect(screen.getByTestId('legend-pending')).toHaveTextContent('77');
    });

    it('menampilkan informasi batch pada header', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          batchInfo={sampleBatch}
        />
      );

      expect(screen.getByText(/1822001/)).toBeInTheDocument();
      expect(screen.getByText(/AA-BA0/)).toBeInTheDocument();
      expect(screen.getByText('Y')).toBeInTheDocument();
    });
  });

  describe('2. Pemilihan Atomik Kelompok 4 Pack (Atomic Quad-Pack Selection)', () => {
    it('memilih 1 quad penuh (4 pack sekaligus) hanya dengan 1 kali klik', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
        />
      );

      // Click Pack #2 (member of Quad 1: Pack 1-4)
      fireEvent.click(screen.getByTestId('pack-cell-2'));

      // Should automatically select all 4 packs of Quad 1: [1, 2, 3, 4]
      expect(handleSelectionChange).toHaveBeenCalledTimes(1);
      expect(handleSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4]);
    });

    it('membatalkan 1 quad penuh jika salah satu petak dalam quad yang sudah dipilih diklik kembali', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[1, 2, 3, 4, 5, 6, 7, 8]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
        />
      );

      // Click Pack #3 (member of Quad 1) to deselect Quad 1
      fireEvent.click(screen.getByTestId('pack-cell-3'));

      // Quad 1 should be removed, leaving only Quad 2 [5, 6, 7, 8]
      expect(handleSelectionChange).toHaveBeenCalledWith([5, 6, 7, 8]);
    });

    it('menangani perpotongan baris dengan benar (misal Quad 3: Pack 9-12)', () => {
      // In a scenario where Quad 3 is fully RECEIVED:
      const packs = generateMockPacks().map((p) => {
        if (p.nomor_pack === 12) return { ...p, status: 'RECEIVED' };
        return p;
      });

      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={packs}
          selectedPacks={[1, 2, 3, 4]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
        />
      );

      // Pack 10 is on row 1, pack 11 is on row 2
      fireEvent.click(screen.getByTestId('pack-cell-10'));

      expect(handleSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4, 9, 10, 11, 12]);
    });
  });

  describe('3. Penguncian Atomik Ketat (Strict Atomic Locking)', () => {
    it('mengunci seluruh quad jika salah satu pack belum berstatus memenuhi syarat', () => {
      // In mock data, Quad 3 has Pack 9, 10, 11 as RECEIVED, but Pack 12 is PENDING
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
          selectableStatuses={['RECEIVED']}
        />
      );

      const cell9 = screen.getByTestId('pack-cell-9');
      const cell12 = screen.getByTestId('pack-cell-12');

      // Both should be disabled
      expect(cell9).toBeDisabled();
      expect(cell12).toBeDisabled();

      // Clicking cell 9 should NOT trigger selection change
      fireEvent.click(cell9);
      expect(handleSelectionChange).not.toHaveBeenCalled();
    });

    it('mengunci pack yang sudah SORTED/PACKED/SHIPPED saat target status adalah RECEIVED', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
          selectableStatuses={['RECEIVED']}
        />
      );

      // Quad 4 (13-16) is SORTED -> should be locked
      const cell14 = screen.getByTestId('pack-cell-14');
      expect(cell14).toBeDisabled();

      fireEvent.click(cell14);
      expect(handleSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('4. Akumulator Volume Real-time (Live Volume Accumulator)', () => {
    it('menampilkan total pack dan volume bilyet secara presisi', () => {
      // 8 packs selected (Quad 1 & Quad 2)
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[1, 2, 3, 4, 5, 6, 7, 8]}
          batchInfo={sampleBatch}
          selectable={true}
        />
      );

      // 8 Pack
      expect(screen.getByTestId('accumulator-pack-count')).toHaveTextContent('8 Pack');
      // 8 * 45,000 = 360,000 Bilyet
      expect(screen.getByTestId('accumulator-bilyet-count')).toHaveTextContent('360.000 Bilyet');
      // Hanya 2 metrik yang ditampilkan (pack & bilyet)
      expect(screen.queryByTestId('accumulator-quad-count')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accumulator-doos-count')).not.toBeInTheDocument();
    });

    it('menampilkan nol saat tidak ada pack yang dipilih', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          batchInfo={sampleBatch}
          selectable={true}
        />
      );

      expect(screen.getByTestId('accumulator-pack-count')).toHaveTextContent('0 Pack');
      expect(screen.getByTestId('accumulator-bilyet-count')).toHaveTextContent('0 Bilyet');
    });
  });

  describe('5. Tombol Aksi Cepat (Quick Actions)', () => {
    it('memilih seluruh quad yang siap saat tombol "Pilih Semua yang Siap" diklik', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
          selectableStatuses={['RECEIVED']}
        />
      );

      // In mock data: only Quad 1 (1-4) and Quad 2 (5-8) are completely RECEIVED
      // Total 8 packs
      const selectAllBtn = screen.getByTestId('btn-select-all-ready');
      fireEvent.click(selectAllBtn);

      expect(handleSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('mengosongkan pilihan saat tombol "Reset Pilihan" diklik', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[1, 2, 3, 4, 5, 6, 7, 8]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
        />
      );

      const resetBtn = screen.getByTestId('btn-reset-selection');
      fireEvent.click(resetBtn);

      expect(handleSelectionChange).toHaveBeenCalledWith([]);
    });

    it('menonaktifkan tombol Reset saat tidak ada pack terpilih', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          selectable={true}
        />
      );

      expect(screen.getByTestId('btn-reset-selection')).toBeDisabled();
    });
  });

  describe('6. Mode Read-Only Audit (`selectable={false}`)', () => {
    it('tidak merender tombol aksi seleksi dan sel pack tidak memicu pemilihan', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={false}
        />
      );

      // Quick action buttons should NOT be present
      expect(screen.queryByTestId('btn-select-all-ready')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-reset-selection')).not.toBeInTheDocument();

      // Clicking cell should NOT call onSelectionChange
      const cell1 = screen.getByTestId('pack-cell-1');
      fireEvent.click(cell1);
      expect(handleSelectionChange).not.toHaveBeenCalled();
    });

    it('menampilkan total akumulasi progres batch pada accumulator saat mode audit', () => {
      // In mock data: 11 RECEIVED + 4 SORTED + 4 PACKED + 4 SHIPPED = 23 packs processed
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          selectable={false}
        />
      );

      // Accumulator should show 23 Pack (not 0 Pack)
      expect(screen.getByTestId('accumulator-pack-count')).toHaveTextContent('23 Pack');
      expect(screen.getByTestId('accumulator-bilyet-count')).toHaveTextContent('1.035.000 Bilyet');
    });
  });

  describe('7. Sinkronisasi Hover Quad Highlight', () => {
    it('menerapkan kelas highlight tersinkronisasi pada semua 4 pack saat salah satu pack di-hover', () => {
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          selectable={true}
        />
      );

      const cell1 = screen.getByTestId('pack-cell-1');
      const cell4 = screen.getByTestId('pack-cell-4');

      // Mouse enter on pack 1 (Quad 1)
      fireEvent.mouseEnter(cell1);

      // Both cell 1 and cell 4 should have data-quad-hovered="true"
      expect(cell1).toHaveAttribute('data-quad-hovered', 'true');
      expect(cell4).toHaveAttribute('data-quad-hovered', 'true');

      // Cell 5 (Quad 2) should NOT be hovered
      expect(screen.getByTestId('pack-cell-5')).toHaveAttribute('data-quad-hovered', 'false');

      // Mouse leave
      fireEvent.mouseLeave(cell1);
      expect(cell1).toHaveAttribute('data-quad-hovered', 'false');
      expect(cell4).toHaveAttribute('data-quad-hovered', 'false');
    });
  });

  describe('8. Kasus Khusus & Edge Cases', () => {
    it('menangani data packs kosong dengan menganggap seluruh 100 pack berstatus PENDING', () => {
      render(
        <PackMatrixGrid
          packs={[]}
          selectedPacks={[]}
          selectable={true}
        />
      );

      expect(screen.getByTestId('legend-pending')).toHaveTextContent('100');
      expect(screen.getByTestId('legend-received')).toHaveTextContent('0');

      // Since all are PENDING, no quads should be eligible for SORTIR (RECEIVED)
      const selectAllBtn = screen.getByTestId('btn-select-all-ready');
      expect(selectAllBtn).toBeDisabled();
    });

    it('mendukung kustomisasi selectableStatuses (misal untuk Modul Kemas: SORTED)', () => {
      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={generateMockPacks()}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
          selectableStatuses={['SORTED']}
        />
      );

      // In mock data: Quad 4 (13-16) is SORTED
      const cell13 = screen.getByTestId('pack-cell-13');
      expect(cell13).not.toBeDisabled();

      fireEvent.click(cell13);
      expect(handleSelectionChange).toHaveBeenCalledWith([13, 14, 15, 16]);

      // Quad 1 (1-4) is RECEIVED, which is now locked for KEMAS
      const cell1 = screen.getByTestId('pack-cell-1');
      expect(cell1).toBeDisabled();
    });

    it('memilih seluruh 100 pack jika semua quad berstatus memenuhi syarat', () => {
      const allReceivedPacks = Array.from({ length: 100 }, (_, i) => ({
        nomor_pack: i + 1,
        status: 'RECEIVED',
      }));

      const handleSelectionChange = vi.fn();
      render(
        <PackMatrixGrid
          packs={allReceivedPacks}
          selectedPacks={[]}
          onSelectionChange={handleSelectionChange}
          selectable={true}
          selectableStatuses={['RECEIVED']}
        />
      );

      const selectAllBtn = screen.getByTestId('btn-select-all-ready');
      expect(selectAllBtn).toHaveTextContent('Pilih Semua yang Siap (100)');

      fireEvent.click(selectAllBtn);
      expect(handleSelectionChange).toHaveBeenCalledWith(
        Array.from({ length: 100 }, (_, i) => i + 1)
      );
    });
  });
});
