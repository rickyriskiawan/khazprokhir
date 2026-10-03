import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SortirDetailModal from '../SortirDetailModal';
import * as bonMasukService from '@/services/bonMasukService';

vi.mock('@/services/bonMasukService', () => ({
  getBatchById: vi.fn(),
}));

const mockSession = {
  id: 42,
  batch_id: 10,
  batch: {
    id: 10,
    nomor_batch: '1822001',
    seri: 'AA-BA',
    kepala: '0',
    emisi: {
      denominasi: {
        nama: 'Y',
        nilai: 100000,
      },
    },
  },
  shift: { id: 1, nama_shift: 'Shift 1' },
  shift_id: 1,
  penyortir_1: 'Ahmad Dahlan',
  penyortir_2: 'Siti Fatimah',
  tanggal_sortir: '2026-09-15T00:00:00.000Z',
  total_pack: 8,
  total_brood: 360,
  total_bilyet: 360000,
  status: 'COMPLETED',
  catatan: 'Sortir aman terkendali',
};

describe('SortirDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bonMasukService.getBatchById.mockResolvedValue({
      id: 10,
      nomor_batch: '1822001',
      packs: [
        { id: 1, nomor_pack: 1, status: 'SORTED' },
        { id: 2, nomor_pack: 2, status: 'SORTED' },
      ],
    });
  });

  it('merender informasi sesi, petugas penyortir, dan volume fisik dengan benar', async () => {
    render(
      <SortirDetailModal
        open={true}
        onOpenChange={vi.fn()}
        session={mockSession}
      />
    );

    expect(screen.getByText('Detail Sesi Sortir #42')).toBeInTheDocument();
    expect(screen.getAllByText('1822001').length).toBeGreaterThan(0);
    expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
    expect(screen.getByText('& Siti Fatimah')).toBeInTheDocument();
    expect(screen.getByText('Sortir aman terkendali')).toBeInTheDocument();

    await waitFor(() => {
      expect(bonMasukService.getBatchById).toHaveBeenCalledWith(10);
    });
  });

  it('tidak merender apapun saat session bernilai null', () => {
    const { container } = render(
      <SortirDetailModal
        open={true}
        onOpenChange={vi.fn()}
        session={null}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
