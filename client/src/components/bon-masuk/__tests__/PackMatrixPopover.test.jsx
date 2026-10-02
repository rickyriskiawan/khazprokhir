import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PackMatrixPopover from '../PackMatrixPopover';

describe('PackMatrixPopover component', () => {
  const defaultProps = {
    batchLabel: 'ORD-001 (AA-BA0)',
    receivedPacks: [1, 2, 3, 4, 5],
    selectedPacks: [6, 7, 8],
    onTogglePack: vi.fn(),
    disabled: false,
  };

  it('renders trigger button as pure icon button with title and active state', () => {
    const { rerender } = render(<PackMatrixPopover {...defaultProps} selectedPacks={[]} />);

    const triggerBtn = screen.getByRole('button', { name: /buka visualisasi matriks 100 pack/i });
    expect(triggerBtn).toBeInTheDocument();
    expect(screen.queryByText(/matriks 100 pack/i)).not.toBeInTheDocument();

    // Inactive state (no selected packs)
    expect(triggerBtn).not.toHaveClass('border-emerald');

    // Active state (with selected packs)
    rerender(<PackMatrixPopover {...defaultProps} selectedPacks={[6, 7, 8]} />);
    const activeBtn = screen.getByRole('button', { name: /buka visualisasi matriks 100 pack/i });
    expect(activeBtn).toHaveClass('border-emerald');

    // Disabled state
    rerender(<PackMatrixPopover {...defaultProps} disabled={true} />);
    const disabledBtn = screen.getByRole('button', { name: /buka visualisasi matriks 100 pack/i });
    expect(disabledBtn).toBeDisabled();
  });

  it('opens dialog showing 100 pack buttons and identifies received vs selected packs', () => {
    render(<PackMatrixPopover {...defaultProps} />);

    const triggerBtn = screen.getByRole('button', { name: /buka visualisasi matriks 100 pack/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/matriks keterisian 100 pack/i)).toBeInTheDocument();

    // Pack 1 is received, should be disabled
    const pack1Btn = screen.getByTestId('pack-btn-1');
    expect(pack1Btn).toBeDisabled();

    // Pack 6 is selected, should be active
    const pack6Btn = screen.getByTestId('pack-btn-6');
    expect(pack6Btn).not.toBeDisabled();
    expect(pack6Btn).toHaveClass('bg-emerald');

    // Pack 20 is available, clicking it calls onTogglePack(20)
    const pack20Btn = screen.getByTestId('pack-btn-20');
    expect(pack20Btn).not.toBeDisabled();
    fireEvent.click(pack20Btn);
    expect(defaultProps.onTogglePack).toHaveBeenCalledWith(20);
  });
});
