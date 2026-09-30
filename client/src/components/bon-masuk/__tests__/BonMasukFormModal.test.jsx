import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BonMasukFormModal from '../BonMasukFormModal';
import * as bonMasukService from '@/services/bonMasukService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/bonMasukService', () => ({
  createBonMasuk: vi.fn(),
  updateBonMasuk: vi.fn(),
  getBatchById: vi.fn(),
}));

const mockBatches = [
  {
    id: 1,
    nomor_batch: 'ORD-2026-001',
    seri: 'AA-BA',
    kepala: '0',
    tahun_anggaran: 2026,
    emisi: { denominasi: { nama: 'Rp 100.000' } },
    packs: [
      { id: 1, nomor_pack: 1, status: 'RECEIVED' },
      { id: 2, nomor_pack: 2, status: 'RECEIVED' },
      { id: 3, nomor_pack: 3, status: 'PENDING' },
    ],
  },
];

const mockShifts = [
  { id: 1, nama_shift: 'Shift 1', jam_mulai: '07:00', jam_selesai: '15:00' },
  { id: 2, nama_shift: 'Shift 2', jam_mulai: '15:00', jam_selesai: '23:00' },
];

const mockEmisi = [
  { id: 1, kode_emisi: 'TE 2022', denominasi: { nama: 'Rp 100.000', nilai: 100000 } },
];

describe('BonMasukFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 10, username: 'mruli', nama: 'M Ruli Maulana' },
      isAuthenticated: true,
    });
  });

  it('renders modal in Create mode with clean empty batch, auto-filled user, and no no_bon/petugas_khazai', () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    expect(screen.getByText('Input Penerimaan Bon Masuk Khazai')).toBeInTheDocument();
    
    // No no_bon or petugas_khazai fields
    expect(screen.queryByLabelText(/Nomor Referensi Bon/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Petugas Khazai/i)).not.toBeInTheDocument();

    // Auto-filled petugas penerima
    const penerimaInput = screen.getByLabelText(/Petugas Penerima Khazprokhir/i);
    expect(penerimaInput).toHaveValue('M Ruli Maulana');

    // Clean empty initial batch
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('0 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('0 Bilyet');
  });

  it('reactively updates Live Calculator when pack input changes on a selected batch', () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    // Ketik rentang pack acak: 10-20 (11 pack = 495.000 Bilyet)
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    fireEvent.change(packInput, { target: { value: '10-20' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('11 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('495.000 Bilyet');

    // Ubah ke format non-kontigu: 10-15, 20, 25 (8 pack = 360.000 Bilyet)
    fireEvent.change(packInput, { target: { value: '10-15, 20, 25' } });
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('8 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('360.000 Bilyet');

    // Ubah ke invalid range (50-10)
    fireEvent.change(packInput, { target: { value: '50-10' } });
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('0 Pack');
    expect(screen.getByText(/Rentang nomor pack tidak valid: 50 lebih besar dari 10/i)).toBeInTheDocument();
  });

  it('detects already received packs and prevents submit with clear error warning', async () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    // Select batch 1
    const comboboxInput = screen.getByPlaceholderText(/Cari Batch/i);
    fireEvent.focus(comboboxInput);
    const option = await screen.findByText(/ORD-2026-001/i);
    fireEvent.click(option);

    // Input pack 1 and 2 (which are already RECEIVED in mockBatches[0].packs)
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    fireEvent.change(packInput, { target: { value: '1, 2, 10' } });

    // Warning is rendered
    expect(screen.getByText(/Pack #1, #2 sudah pernah diterima sebelumnya pada batch ini!/i)).toBeInTheDocument();

    // Submit button is disabled
    const submitBtn = screen.getByRole('button', { name: /Catat Bon Masuk/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submits valid payload in Create mode without no_bon and with auto-filled penerima', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    bonMasukService.createBonMasuk.mockResolvedValueOnce({ id: 101 });

    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={onOpenChange}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
        onSuccess={onSuccess}
      />
    );

    // Isi nomor segel
    const segelInput = screen.getByLabelText(/Nomor Segel/i);
    fireEvent.change(segelInput, { target: { value: 'SGL-TEST-2026' } });

    // Pilih batch
    const comboboxInput = screen.getByPlaceholderText(/Cari Batch/i);
    fireEvent.focus(comboboxInput);
    const option = await screen.findByText(/ORD-2026-001/i);
    fireEvent.click(option);

    // Input available pack range (pack 10-20)
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    fireEvent.change(packInput, { target: { value: '10-20' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Catat Bon Masuk/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bonMasukService.createBonMasuk).toHaveBeenCalledTimes(1);
    });

    const calledPayload = bonMasukService.createBonMasuk.mock.calls[0][0];
    expect(calledPayload.no_segel).toBe('SGL-TEST-2026');
    expect(calledPayload.petugas_khazprokhir).toBe('M Ruli Maulana');
    expect(calledPayload.no_bon).toBeUndefined();
    expect(calledPayload.petugas_khazai).toBeUndefined();
    expect(calledPayload.items).toEqual([
      {
        batch_id: 1,
        nomor_pack_list: '10-20',
      },
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('supports adding batch items with button positioned below cards', () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    expect(screen.getByText('Batch #1')).toBeInTheDocument();
    expect(screen.queryByText('Batch #2')).not.toBeInTheDocument();

    // Klik tombol Tambah Batch ke Segel Ini
    const addBtn = screen.getByRole('button', { name: /\+ Tambah Batch ke Segel Ini/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Batch #2')).toBeInTheDocument();

    // Hapus baris kedua
    const removeBtns = screen.getAllByTitle('Hapus Batch Ini dari Segel');
    expect(removeBtns).toHaveLength(2);
    fireEvent.click(removeBtns[1]);

    expect(screen.queryByText('Batch #2')).not.toBeInTheDocument();
  });

  it('pre-fills data and calls updateBonMasuk in Edit mode with granular safety locking', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    bonMasukService.updateBonMasuk.mockResolvedValueOnce({ id: 99 });

    const initialData = {
      id: 99,
      no_segel: 'SGL-EXISTING-99',
      shift_id: 1,
      kategori_penerimaan: 'PARSIAL',
      catatan: 'Catatan awal',
      petugas_khazprokhir: 'Operator Khusus',
      items: [
        {
          id: 1,
          batch_id: 1,
          nomor_pack_list: '10-50',
          total_pack: 41,
          jumlah_bilyet: 1845000n,
          batch: mockBatches[0],
        },
      ],
      packs: [
        { id: 1, batch_id: 1, nomor_pack: 10, status: 'RECEIVED' },
      ],
    };

    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={onOpenChange}
        initialData={initialData}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText('Edit Data Bon Masuk Khazai')).toBeInTheDocument();
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('41 Pack');

    // Petugas penerima should have 'Operator Khusus'
    expect(screen.getByLabelText(/Petugas Penerima Khazprokhir/i)).toHaveValue('Operator Khusus');

    // Ubah pack input ke 10-60
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    fireEvent.change(packInput, { target: { value: '10-60' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('51 Pack');

    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bonMasukService.updateBonMasuk).toHaveBeenCalledTimes(1);
    });

    const calledPayload = bonMasukService.updateBonMasuk.mock.calls[0][1];
    expect(calledPayload.no_segel).toBe('SGL-EXISTING-99');
    expect(calledPayload.items[0].nomor_pack_list).toBe('10-60');
  });
});
