import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProsesSortirPage from '../ProsesSortirPage';
import * as sortirService from '@/services/sortirService';
import * as bonMasukService from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/sortirService', () => ({
  getSortirList: vi.fn(),
  getTodaySortirSummary: vi.fn(),
  deleteSortir: vi.fn(),
  createSortir: vi.fn(),
  getAvailablePacks: vi.fn(),
  formatPackRanges: vi.fn((_packs) => (_packs ? 'Pack 01–04, 13–16' : '-')),
  formatCompactPackRanges: vi.fn((_packs) => ({
    display: 'Pack 01–04, 13–16',
    full: 'Pack 01–04, 13–16',
    remainingGroups: 0,
    isTruncated: false,
    totalPacks: 8,
  })),
}));

vi.mock('@/services/bonMasukService', () => ({
  getBatches: vi.fn(),
  getMasterShift: vi.fn(),
  getBatchById: vi.fn(),
}));

const mockSortirSessions = [
  {
    id: 1,
    batch_id: 10,
    batch: {
      id: 10,
      nomor_batch: '1822001',
      seri: 'AA-BA',
      kepala: '0',
      emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
    },
    shift: { id: 1, nama_shift: 'Shift 1' },
    shift_id: 1,
    penyortir_1: 'Ahmad Dahlan',
    penyortir_2: 'Siti Fatimah',
    tanggal_sortir: '2026-09-15T00:00:00.000Z',
    nomor_pack_list: '1,2,3,4,13,14,15,16',
    pack_dari: 1,
    pack_sampai: 16,
    total_pack: 8,
    total_brood: 360,
    total_bilyet: 360000,
    status: 'COMPLETED',
    catatan: 'Sortir aman',
    sortir_pack_details: [
      { pack_detail: { id: 1, nomor_pack: 1, status: 'SORTED' } },
      { pack_detail: { id: 2, nomor_pack: 2, status: 'SORTED' } },
    ],
  },
  {
    id: 2,
    batch_id: 10,
    batch: {
      id: 10,
      nomor_batch: '1822001',
      seri: 'AA-BA',
      kepala: '0',
      emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
    },
    shift: { id: 2, nama_shift: 'Shift 2' },
    shift_id: 2,
    penyortir_1: 'Budi Hartono',
    penyortir_2: null,
    tanggal_sortir: '2026-09-15T00:00:00.000Z',
    nomor_pack_list: '17,18,19,20',
    pack_dari: 17,
    pack_sampai: 20,
    total_pack: 4,
    total_brood: 180,
    total_bilyet: 180000,
    status: 'COMPLETED',
    catatan: null,
    sortir_pack_details: [
      { pack_detail: { id: 17, nomor_pack: 17, status: 'PACKED' } }, // Already packed!
    ],
  },
];

const mockSummary = {
  total_sesi: 2,
  total_pack: 12,
  total_brood: 540,
  total_bilyet: 540000,
};

describe('ProsesSortirPage Component (FE-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, username: 'supervisor', role: 'SUPERVISOR', full_name: 'Pak Supervisor' },
      isAuthenticated: true,
    });

    sortirService.getSortirList.mockResolvedValue({
      data: mockSortirSessions,
      meta: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });
    sortirService.getTodaySortirSummary.mockResolvedValue(mockSummary);
    bonMasukService.getBatches.mockResolvedValue([]);
    bonMasukService.getMasterShift.mockResolvedValue([
      { id: 1, nama_shift: 'Shift 1' },
      { id: 2, nama_shift: 'Shift 2' },
    ]);
  });

  it('merender header halaman, mini KPI, dan tabel riwayat sesi sortir', async () => {
    render(<ProsesSortirPage />);

    expect(screen.getByText('Proses & Hasil Sortir Pack')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
      expect(screen.getByText('Budi Hartono')).toBeInTheDocument();
      expect(screen.getAllByText('1822001').length).toBe(2);
    });

    // Memeriksa badge status COMPLETED
    const completedBadges = screen.getAllByText('COMPLETED');
    expect(completedBadges.length).toBeGreaterThan(0);
  });

  it('menonaktifkan tombol batalkan jika ada pack yang berstatus PACKED (safety locking)', async () => {
    render(<ProsesSortirPage />);

    await waitFor(() => {
      expect(screen.getByText('Budi Hartono')).toBeInTheDocument();
    });

    // Sesi 1 (seluruh pack SORTED): tombol batalkan aktif
    const cancelBtns = screen.getAllByRole('button', { name: /Batalkan Sesi/i });
    expect(cancelBtns[0]).not.toBeDisabled();

    // Sesi 2 (ada pack PACKED): tombol batalkan terkunci (disabled)
    expect(cancelBtns[1]).toBeDisabled();
  });

  it('membuka modal input sortir saat tombol "+ Catat Hasil Sortir" diklik', async () => {
    render(<ProsesSortirPage />);

    const openBtn = await screen.findByRole('button', { name: /Catat Hasil Sortir/i });
    fireEvent.click(openBtn);

    expect(screen.getByText('Pencatatan Hasil Sortir Pack')).toBeInTheDocument();
  });
});
