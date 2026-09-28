import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductionKPICards from '../ProductionKPICards';

describe('ProductionKPICards component', () => {
  const mockOverview = {
    bonMasuk: {
      total_bon: 2,
      total_pack: 50,
      total_bilyet: '2250000',
    },
    sortir: {
      total_sesi: 3,
      total_pack: 50,
      total_brood: 2250,
      total_bilyet: '2250000',
    },
    kemas: {
      total_doos: 18,
      output_selesai: {
        total_doos: 18,
        total_pack: 8,
        total_bilyet: '360000',
      },
      antrian_wip: {
        total_doos: 0,
        total_pack: 4,
        total_bilyet: '180000',
      },
    },
    doosMonitoring: {
      total_nominal_rupiah: 'Rp 1.450.000.000',
      total_nominal_angka: '1450000000',
      siap_kirim: {
        total_doos: 18,
      },
    },
  };

  it('renders all 4 production KPI cards with accurate formatted figures', () => {
    render(<ProductionKPICards overview={mockOverview} loading={false} />);

    // Card 1: Penerimaan Bon Masuk
    expect(screen.getByText('Penerimaan Khazai')).toBeInTheDocument();
    expect(screen.getAllByText(/2\.250\.000 Lembar/).length).toBe(2);
    expect(screen.getAllByText(/50 Pack/).length).toBe(2);

    // Card 2: Hasil Sortir
    expect(screen.getByText('Hasil Sortir')).toBeInTheDocument();
    expect(screen.getByText('Zero Reject')).toBeInTheDocument();

    // Card 3: Hasil Kemas with Selesai vs WIP Antrian
    expect(screen.getByText('Realisasi Kemas')).toBeInTheDocument();
    expect(screen.getByText('18 Doos')).toBeInTheDocument();
    expect(screen.getByText(/4 Pack WIP/i)).toBeInTheDocument();

    // Card 4: Persediaan Doos & Nilai Rupiah
    expect(screen.getByText('Nilai Siap Kirim')).toBeInTheDocument();
    expect(screen.getByText(/Rp 1,45 Miliar/i)).toBeInTheDocument();
  });

  it('renders loading skeleton states when loading is true', () => {
    const { container } = render(<ProductionKPICards overview={null} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
