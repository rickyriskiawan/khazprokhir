import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topbar from '../Topbar';
import { useAuthStore } from '../../../stores/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Topbar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user details, role badge, live clock and shift indicator', () => {
    useAuthStore.setState({
      user: { username: 'spv', full_name: 'Budi Santoso', role: 'SUPERVISOR' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar onToggleMobileSidebar={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('SUPERVISOR')).toBeInTheDocument();
    expect(screen.getByText(/WIB/)).toBeInTheDocument();
  });

  it('displays edit shift button for SUPERVISOR role', () => {
    useAuthStore.setState({
      user: { username: 'spv', full_name: 'Budi Santoso', role: 'SUPERVISOR' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar onToggleMobileSidebar={vi.fn()} />
      </MemoryRouter>
    );

    const editShiftBtn = screen.getByTitle('Kelola Jam Kerja Shift');
    expect(editShiftBtn).toBeInTheDocument();

    // Clicking edit shift opens the modal
    fireEvent.click(editShiftBtn);
    expect(screen.getByText('Pengaturan Jam Kerja Shift')).toBeInTheDocument();
  });

  it('hides edit shift button for OPERATOR role', () => {
    useAuthStore.setState({
      user: { username: 'op1', full_name: 'Operator Agus', role: 'OPERATOR' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar onToggleMobileSidebar={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByTitle('Kelola Jam Kerja Shift')).not.toBeInTheDocument();
  });

  it('opens logout confirmation modal when logout button is clicked', async () => {
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

    useAuthStore.setState({
      user: { username: 'op1', full_name: 'Operator Agus', role: 'OPERATOR' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar onToggleMobileSidebar={vi.fn()} />
      </MemoryRouter>
    );

    const logoutTrigger = screen.getByTitle('Keluar dari Sistem');
    fireEvent.click(logoutTrigger);

    // Modal dialog is shown
    expect(screen.getByText('Konfirmasi Keluar Sistem')).toBeInTheDocument();

    // Confirm logout
    const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Keluar/i });
    fireEvent.click(confirmBtn);

    expect(logoutSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
