import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoutConfirmModal from '../LogoutConfirmModal';

describe('LogoutConfirmModal component', () => {
  it('renders confirmation text when open', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Konfirmasi Keluar Sistem')).toBeInTheDocument();
    expect(screen.getByText(/Apakah Anda yakin ingin mengakhiri sesi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /batal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /konfirmasi keluar/i })).toBeInTheDocument();
  });

  it('triggers onConfirm when confirm button clicked', () => {
    const onConfirmMock = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /konfirmasi keluar/i }));
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when cancel button clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <LogoutConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('Konfirmasi Keluar Sistem')).not.toBeInTheDocument();
  });
});

