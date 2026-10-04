import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SortirFormModal from '../SortirFormModal';
import * as sortirService from '@/services/sortirService';
import * as bonMasukService from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/sortirService', () => ({
  createSortir: vi.fn(),
  getAvailablePacks: vi.fn(),
  formatPackRanges: vi.fn((packs) => (packs?.length ? `Pack 01–0${packs.length}` : '-')),
  formatCompactPackRanges: vi.fn((packs) => ({ display: `Pack 01–0${packs?.length || 0}`, full: '', totalPacks: packs?.length || 0 })),
}));

vi.mock('@/services/bonMasukService', () => ({
  getBatchById: vi.fn(),
}));

const mockBatches = [
  {
    id: 1,
    nomor_batch: '1822001',
    seri: 'AA-BA',
    kepala: '0',
    tahun_anggaran: 2026,
    emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
    total_pack: 100,
  },
];

const mockShifts = [
  { id: 1, nama_shift: 'Shift 1', jam_mulai: '07:00', jam_selesai: '15:00' },
  { id: 2, nama_shift: 'Shift 2', jam_mulai: '15:00', jam_selesai: '23:00' },
];

const mockBatchDetail = {
  id: 1,
  nomor_batch: '1822001',
  seri: 'AA-BA',
  kepala: '0',
  tahun_anggaran: 2026,
  emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
  packs: Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    nomor_pack: i + 1,
    status: i < 20 ? 'RECEIVED' : 'PENDING',
    jumlah_brood: 45,
    jumlah_bilyet: 45000,
  })),
};

describe('SortirFormModal Component (FE-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 10, username: 'operator1', full_name: 'Budi Operator' },
      isAuthenticated: true,
    });
    bonMasukService.getBatchById.mockResolvedValue(mockBatchDetail);
    sortirService.createSortir.mockResolvedValue({ id: 99, status: 'COMPLETED' });
  });

  it('merender modal dengan judul, field formulir, dan placeholder grid saat belum pilih batch', () => {
    render(
      <SortirFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
      />
    );

    expect(screen.getByText('Pencatatan Hasil Sortir Pack')).toBeInTheDocument();
    expect(screen.getByText(/Pilih batch terlebih dahulu/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Budi Operator')).toBeInTheDocument();
    // Tombol simpan nonaktif karena belum ada pack dipilih
    const submitBtn = screen.getByRole('button', { name: /Simpan Hasil Sortir/i });
    expect(submitBtn).toBeDisabled();
  });

  it('memperbarui kalkulator Zero Reject saat batch dipilih dan pack dipilih', async () => {
    render(
      <SortirFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
      />
    );

    // Buka combobox batch dan pilih batch
    const batchInput = screen.getByPlaceholderText(/Cari Batch/i);
    fireEvent.focus(batchInput);
    const option = await screen.findByText(/1822001/i);
    fireEvent.click(option);

    // Verifikasi getBatchById dipanggil
    await waitFor(() => {
      expect(bonMasukService.getBatchById).toHaveBeenCalledWith(1);
    });

    // Petak pack 1-4 ada di DOM
    await waitFor(() => {
      expect(screen.getByTestId('pack-cell-1')).toBeInTheDocument();
    });

    // Klik petak 1 untuk memilih Quad 1 (Pack 1-4)
    const pack1 = screen.getByTestId('pack-cell-1');
    fireEvent.click(pack1);

    // Volume kini ditampilkan oleh accumulator di dalam PackMatrixGrid
    await waitFor(() => {
      expect(screen.getByTestId('accumulator-pack-count')).toHaveTextContent('4 Pack');
      expect(screen.getByTestId('accumulator-bilyet-count')).toHaveTextContent('180.000 Bilyet');
    });

    // Tombol simpan kini aktif
    const submitBtn = screen.getByRole('button', { name: /Simpan Hasil Sortir/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('melakukan submit data sesi sortir secara langsung sebagai COMPLETED', async () => {
    const handleSuccess = vi.fn();
    render(
      <SortirFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        onSuccess={handleSuccess}
      />
    );

    // Pilih batch
    const batchInput = screen.getByPlaceholderText(/Cari Batch/i);
    fireEvent.focus(batchInput);
    const option = await screen.findByText(/1822001/i);
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId('pack-cell-1')).toBeInTheDocument();
    });

    // Pilih Quad 1
    fireEvent.click(screen.getByTestId('pack-cell-1'));

    // Klik Simpan
    const submitBtn = screen.getByRole('button', { name: /Simpan Hasil Sortir/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sortirService.createSortir).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_id: 1,
          shift_id: 1,
          penyortir_1: 'Budi Operator',
          selected_packs: [1, 2, 3, 4],
        })
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });
});
