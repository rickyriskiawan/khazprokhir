import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SortirCancelDialog from '../SortirCancelDialog';
import * as sortirService from '@/services/sortirService';

vi.mock('@/services/sortirService', () => ({
  deleteSortir: vi.fn(),
}));

const mockSession = {
  id: 42,
  batch: {
    id: 10,
    nomor_batch: '1822001',
  },
  total_pack: 8,
  penyortir_1: 'Ahmad Dahlan',
};

describe('SortirCancelDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merender dialog konfirmasi pembatalan sesi dengan detail yang sesuai', () => {
    render(
      <SortirCancelDialog
        open={true}
        onOpenChange={vi.fn()}
        session={mockSession}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Batalkan Sesi Sortir #42?')).toBeInTheDocument();
    expect(screen.getAllByText('1822001').length).toBeGreaterThan(0);
    expect(screen.getByText('Ya, Batalkan Sesi')).toBeInTheDocument();
  });

  it('memanggil deleteSortir dan onSuccess saat tombol konfirmasi diklik', async () => {
    const handleSuccess = vi.fn();
    const handleOpenChange = vi.fn();
    sortirService.deleteSortir.mockResolvedValue({ success: true });

    render(
      <SortirCancelDialog
        open={true}
        onOpenChange={handleOpenChange}
        session={mockSession}
        onSuccess={handleSuccess}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Ya, Batalkan Sesi/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(sortirService.deleteSortir).toHaveBeenCalledWith(42);
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('tidak merender apapun saat session bernilai null', () => {
    const { container } = render(
      <SortirCancelDialog
        open={true}
        onOpenChange={vi.fn()}
        session={null}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
