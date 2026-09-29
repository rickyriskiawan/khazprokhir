import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShiftEditModal from '../ShiftEditModal';

vi.mock('../../../stores/shiftStore', () => ({
  useShiftStore: () => ({
    shifts: [
      { id: 1, nama: 'Shift 1', jam_mulai: '07:00', jam_selesai: '15:00', is_active: true },
      { id: 2, nama: 'Shift 2', jam_mulai: '15:00', jam_selesai: '23:00', is_active: true },
      { id: 3, nama: 'Shift 3', jam_mulai: '23:00', jam_selesai: '07:00', is_active: false },
    ],
    updateShift: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  }),
}));

describe('ShiftEditModal component', () => {
  it('renders shift configuration form when open', () => {
    render(<ShiftEditModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Pengaturan Jam Kerja Shift')).toBeInTheDocument();
    expect(screen.getByText('Shift 1')).toBeInTheDocument();
    expect(screen.getByText('Shift 2')).toBeInTheDocument();
    expect(screen.getByText('Shift 3')).toBeInTheDocument();
    expect(screen.getByText('Non-Aktif')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ShiftEditModal isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Pengaturan Jam Kerja Shift')).not.toBeInTheDocument();
  });
});
