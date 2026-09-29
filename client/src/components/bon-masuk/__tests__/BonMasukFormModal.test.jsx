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

  it('reactively updates Live Calculator when pack_dari and pack_sampai change', () => {
    render(
      <BonMasukFormModal
        open={true}
        onOpenChange={vi.fn()}
        batches={mockBatches}
        shifts={mockShifts}
        emisiList={mockEmisi}
      />
    );

    const packDariInput = screen.getByLabelText(/Pack Dari/i);
    const packSampaiInput = screen.getByLabelText(/Pack Sampai/i);

    // Ubah ke pack 1 s/d 20 (20 pack = 900.000 Bilyet)
    fireEvent.change(packDariInput, { target: { value: '1' } });
    fireEvent.change(packSampaiInput, { target: { value: '20' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('20 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('900.000 Bilyet');

    // Ubah ke invalid range (pack_dari > pack_sampai)
    fireEvent.change(packDariInput, { target: { value: '50' } });
    fireEvent.change(packSampaiInput, { target: { value: '10' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('-');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('-');
    expect(
      screen.getByText(/Rentang tidak valid: Pack Dari harus ≤ Pack Sampai/i)
    ).toBeInTheDocument();
  });

  it('submits valid payload in Create mode', async () => {
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
    expect(calledPayload.pack_dari).toBe(1);
    expect(calledPayload.pack_sampai).toBe(100);
    expect(calledPayload.nomor_batch).toBe('ORD-2026-001');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('pre-fills data and calls updateBonMasuk in Edit mode', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    bonMasukService.updateBonMasuk.mockResolvedValueOnce({ id: 99 });

    const initialData = {
      id: 99,
      no_segel: 'SGL-EXISTING-99',
      batch_id: 1,
      pack_dari: 1,
      pack_sampai: 50,
      shift_id: 1,
      kategori_penerimaan: 'PARSIAL',
      catatan: 'Catatan awal',
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

    // Ubah pack sampai ke 60
    const packSampaiInput = screen.getByLabelText(/Pack Sampai/i);
    fireEvent.change(packSampaiInput, { target: { value: '60' } });

    expect(screen.getByTestId('live-total-pack')).toHaveTextContent('60 Pack');
    expect(screen.getByTestId('live-total-bilyet')).toHaveTextContent('2.700.000 Bilyet');

    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bonMasukService.updateBonMasuk).toHaveBeenCalledWith(99, expect.objectContaining({
        no_segel: 'SGL-EXISTING-99',
        pack_dari: 1,
        pack_sampai: 60,
      }));
    });
  });
});
