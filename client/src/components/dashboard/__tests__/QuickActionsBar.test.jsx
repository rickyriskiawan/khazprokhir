import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuickActionsBar from '../QuickActionsBar';
import { useAuthStore } from '@/stores/authStore';

describe('QuickActionsBar component', () => {
  it('renders operational input actions for OPERATOR and SUPERVISOR', () => {
    useAuthStore.setState({
      user: { role: 'OPERATOR', full_name: 'Operator 1' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <QuickActionsBar />
      </MemoryRouter>
    );

    expect(screen.getByText(/Input Bon Masuk/i)).toBeInTheDocument();
    expect(screen.getByText(/Sesi Sortir/i)).toBeInTheDocument();
    expect(screen.getByText(/Kemas Doos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cek Celah Register/i)).toBeInTheDocument();
  });

  it('renders inspection and audit actions for AUDITOR and MANAGEMENT', () => {
    useAuthStore.setState({
      user: { role: 'AUDITOR', full_name: 'Auditor 1' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <QuickActionsBar />
      </MemoryRouter>
    );

    expect(screen.getByText(/Buku Register Doos/i)).toBeInTheDocument();
    expect(screen.getByText(/Deteksi Celah/i)).toBeInTheDocument();
    expect(screen.getByText(/Log Audit Trail/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Produksi/i)).toBeInTheDocument();

    // Does NOT render operational creation buttons
    expect(screen.queryByText(/Input Bon Masuk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kemas Doos/i)).not.toBeInTheDocument();
  });
});
