import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KemasFormModal from '../KemasFormModal';
import * as kemasService from '@/services/kemasService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/kemasService', () => ({
  getSesiSiapKemas: vi.fn(),
  getNextDoosNumber: vi.fn(),
  createKemas: vi.fn(),
}));

const mockSessions = [
  {
    id: 100,
    tanggal_sortir: '2026-10-03T00:00:00.000Z',
    penyortir_1: 'M. Rulli Maulana',
    penyortir_2: 'Petugas Kedua',
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
  {
    id: 98,
    tanggal_sortir: '2026-10-02T00:00:00.000Z',
    penyortir_1: 'Budi Santoso',
    penyortir_2: null,
    total_pack: 8,
    total_doos: 18,
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
      { id: 10, nomor_pack: 89, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 11, nomor_pack: 90, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 12, nomor_pack: 91, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 13, nomor_pack: 92, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 14, nomor_pack: 93, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 15, nomor_pack: 94, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 16, nomor_pack: 95, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
      { id: 17, nomor_pack: 96, status: 'SORTED', bon_masuk: { no_segel: 'SGL-2' } },
    ],
  },
];

const shifts = [
  { id: 1, nama: 'Shift 1', jam_mulai: '07:30', jam_selesai: '16:00' },
];

const renderModal = (props = {}) =>
  render(
    <KemasFormModal
      open={true}
      onOpenChange={vi.fn()}
      shifts={shifts}
      onSuccess={vi.fn()}
      {...props}
    />
  );

describe('KemasFormModal (FE-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, username: 'operator', role: 'OPERATOR', full_name: 'Petugas Operator' },
      isAuthenticated: true,
    });

    kemasService.getSesiSiapKemas.mockResolvedValue({ data: mockSessions, meta: { total: 2 } });
    kemasService.getNextDoosNumber.mockResolvedValue({ next_no_doos_awal: 28 });
    kemasService.createKemas.mockResolvedValue({ id: 999 });
  });

  it('memuat daftar sesi siap kemas dan menampilkan placeholder sebelum sesi dipilih', async () => {
    renderModal();

    await waitFor(() => {
      expect(kemasService.getSesiSiapKemas).toHaveBeenCalled();
    });

    expect(await screen.findByText('Pilih Sesi Sortir Terlebih Dahulu')).toBeInTheDocument();
    expect(screen.getByText(/2 sesi sortir siap dikemas/)).toBeInTheDocument();
  });

  it('memilih sesi mengisi nomor doos awal dari rekomendasi dan menghitung doos akhir', async () => {
    renderModal();

    const input = await screen.findByTestId('sesi-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    // Pilih sesi #100 (4 pack = 9 doos)
    const option = await screen.findByText(/Sesi #100/);
    fireEvent.click(option.closest('button'));

    await waitFor(() => {
      expect(kemasService.getNextDoosNumber).toHaveBeenCalledWith({ batch_id: 123 });
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/No\. Doos Awal/i)).toHaveValue(28);
      expect(screen.getByLabelText(/No\. Doos Akhir/i)).toHaveValue(36); // 28 + 9 - 1
    });

    // Ringkasan sesi terpilih
    expect(screen.getByText('4 Pack = 9 Doos')).toBeInTheDocument();
    expect(screen.getByText('M. Rulli Maulana & Petugas Kedua')).toBeInTheDocument();
  });

  it('memblokir submit sampai checkbox konfirmasi pengemasan dicentang', async () => {
    renderModal();

    const input = await screen.findByTestId('sesi-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    const option = await screen.findByText(/Sesi #100/);
    fireEvent.click(option.closest('button'));

    await waitFor(() => {
      expect(screen.getByLabelText(/No\. Doos Awal/i)).toHaveValue(28);
    });

    const submitBtn = screen.getByRole('button', { name: /Simpan Hasil Kemas/i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Centang konfirmasi pengemasan/i)).toBeInTheDocument();

    // Centang konfirmasi -> tombol aktif
    const checkbox = screen.getByLabelText(/Saya mengonfirmasi bahwa doos fisik/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Hasil Kemas/i })).not.toBeDisabled();
    });
  });

  it('mengirim payload berbasis sesi sortir saat disimpan', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ onSuccess, onOpenChange });

    const input = await screen.findByTestId('sesi-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    const option = await screen.findByText(/Sesi #100/);
    fireEvent.click(option.closest('button'));

    await waitFor(() => {
      expect(screen.getByLabelText(/No\. Doos Awal/i)).toHaveValue(28);
    });

    fireEvent.click(screen.getByLabelText(/Saya mengonfirmasi bahwa doos fisik/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Hasil Kemas/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Hasil Kemas/i }));

    await waitFor(() => {
      expect(kemasService.createKemas).toHaveBeenCalled();
    });

    const payload = kemasService.createKemas.mock.calls[0][0];
    expect(payload.proses_sortir_id).toBe(100);
    expect(payload.shift_id).toBe(1);
    expect(payload.no_doos_awal).toBe(28);
    expect(payload.no_doos_akhir).toBe(36);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('menampilkan error dari API saat penyimpanan gagal', async () => {
    kemasService.createKemas.mockRejectedValue({
      response: { data: { message: 'Nomor doos 28 s/d 36 bertabrakan dengan hasil kemas ID 9.' } },
    });

    renderModal();

    const input = await screen.findByTestId('sesi-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    const option = await screen.findByText(/Sesi #100/);
    fireEvent.click(option.closest('button'));

    await waitFor(() => {
      expect(screen.getByLabelText(/No\. Doos Awal/i)).toHaveValue(28);
    });

    fireEvent.click(screen.getByLabelText(/Saya mengonfirmasi bahwa doos fisik/i));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Hasil Kemas/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Hasil Kemas/i }));

    expect(await screen.findByText(/bertabrakan dengan hasil kemas/i)).toBeInTheDocument();
  });
});
