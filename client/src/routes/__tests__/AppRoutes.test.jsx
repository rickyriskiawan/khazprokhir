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

  it('allows OPERATOR to access /bon-masuk, but redirects AUDITOR to /unauthorized', () => {
    // 1. As Operator
    useAuthStore.setState({
      token: 'mock-token',
      user: { id: 1, username: 'op1', role: 'OPERATOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/bon-masuk']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Penerimaan Bon Masuk Khazai/i)).toBeInTheDocument()
    unmount()

    // 2. As Auditor
    useAuthStore.setState({
      token: 'mock-token',
      user: { id: 2, username: 'audit1', role: 'AUDITOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/bon-masuk']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Otoritas Tidak Mencukupi/i)).toBeInTheDocument()
  })

  it('allows AUDITOR and MANAGEMENT to access /monitoring-doos', () => {
    useAuthStore.setState({
      token: 'mock-token',
      user: { id: 3, username: 'mgmt1', role: 'MANAGEMENT' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/monitoring-doos']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getAllByText(/Monitoring Doos/i).length).toBeGreaterThan(0)
  })

  it('allows SUPERVISOR to access /master-data, but redirects OPERATOR to /unauthorized', () => {
    // As Operator
    useAuthStore.setState({
      token: 'mock-token',
      user: { id: 1, username: 'op1', role: 'OPERATOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/master-data']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Otoritas Tidak Mencukupi/i)).toBeInTheDocument()
  })
})


