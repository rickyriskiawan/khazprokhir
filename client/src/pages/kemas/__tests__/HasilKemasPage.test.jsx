import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HasilKemasPage from '../HasilKemasPage';
import * as kemasService from '@/services/kemasService';
import * as bonMasukService from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/kemasService', () => ({
  getKemasList: vi.fn(),
  getKemasSummary: vi.fn(),
  getSesiSiapKemas: vi.fn(),
  getNextDoosNumber: vi.fn(),
  createKemas: vi.fn(),
}));

vi.mock('@/services/bonMasukService', () => ({
  getMasterShift: vi.fn(),
}));

const mockRecords = [
  {
    id: 155,
    proses_sortir_id: 100,
    tanggal_kemas: '2026-10-04T00:00:00.000Z',
    shift_id: 1,
    shift: { id: 1, nama: 'Shift 1' },
    no_doos_awal: 1,
    no_doos_akhir: 9,
    total_doos: 9,
    total_pack: 4,
    total_bilyet: '180000',
    status: 'SIAP_KEMAS',
    operator: { id: 1, username: 'operator', full_name: 'Petugas Operator Khazprokhir' },
    batch: {
      id: 123,
      nomor_batch: '1822001',
      seri: 'AA-BA',
      kepala: '0',
      tahun_anggaran: 2026,
      emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
    },
  },
  {
    id: 156,
    proses_sortir_id: 101,
    tanggal_kemas: '2026-10-04T00:00:00.000Z',
    shift_id: 2,
    shift: { id: 2, nama: 'Shift 2' },
    no_doos_awal: 19,
    no_doos_akhir: 27,
    total_doos: 9,
    total_pack: 4,
    total_bilyet: '180000',
    status: 'READY',
    operator: { id: 1, username: 'operator', full_name: 'Petugas Operator Khazprokhir' },
    batch: {
      id: 123,
      nomor_batch: '1822001',
      seri: 'AA-BA',
      kepala: '0',
      tahun_anggaran: 2026,
      emisi: { denominasi: { nama: 'Y', nilai: 100000 } },
    },
  },
];

const mockSummary = {
  siap_kemas: { total_kemas: 1, total_pack: 4, total_doos: 9, total_bilyet: '180000' },
  hasil_kemas: { total_kemas: 1, total_pack: 4, total_doos: 9, total_bilyet: '180000' },
  total_semua: { total_kemas: 2, total_pack: 8, total_doos: 18, total_bilyet: '360000' },
};

const mockSessions = [
  {
    id: 100,
    tanggal_sortir: '2026-10-03T00:00:00.000Z',
    penyortir_1: 'M. Rulli Maulana',
    penyortir_2: null,
    total_pack: 4,
    total_doos: 9,
    is_fully_available: true,
    is_kelipatan_empat: true,
    batch: {
      id: 123,
      nomor_batch: '1822001',
      seri: 'AA-BA',
      kepala: '0',
      tahun_anggaran: 2026,
      emisi: { tahun: '2022', denominasi: { nama: 'Y', nilai: 100000 } },
    },
    packs: [
      { id: 1, nomor_pack: 17, status: 'SORTED', bon_masuk: { no_segel: 'SGL-1' } },
      { id: 2, nomor_pack: 18, status: 'SORTED', bon_masuk: { no_segel: 'SGL-1' } },
      { id: 3, nomor_pack: 19, status: 'SORTED', bon_masuk: { no_segel: 'SGL-1' } },
      { id: 4, nomor_pack: 20, status: 'SORTED', bon_masuk: { no_segel: 'SGL-1' } },
    ],
  },
];

describe('HasilKemasPage Component (FE-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, username: 'supervisor', role: 'SUPERVISOR', full_name: 'Pak Supervisor' },
      isAuthenticated: true,
    });

    kemasService.getKemasList.mockResolvedValue({
      data: mockRecords,
      meta: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });
    kemasService.getKemasSummary.mockResolvedValue(mockSummary);
    kemasService.getSesiSiapKemas.mockResolvedValue({ data: mockSessions, meta: { total: 1 } });
    kemasService.getNextDoosNumber.mockResolvedValue({ next_no_doos_awal: 28 });
    bonMasukService.getMasterShift.mockResolvedValue([
      { id: 1, nama: 'Shift 1', jam_mulai: '07:30', jam_selesai: '16:00' },
      { id: 2, nama: 'Shift 2', jam_mulai: '16:00', jam_selesai: '23:30' },
    ]);
  });

  it('merender header, KPI siap kemas/hasil kemas, dan tabel riwayat kemas', async () => {
    render(<HasilKemasPage />);

    expect(screen.getByText('Pengemasan Doos & Hasil Kemas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Siap Kemas (Antrian WIP)')).toBeInTheDocument();
      expect(screen.getByText('Hasil Kemas (Selesai)')).toBeInTheDocument();
    });

    // Tabel riwayat: rentang no doos, batch & seri, pack, penginput
    await waitFor(() => {
      expect(screen.getByText('1–9')).toBeInTheDocument();
      expect(screen.getByText('19–27')).toBeInTheDocument();
    });
    expect(screen.getAllByText('1822001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AA-BA0 • TA 2026').length).toBe(2);
    expect(screen.getAllByText('4 Pack').length).toBe(2);
    expect(screen.getAllByText('Petugas Operator Khazprokhir').length).toBe(2);
  });

  it('menampilkan badge status Siap Kemas dan Hasil Kemas', async () => {
    render(<HasilKemasPage />);

    await waitFor(() => {
      expect(screen.getByText('Siap Kemas')).toBeInTheDocument();
      expect(screen.getByText('Hasil Kemas')).toBeInTheDocument();
    });
  });

  it('membuka modal input kemas saat tombol "Catat Hasil Kemas" diklik', async () => {
    render(<HasilKemasPage />);

    const openBtn = await screen.findByRole('button', { name: /Catat Hasil Kemas/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText('Pencatatan Hasil Pengemasan Doos')).toBeInTheDocument();
    // Sesi siap kemas dimuat saat modal dibuka
    await waitFor(() => {
      expect(kemasService.getSesiSiapKemas).toHaveBeenCalled();
    });
  });

  it('menyembunyikan tombol input untuk role AUDITOR (read-only)', async () => {
    useAuthStore.setState({
      user: { id: 4, username: 'auditor', role: 'AUDITOR', full_name: 'Auditor' },
      isAuthenticated: true,
    });

    render(<HasilKemasPage />);

    await waitFor(() => {
      expect(screen.getByText('Pengemasan Doos & Hasil Kemas')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Catat Hasil Kemas/i })).not.toBeInTheDocument();
  });

  it('mengirim filter rentang tanggal & pencarian ke service', async () => {
    render(<HasilKemasPage />);

    await waitFor(() => {
      expect(kemasService.getKemasList).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText('Cari Nomor Batch / Seri...');
    fireEvent.change(searchInput, { target: { value: '1822001' } });

    await waitFor(() => {
      const lastCall = kemasService.getKemasList.mock.calls.at(-1)[0];
      expect(lastCall.search).toBe('1822001');
    });

    const dariInput = screen.getByLabelText('Tanggal Mulai');
    fireEvent.change(dariInput, { target: { value: '2026-10-01' } });

    await waitFor(() => {
      const lastCall = kemasService.getKemasList.mock.calls.at(-1)[0];
      expect(lastCall.tanggal_dari).toBe('2026-10-01');
    });
  });
});
