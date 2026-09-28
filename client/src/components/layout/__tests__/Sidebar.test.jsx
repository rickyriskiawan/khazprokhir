import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';

describe('Sidebar component', () => {
  beforeEach(() => {
    useUIStore.setState({ isSidebarExpanded: true });
  });

  it('renders all sections and menus for SUPERVISOR role', () => {
    useAuthStore.setState({
      user: { username: 'spv', role: 'SUPERVISOR', full_name: 'Supervisor Test' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Utama')).toBeInTheDocument();
    expect(screen.getByText('Bon Masuk Khazai')).toBeInTheDocument();
    expect(screen.getByText('Proses Sortir Pack')).toBeInTheDocument();
    expect(screen.getByText('Pengemasan Doos')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Doos')).toBeInTheDocument();
    expect(screen.getByText('Target Produksi')).toBeInTheDocument();
    expect(screen.getByText('Master Data')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('hides Perencanaan & Master sections for OPERATOR role', () => {
    useAuthStore.setState({
      user: { username: 'op1', role: 'OPERATOR', full_name: 'Operator Test' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Operator can see operational items
    expect(screen.getByText('Dashboard Utama')).toBeInTheDocument();
    expect(screen.getByText('Bon Masuk Khazai')).toBeInTheDocument();
    expect(screen.getByText('Proses Sortir Pack')).toBeInTheDocument();
    expect(screen.getByText('Pengemasan Doos')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Doos')).toBeInTheDocument();

    // Operator cannot see Perencanaan & Master
    expect(screen.queryByText('Target Produksi')).not.toBeInTheDocument();
    expect(screen.queryByText('Master Data')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Trail')).not.toBeInTheDocument();
  });

  it('hides operational entry (Bon Masuk, Sortir, Kemas) for AUDITOR and displays Read-Only badge on Monitoring Doos', () => {
    useAuthStore.setState({
      user: { username: 'auditor1', role: 'AUDITOR', full_name: 'Auditor Test' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Utama')).toBeInTheDocument();
    expect(screen.queryByText('Bon Masuk Khazai')).not.toBeInTheDocument();
    expect(screen.queryByText('Proses Sortir Pack')).not.toBeInTheDocument();
    expect(screen.queryByText('Pengemasan Doos')).not.toBeInTheDocument();

    // Auditor sees monitoring with Read-Only badge
    expect(screen.getByText('Monitoring Doos')).toBeInTheDocument();
    expect(screen.getByText('Read-Only')).toBeInTheDocument();

    // Auditor sees audit trail and target
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Target Produksi')).toBeInTheDocument();
  });

  it('hides operational entry for MANAGEMENT role', () => {
    useAuthStore.setState({
      user: { username: 'mgmt', role: 'MANAGEMENT', full_name: 'Management Test' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Utama')).toBeInTheDocument();
    expect(screen.queryByText('Bon Masuk Khazai')).not.toBeInTheDocument();
    expect(screen.queryByText('Master Data')).not.toBeInTheDocument();
    expect(screen.getByText('Target Produksi')).toBeInTheDocument();
  });

  it('renders vector logo with text on expanded and icon-only on collapsed', () => {
    useAuthStore.setState({
      user: { username: 'spv', role: 'SUPERVISOR', full_name: 'Supervisor Test' },
      isAuthenticated: true,
    });

    // 1. Expanded mode
    useUIStore.setState({ isSidebarExpanded: true });
    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Shows KHAZPROKHIR SVG text
    expect(screen.getByText('KHAZPROKHIR')).toBeInTheDocument();
    // Does not render separate HTML subtitle
    expect(screen.queryByText('Monitoring Produksi')).not.toBeInTheDocument();

    // 2. Collapsed mode
    useUIStore.setState({ isSidebarExpanded: false });
    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // In collapsed mode, iconOnly is passed, so KHAZPROKHIR text is not rendered
    expect(screen.queryByText('KHAZPROKHIR')).not.toBeInTheDocument();
  });
});

