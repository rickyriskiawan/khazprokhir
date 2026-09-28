import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from '../Breadcrumbs';

describe('Breadcrumbs component', () => {
  it('renders root Dashboard crumb when on /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Utama')).toBeInTheDocument();
  });

  it('renders mapped breadcrumb hierarchy on nested route', () => {
    render(
      <MemoryRouter initialEntries={['/bon-masuk']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Khazprokhir')).toBeInTheDocument();
    expect(screen.getByText('Bon Masuk Khazai')).toBeInTheDocument();
  });

  it('handles unknown segments gracefully by formatting slug into Title Case', () => {
    render(
      <MemoryRouter initialEntries={['/custom-test-path']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Custom Test Path')).toBeInTheDocument();
  });
});

