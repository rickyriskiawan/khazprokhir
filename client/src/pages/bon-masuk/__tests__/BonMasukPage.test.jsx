import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BonMasukPage from '../BonMasukPage';
import * as bonMasukService from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/bonMasukService');
vi.mock('@/stores/authStore');

const mockBonList = [
  {
    id: 1,
    no_segel: 'SGL-2026-001',
    tanggal_masuk: '2026-09-15T00:00:00.000Z',
    jam_masuk: '08:30',
    pack_dari: 1,
    pack_sampai: 50,
    jumlah_bilyet: 2250000n,
    kategori_penerimaan: 'MASINAL',
    jenis_mesin_sortir: 'BPS-01',
    batch: {
      id: 1,
      nomor_batch: 'BATCH-001',
      seri: 'AA-BA',
      kepala: '0',
      tahun_anggaran: 2026,
      emisi: { denominasi: { nama: 'Rp 100.000' } },
    },
    shift: { id: 1, nama_shift: 'Shift 1' },
    operator: { full_name: 'Budi Santoso' },
  },
];

const mockSummary = {
  tanggal: '2026-09-15',
  total_bon: 2,
  total_pack: 150,
  total_bilyet: '6750000',
};

const mockBatches = [
  { id: 1, nomor_batch: 'BATCH-001', seri: 'AA-BA', kepala: '0', tahun_anggaran: 2026 },
];

const mockDenom = [{ id: 1, nama: 'Rp 100.000' }];
const mockShift = [{ id: 1, nama_shift: 'Shift 1' }];
const mockEmisi = [{ id: 1, kode_emisi: 'TE 2022' }];

describe('BonMasukPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.mockReturnValue({
      user: { id: 1, username: 'operator', role: 'OPERATOR' },
    });

    bonMasukService.getBatches.mockResolvedValue(mockBatches);
    bonMasukService.getMasterDenominasi.mockResolvedValue(mockDenom);
    bonMasukService.getMasterShift.mockResolvedValue(mockShift);
    bonMasukService.getMasterEmisi.mockResolvedValue(mockEmisi);
    bonMasukService.getBonMasukList.mockResolvedValue({
      data: mockBonList,
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    bonMasukService.getTodayBonMasukSummary.mockResolvedValue(mockSummary);
  });

  it('renders page header, mini KPI banner, and data table', async () => {
    render(<BonMasukPage />);

    expect(screen.getByText('Penerimaan Bon Masuk Khazai')).toBeInTheDocument();
    expect(screen.getByText('Modul 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Input Bon Masuk/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Bon Masuk Hari Ini')).toBeInTheDocument();
      expect(screen.getByText('Total Pack Diterima Hari Ini')).toBeInTheDocument();
      expect(screen.getByText('Total Bilyet Diterima Hari Ini')).toBeInTheDocument();
    });

    // Periksa angka KPI
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 dokumen
    expect(screen.getByText('150')).toBeInTheDocument(); // 150 pack
    expect(screen.getByText(/6\.750\.000 Bilyet/i)).toBeInTheDocument();

    // Periksa baris tabel
    expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    expect(screen.getByText('BATCH-001')).toBeInTheDocument();
    expect(screen.getByText('Pack 1 - 50')).toBeInTheDocument();
    expect(screen.getByText('50 Pack')).toBeInTheDocument();
    expect(screen.getByText('2.250.000 Bilyet')).toBeInTheDocument();
  });

  it('opens Create Modal when "+ Input Bon Masuk" button is clicked', async () => {
    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Input Bon Masuk/i });
    fireEvent.click(createBtn);

    expect(await screen.findByText('Input Penerimaan Bon Masuk Khazai')).toBeInTheDocument();
  });

  it('opens Detail Modal when "Lihat Detail" eye button is clicked', async () => {
    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    });

    const detailBtn = screen.getByTitle('Lihat Detail Bon');
    fireEvent.click(detailBtn);

    expect(await screen.findByText('Detail Penerimaan Bon Masuk')).toBeInTheDocument();
    expect(screen.getByText('ID #1')).toBeInTheDocument();
  });

  it('opens Edit Modal when "Edit" pencil button is clicked', async () => {
    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit Bon Masuk');
    fireEvent.click(editBtn);

    expect(await screen.findByText('Edit Data Bon Masuk Khazai')).toBeInTheDocument();
  });

  it('opens Delete Dialog when "Hapus" trash button is clicked', async () => {
    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Hapus / Batalkan Bon');
    fireEvent.click(deleteBtn);

    expect(await screen.findByText('Konfirmasi Pembatalan Bon Masuk')).toBeInTheDocument();
  });

  it('displays empty state when list is empty', async () => {
    bonMasukService.getBonMasukList.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 15, total: 0, totalPages: 1 },
    });

    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada data bon masuk.')).toBeInTheDocument();
    });
  });

  it('handles search input and triggers data re-fetch', async () => {
    render(<BonMasukPage />);

    await waitFor(() => {
      expect(screen.getByText('SGL-2026-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Cari No\. Segel \/ Batch\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'SGL-999' } });

    await waitFor(() => {
      expect(bonMasukService.getBonMasukList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'SGL-999',
        })
      );
    });
  });
});

