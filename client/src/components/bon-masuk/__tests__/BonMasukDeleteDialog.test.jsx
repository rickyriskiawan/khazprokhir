import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BonMasukDeleteDialog from '../BonMasukDeleteDialog';
import * as bonMasukService from '@/services/bonMasukService';

vi.mock('@/services/bonMasukService', () => ({
  deleteBonMasuk: vi.fn(),
}));

const mockBonMasuk = {
  id: 15,
  no_segel: 'SGL-DELETE-ME',
  pack_dari: 1,
  pack_sampai: 50,
  batch: {
    nomor_batch: 'BATCH-DEL',
  },
};

describe('BonMasukDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation text with segel and pack details', () => {
    render(
      <BonMasukDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        bonMasuk={mockBonMasuk}
      />
    );

    expect(screen.getByText('Konfirmasi Pembatalan Bon Masuk')).toBeInTheDocument();
    expect(screen.getByText('SGL-DELETE-ME')).toBeInTheDocument();
    expect(screen.getByText(/BATCH-DEL/)).toBeInTheDocument();
    expect(screen.getByText(/Pack 1 s\/d 50 \(50 Pack\)/)).toBeInTheDocument();
  });

  it('calls deleteBonMasuk when confirmed', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    bonMasukService.deleteBonMasuk.mockResolvedValueOnce({ success: true });

    render(
      <BonMasukDeleteDialog
        open={true}
        onOpenChange={onOpenChange}
        bonMasuk={mockBonMasuk}
        onSuccess={onSuccess}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Ya, Batalkan Bon Masuk/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(bonMasukService.deleteBonMasuk).toHaveBeenCalledWith(15);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows error alert when deletion fails (e.g. pack already sorted)', async () => {
    bonMasukService.deleteBonMasuk.mockRejectedValueOnce({
      userMessage: 'Bon masuk tidak dapat dibatalkan karena beberapa pack telah diproses ke tahap sortir atau kemas.',
    });

    render(
      <BonMasukDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        bonMasuk={mockBonMasuk}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Ya, Batalkan Bon Masuk/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Bon masuk tidak dapat dibatalkan karena beberapa pack telah diproses ke tahap sortir/i)
      ).toBeInTheDocument();
    });
  });
});
