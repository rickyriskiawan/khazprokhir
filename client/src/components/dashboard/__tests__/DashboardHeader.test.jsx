import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardHeader from '../DashboardHeader';

describe('DashboardHeader component', () => {
  it('renders title, Indonesian date, server health indicator, and refresh button', () => {
    const onRefreshMock = vi.fn();
    const mockDate = new Date('2026-09-29T10:00:00.000Z');

    render(
      <DashboardHeader
        health={{ status: 'connected', latencyMs: 28 }}
        lastUpdated={mockDate}
        onRefresh={onRefreshMock}
        isRefreshing={false}
      />
    );

    expect(screen.getByText('Monitoring Produksi Khazprokhir')).toBeInTheDocument();
    expect(screen.getByText(/Terhubung \(28ms\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Segarkan/i)).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /Segarkan/i });
    fireEvent.click(refreshBtn);
    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('displays disconnected state when server is unreachable', () => {
    render(
      <DashboardHeader
        health={{ status: 'disconnected', latencyMs: null }}
        lastUpdated={new Date()}
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    );

    expect(screen.getByText(/Server Terputus/i)).toBeInTheDocument();
  });
});

