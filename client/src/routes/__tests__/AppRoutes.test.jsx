import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../AppRoutes'
import { useAuthStore } from '@/stores/authStore'

// Mock heavy sub-components
vi.mock('@/pages/dashboard/DashboardPage', () => ({
  default: () => <div>Mocked Dashboard Page</div>,
}))
vi.mock('@/pages/auth/LoginPage', () => ({
  default: () => <div>Mocked Login Page</div>,
}))

describe('AppRoutes router configuration', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('redirects unauthenticated user accessing / to /login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Mocked Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Mocked Dashboard Page')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated user accessing /dashboard to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Mocked Login Page')).toBeInTheDocument()
  })

  it('allows authenticated user to view /dashboard', () => {
    useAuthStore.setState({
      token: 'mock-token',
      user: { id: 1, username: 'operator1', role: 'OPERATOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Mocked Dashboard Page')).toBeInTheDocument()
  })

  it('renders unauthorized page when visiting /unauthorized', () => {
    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Otoritas Tidak Mencukupi/i)).toBeInTheDocument()
  })

  it('renders 404 not found page for invalid route', () => {
    render(
      <MemoryRouter initialEntries={['/halaman-tidak-ada-123']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Halaman Tidak Ditemukan/i)).toBeInTheDocument()
  })
})

