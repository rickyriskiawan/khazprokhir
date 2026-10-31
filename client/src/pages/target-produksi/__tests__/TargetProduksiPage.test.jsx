import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TargetProduksiPage from '../TargetProduksiPage';
import * as targetProduksiService from '@/services/targetProduksiService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/targetProduksiService', () => ({
  getTargetProduksiList: vi.fn(),
  getMasterDenominasi: vi.fn(),
  getMasterEmisi: vi.fn(),
  createTargetProduksiGroup: vi.fn(),
  updateTargetProduksiGroup: vi.fn(),
  deleteTargetProduksiGroup: vi.fn(),
  calculateDoosCeiling: (val) => {
    const num = Number(val || 0);
    return num > 0 ? Math.ceil(num / 20000) : 0;
  },
}));

const mockGroupedResponse = {
  data: [],
  meta: {
    grouped: [
      {
        tahun_anggaran: 2026,
        total_bilyet: '1000001000',
        total_doos: 50002,
        emisi_groups: [
          {
            tahun_anggaran: 2026,
            tahun_emisi: 2022,
            kode_emisi: 'TE 2022',
            catatan: 'Target Kuota Utama TA 2026',
            total_bilyet: '1000001000',
            total_doos: 50002,
            items: [
              {
                id: 1,
                denominasi_id: 1,
                kode_pecahan: 'Y',
                nilai_pecahan: 100000,
                sandi: "Y'22",
                target_bilyet: '900000500',
                target_doos: 45001,
              },
              {
                id: 2,
                denominasi_id: 2,
                kode_pecahan: 'X',
                nilai_pecahan: 50000,
                sandi: "X'22",
                target_bilyet: '100000500',
                target_doos: 5001,
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('TargetProduksiPage - Vertical Slice 1 (Read & Grouped Display)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 2, username: 'supervisor', role: 'SUPERVISOR' },
      isAuthenticated: true,
    });
    targetProduksiService.getTargetProduksiList.mockResolvedValue(mockGroupedResponse);
    targetProduksiService.getMasterDenominasi.mockResolvedValue([
      { id: 1, nama: 'Y', nilai: 100000 },
      { id: 2, nama: 'X', nilai: 50000 },
      { id: 3, nama: 'W', nilai: 20000 },
      { id: 4, nama: 'V', nilai: 10000 },
      { id: 5, nama: 'U', nilai: 5000 },
      { id: 6, nama: 'T', nilai: 2000 },
      { id: 7, nama: 'S', nilai: 1000 },
    ]);
    targetProduksiService.getMasterEmisi.mockResolvedValue([
      { id: 1, kode_emisi: 'TE 2022', sandi: "Y'22", tahun: '2022', denominasi_id: 1 },
    ]);
  });

  it('menampilkan kartu pengelompokan per Tahun Anggaran dan sub-panel Tahun Emisi dengan 3 kolom (Pecahan sandi, Target Bilyet, Target Doos)', async () => {
    const { container } = render(<TargetProduksiPage />);

    // Pastikan root container memiliki padding standar halaman dan max-width 1440px
    const rootWrapper = container.firstElementChild;
    expect(rootWrapper).toHaveClass('p-4', 'md:p-6', 'lg:p-8', 'max-w-[1440px]', 'mx-auto');

    await waitFor(() => {
      expect(screen.getByText(/Tahun Anggaran 2026/i)).toBeInTheDocument();
    });

    // Sub-panel Tahun Emisi
    expect(screen.getByText(/TE 2022/i)).toBeInTheDocument();

    // Kolom Pecahan hanya menampilkan sandi (Y'22, X'22)
    expect(screen.getByText("Y'22")).toBeInTheDocument();
    expect(screen.getByText("X'22")).toBeInTheDocument();

    // Nilai Bilyet & Doos hasil pembulatan ke atas (900.000.500 -> 45.001 Doos)
    expect(screen.getByText('900.000.500')).toBeInTheDocument();
    expect(screen.getByText('45.001')).toBeInTheDocument();
    expect(screen.getByText('100.000.500')).toBeInTheDocument();
    expect(screen.getByText('5.001')).toBeInTheDocument();

    // Baris Total menampilkan akumulasi Bilyet dan penjumlahan Doos (45.001 + 5.001 = 50.002)
    expect(screen.getAllByText('1.000.001.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50.002').length).toBeGreaterThanOrEqual(1);

    // Pastikan tidak menampilkan kolom Pack atau Nilai Nominal
    expect(screen.queryByText(/Target \(Pack\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nilai Nominal/i)).not.toBeInTheDocument();
  });

  it('membuka modal Tambah Target Produksi, menghitung preview Doos ceiling otomatis, dan mengirim payload 7 pecahan sekaligus', async () => {
    targetProduksiService.createTargetProduksiGroup.mockResolvedValue({
      tahun_anggaran: 2027,
      tahun_emisi: 2026,
      total_bilyet: '900000500',
      total_doos: 45001,
      items: [],
    });

    render(<TargetProduksiPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tambah Target Produksi/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tambah Target Produksi/i }));

    // Isi Tahun Anggaran dan Tahun Emisi
    const inputTA = await screen.findByLabelText(/^Tahun Anggaran$/i);
    fireEvent.change(inputTA, { target: { value: '2027' } });

    const inputTE = screen.getByLabelText(/Tahun Emisi/i);
    fireEvent.change(inputTE, { target: { value: '2026' } });

    // Isi Target Bilyet untuk pecahan Y dengan buntut 500 bilyet (900000500 -> 45.001 Doos)
    const inputPecahanY = screen.getByLabelText(/Target Bilyet Y/i);
    fireEvent.change(inputPecahanY, { target: { value: '900000500' } });

    // Pastikan preview Doos ceiling di dalam modal menampilkan 45.001
    await waitFor(() => {
      expect(screen.getAllByText('45.001').length).toBeGreaterThanOrEqual(2);
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Simpan Target Produksi/i }));

    await waitFor(() => {
      expect(targetProduksiService.createTargetProduksiGroup).toHaveBeenCalledTimes(1);
    });

    const submittedPayload = targetProduksiService.createTargetProduksiGroup.mock.calls[0][0];
    expect(submittedPayload.tahun_anggaran).toBe(2027);
    expect(submittedPayload.tahun_emisi).toBe(2026);
    expect(submittedPayload.items).toHaveLength(7);
    expect(submittedPayload.items[0]).toEqual({
      denominasi_id: 1,
      target_bilyet: '900000500',
    });
  });

  it('membuka modal Edit dan dialog Hapus untuk grup (Tahun Anggaran, Tahun Emisi), serta menyembunyikan tombol mutasi untuk MANAGEMENT/AUDITOR', async () => {
    targetProduksiService.updateTargetProduksiGroup.mockResolvedValue({});
    targetProduksiService.deleteTargetProduksiGroup.mockResolvedValue({});

    const { unmount } = render(<TargetProduksiPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tahun Anggaran 2026/i)).toBeInTheDocument();
    });

    // Klik Edit pada sub-panel Tahun Emisi 2022
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const inputPecahanY = await screen.findByLabelText(/Target Bilyet Y/i);
    fireEvent.change(inputPecahanY, { target: { value: '920040500' } });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

    await waitFor(() => {
      expect(targetProduksiService.updateTargetProduksiGroup).toHaveBeenCalledWith(
        2026,
        2022,
        expect.objectContaining({
          items: expect.any(Array),
        })
      );
    });

    // Klik Hapus pada sub-panel Tahun Emisi 2022
    fireEvent.click(screen.getByRole('button', { name: /Hapus/i }));
    const confirmDeleteBtn = await screen.findByRole('button', { name: /Ya, Hapus Target/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(targetProduksiService.deleteTargetProduksiGroup).toHaveBeenCalledWith(2026, 2022);
    });

    unmount();

    // Uji role MANAGEMENT (read-only: tombol Tambah, Edit, Hapus tidak muncul)
    useAuthStore.setState({
      user: { id: 3, username: 'manajemen', role: 'MANAGEMENT' },
      isAuthenticated: true,
    });

    render(<TargetProduksiPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tahun Anggaran 2026/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Tambah Target Produksi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hapus/i })).not.toBeInTheDocument();
  });
});
