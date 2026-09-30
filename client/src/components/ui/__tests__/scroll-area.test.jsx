import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScrollArea } from '../scroll-area';

describe('ScrollArea component', () => {
  it('renders children within viewport', () => {
    render(
      <ScrollArea className="h-40 w-40" data-testid="scroll-area">
        <p>Konten yang dapat digulir</p>
      </ScrollArea>
    );

    expect(screen.getByText('Konten yang dapat digulir')).toBeInTheDocument();
  });
});
