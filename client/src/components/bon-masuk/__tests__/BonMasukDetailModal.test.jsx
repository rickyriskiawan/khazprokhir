import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BonMasukDetailModal from '../BonMasukDetailModal';

const mockBonMasuk = {
  id: 42,
  no_segel: 'SGL-TEST-42',
  tanggal_masuk: '2026-09-15T00:00:00.000Z',
  jam_masuk: '09:30',
  pack_dari: 1,
  pack_sampai: 40,
  jumlah_bilyet: 1800000n,
  kategori_penerimaan: 'MASINAL',
  jenis_mesin_sortir: 'BPS-01',
  catatan: 'Segel utuh dan rapi',
  batch: {
    nomor_batch: 'ORD-2026-042',
    seri: 'BB-CC',
    kepala: '1',
    tahun_anggaran: 2026,
    emisi: {
      kode_emisi: 'TE 2022',
      denominasi: { nama: 'Rp 50.000' },
    },
  },
  shift: {
    nama_shift: 'Shift 1',
    jam_mulai: '07:00',
    jam_selesai: '15:00',
  },
  operator: {
    full_name: 'Budi Santoso',
    username: 'operator',
  },
};

describe('BonMasukDetailModal', () => {
  it('renders official transfer metadata and legacy fallback correctly', () => {
    render(
      <BonMasukDetailModal open={true} onOpenChange={vi.fn()} bonMasuk={mockBonMasuk} />
    );

    expect(screen.getByText('Detail Penerimaan Bon Masuk')).toBeInTheDocument();
    expect(screen.getByText('ID #42')).toBeInTheDocument();
    expect(screen.getByText('SGL-TEST-42')).toBeInTheDocument();
    expect(screen.getByText(/ORD-2026-042/)).toBeInTheDocument();
    expect(screen.getByText(/Rp 50\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText(/09:30 WIB/)).toBeInTheDocument();
    expect(screen.getByText(/Segel utuh dan rapi/)).toBeInTheDocument();
    expect(screen.getByText(/Rentang: Pack 1 s\/d 40/)).toBeInTheDocument();
  });

  it('renders multi-batch items with progress bar and pack list', () => {
    const multiBatchBon = {
      ...mockBonMasuk,
      total_pack: 40,
      items: [
        {
          id: 101,
          batch_id: 1,
          nomor_pack_list: '1-10, 13, 16, 20-40',
          total_pack: 33,
          jumlah_bilyet: 1485000n,
          batch: mockBonMasuk.batch,
        },
      ],
    };

    render(
      <BonMasukDetailModal open={true} onOpenChange={vi.fn()} bonMasuk={multiBatchBon} />
    );

    expect(screen.getByText(/1-10, 13, 16, 20-40/)).toBeInTheDocument();
    expect(screen.getByText('33 / 100 Pack (33%)')).toBeInTheDocument();
    expect(screen.getByText('33 Pack')).toBeInTheDocument();
    expect(screen.getByText(/1\.485\.000 Bilyet/)).toBeInTheDocument();
  });

  it('triggers onOpenChange when Tutup button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <BonMasukDetailModal open={true} onOpenChange={onOpenChange} bonMasuk={mockBonMasuk} />
    );

    const closeBtn = screen.getByRole('button', { name: /Tutup/i });
    fireEvent.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

