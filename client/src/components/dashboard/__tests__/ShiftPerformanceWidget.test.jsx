import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShiftPerformanceWidget from '../ShiftPerformanceWidget';

describe('ShiftPerformanceWidget component', () => {
  const mockShiftStats = {
    1: {
      shift_id: 1,
      nama: 'Shift 1',
      total_doos: 9,
      total_pack_sortir: 20,
      total_bilyet: '900000',
    },
    2: {
      shift_id: 2,
      nama: 'Shift 2',
      total_doos: 9,
      total_pack_sortir: 30,
      total_bilyet: '900000',
    },
    3: {
      shift_id: 3,
      nama: 'Shift 3',
      total_doos: 0,
      total_pack_sortir: 0,
      total_bilyet: '0',
    },
  };

  it('renders shift performance breakdown for all 3 shifts', () => {
    render(<ShiftPerformanceWidget shiftStats={mockShiftStats} loading={false} />);

    expect(screen.getByText('Capaian per Shift Kerja')).toBeInTheDocument();
    expect(screen.getByText('Shift 1')).toBeInTheDocument();
    expect(screen.getByText('Shift 2')).toBeInTheDocument();
    expect(screen.getByText('Shift 3')).toBeInTheDocument();

    // Verify stats for Shift 1 & 2
    expect(screen.getAllByText(/9 Doos/i).length).toBe(2);
    expect(screen.getByText(/20 Pack/i)).toBeInTheDocument();
    expect(screen.getByText(/30 Pack/i)).toBeInTheDocument();

    // Verify Shift 3 has standby / cadangan indicator
    expect(screen.getByText(/Cadangan/i)).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<ShiftPerformanceWidget shiftStats={null} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});

