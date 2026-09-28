import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

describe('DashboardLayout component', () => {
  beforeEach(() => {
    useUIStore.setState({ isSidebarExpanded: true });
    useAuthStore.setState({
      user: { username: 'spv', full_name: 'Supervisor Test', role: 'SUPERVISOR' },
      isAuthenticated: true,
    });
  });

  it('renders topbar, sidebar, and child route outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Konten Dashboard Test</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Sidebar branding is present
    expect(screen.getAllByText('KHAZPROKHIR')[0]).toBeInTheDocument();
    // Topbar breadcrumb and sidebar link are present
    expect(screen.getAllByText('Dashboard Utama').length).toBeGreaterThanOrEqual(1);
    // Outlet content is rendered
    expect(screen.getByText('Konten Dashboard Test')).toBeInTheDocument();
  });

  it('toggles mobile sidebar drawer when mobile menu button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Konten Mobile Test</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByLabelText('Buka menu navigasi');
    fireEvent.click(hamburgerBtn);

    // Mobile drawer backdrop or close button is visible
    expect(screen.getByLabelText('Tutup menu navigasi')).toBeInTheDocument();

    // Clicking close button hides mobile drawer
    fireEvent.click(screen.getByLabelText('Tutup menu navigasi'));
    expect(screen.queryByLabelText('Tutup menu navigasi')).not.toBeInTheDocument();
  });
});
