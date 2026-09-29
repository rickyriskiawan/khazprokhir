import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BonMasukFormModal from '../BonMasukFormModal';
import * as bonMasukService from '@/services/bonMasukService';

vi.mock('@/services/bonMasukService', () => ({
  createBonMasuk: vi.fn(),
  updateBonMasuk: vi.fn(),
}));

const mockBatches = [
  {
    id: 1,
    nomor_batch: 'ORD-2026-001',
    seri: 'AA-BA',
    kepala: '0',
    tahun_anggaran: 2026,
    emisi: { denominasi: { nama: 'Rp 100.000' } },
  },
];

const mockShifts = [
  { id: 1, nama_shift: 'Shift 1', jam_mulai: '07:00', jam_selesai: '15:00' },
  { id: 2, nama_shift: 'Shift 2', jam_mulai: '15:00', jam_selesai: '23:00' },
];

const mockEmisi = [
  { id: 1, kode_emisi: 'TE 2022', denominasi: { nama: 'Rp 100.000' } },
];

describe('BonMasukFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title for Create mode and default 100 packs live calculation', () => {
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
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('100 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('4.500.000 Bilyet');
  });

  it('reactively updates Live Calculator when non-contiguous pack input changes', () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);

    // Ubah ke pack 1-20 (20 pack = 900.000 Bilyet)
    fireEvent.change(packInput, { target: { value: '1-20' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('20 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('900.000 Bilyet');

    // Ubah ke daftar acak/non-contiguous: 1-10, 13, 16, 20, 22 (14 pack = 630.000 Bilyet)
    fireEvent.change(packInput, { target: { value: '1-10, 13, 16, 20, 22' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('14 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('630.000 Bilyet');

    // Ubah ke invalid range (50-10)
    fireEvent.change(packInput, { target: { value: '50-10' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('0 Pack');
    expect(screen.getByText(/Rentang nomor pack tidak valid: 50 lebih besar dari 10/i)).toBeInTheDocument();
  });

  it('submits valid payload in Create mode with multi-batch repeater items', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    bonMasukService.createBonMasuk.mockResolvedValueOnce({ id: 1 });

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
    const segelInput = screen.getByLabelText(/Nomor Segel Fisik/i);
    fireEvent.change(segelInput, { target: { value: 'SGL-TEST-123' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Catat Bon Masuk/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bonMasukService.createBonMasuk).toHaveBeenCalledTimes(1);
    });

    const calledPayload = bonMasukService.createBonMasuk.mock.calls[0][0];
    expect(calledPayload.no_segel).toBe('SGL-TEST-123');
    expect(calledPayload.items).toEqual([
      {
        batch_id: 1,
        nomor_pack_list: '1-100',
      },
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('supports adding and removing batch items in the repeater', () => {
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
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('100 Pack');

    // Klik Tambah Batch
    const addBtn = screen.getByRole('button', { name: /Tambah Batch/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Batch #2')).toBeInTheDocument();
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('200 Pack');

    // Hapus baris kedua
    const removeBtns = screen.getAllByTitle('Hapus Batch Ini dari Segel');
    expect(removeBtns).toHaveLength(2);
    fireEvent.click(removeBtns[1]);

    expect(screen.queryByText('Batch #2')).not.toBeInTheDocument();
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('100 Pack');
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
      items: [
        {
          id: 1,
          batch_id: 1,
          nomor_pack_list: '1-50',
          total_pack: 50,
          jumlah_bilyet: 2250000n,
          batch: mockBatches[0],
        },
      ],
      packs: [
        { id: 1, batch_id: 1, nomor_pack: 1, status: 'RECEIVED' },
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
    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('50 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('2.250.000 Bilyet');

    // Ubah pack input ke 1-60
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    fireEvent.change(packInput, { target: { value: '1-60' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('60 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('2.700.000 Bilyet');

    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bonMasukService.updateBonMasuk).toHaveBeenCalledWith(99, expect.objectContaining({
        no_segel: 'SGL-EXISTING-99',
        items: [
          {
            batch_id: 1,
            nomor_pack_list: '1-60',
          },
        ],
      }));
    });
  });

  it('displays lock indicator and disables input when batch has sorted packs', () => {
    const lockedInitialData = {
      id: 99,
      no_segel: 'SGL-LOCKED-99',
      shift_id: 1,
      items: [
        {
          id: 1,
          batch_id: 1,
          nomor_pack_list: '1-50',
          batch: mockBatches[0],
        },
      ],
      packs: [
        { id: 1, batch_id: 1, nomor_pack: 1, status: 'SORTED' },
      ],
    };

    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={lockedInitialData}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    expect(screen.getByText('Terkunci (Sudah Masuk Sortir)')).toBeInTheDocument();
    const packInput = screen.getByPlaceholderText(/Contoh: 1-10, 13, 16, 20, 22/i);
    expect(packInput).toBeDisabled();
  });
});

