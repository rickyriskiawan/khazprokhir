import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';
import * as dashboardService from '@/services/dashboardService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/dashboardService');

describe('DashboardPage integration', () => {
  const mockOverviewData = {
    bonMasuk: {
      total_bon: 2,
      total_pack: 50,
      total_bilyet: '2250000',
      breakdown_per_denominasi: [],
    },
    sortir: {
      total_sesi: 3,
      total_pack: 50,
      total_brood: 2250,
      total_bilyet: '2250000',
      rincian_denominasi: [],
    },
    kemas: {
      total_kemas: 2,
      total_pack: 8,
      total_doos: 18,
      total_bilyet: '360000',
      output_selesai: {
        total_kemas: 2,
        total_pack: 8,
        total_doos: 18,
        total_bilyet: '360000',
      },
      antrian_wip: {
        total_kemas: 1,
        total_pack: 4,
        total_doos: 0,
        total_bilyet: '180000',
      },
      rincian_denominasi: [
        {
          denominasi: 'Y',
          nilai: 100000,
          total_pack: 8,
          total_doos: 18,
          total_bilyet: '360000',
        },
      ],
    },
    doosMonitoring: {
      total_nominal_rupiah: 'Rp 1.450.000.000',
      total_nominal_angka: '1450000000',
      siap_kirim: {
        total_doos: 18,
      },
      rincian_denominasi: [
        {
          nama: 'Y',
          nilai: 100000,
          total_doos: 18,
          total_pack: 8,
          total_nominal_rupiah: 'Rp 1.800.000.000',
        },
      ],
    },
    health: {
      status: 'connected',
      latencyMs: 15,
      database: 'connected',
    },
    shiftStats: {
      1: { shift_id: 1, nama: 'Shift 1', total_doos: 9, total_pack_sortir: 20, total_bilyet: '180000' },
      2: { shift_id: 2, nama: 'Shift 2', total_doos: 9, total_pack_sortir: 30, total_bilyet: '180000' },
      3: { shift_id: 3, nama: 'Shift 3', total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' },
    },
    lastUpdated: new Date('2026-09-29T10:00:00.000Z'),
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { role: 'SUPERVISOR', full_name: 'Supervisor Test' },
      isAuthenticated: true,
    });
  });

  it('renders all sections and loads live overview metrics', async () => {
    dashboardService.fetchDashboardOverview.mockResolvedValueOnce(mockOverviewData);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Initial loading or header present
    expect(screen.getByText('Monitoring Produksi Khazprokhir')).toBeInTheDocument();

    // Await async data rendering
    await waitFor(() => {
      expect(screen.getByText('Penerimaan Khazai')).toBeInTheDocument();
      expect(screen.getByText('Capaian per Shift Kerja')).toBeInTheDocument();
      expect(screen.getByText('Pintasan Aksi Cepat')).toBeInTheDocument();
      expect(screen.getAllByText(/18 Doos/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Rp 1,45 Miliar/)).toBeInTheDocument();
    });
  });

  it('handles manual refresh button click and re-fetches overview', async () => {
    dashboardService.fetchDashboardOverview.mockResolvedValue(mockOverviewData);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Penerimaan Khazai')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Segarkan/i });
    fireEvent.click(refreshBtn);

    expect(dashboardService.fetchDashboardOverview).toHaveBeenCalledTimes(2);
  });

  it('displays alert banner when backend health is disconnected or errors occur', async () => {
    dashboardService.fetchDashboardOverview.mockResolvedValueOnce({
      ...mockOverviewData,
      health: { status: 'disconnected', latencyMs: null },
      errors: [{ module: 'bon-masuk', error: 'Network Error' }],
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Server Terputus/i)).toBeInTheDocument();
    });
  });
});
