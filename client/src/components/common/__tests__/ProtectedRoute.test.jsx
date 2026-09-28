import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('redirects unauthenticated user to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument()
  })

  it('allows access to authenticated user when no specific roles required', () => {
    useAuthStore.setState({
      token: 'valid-token',
      user: { id: 1, username: 'operator1', role: 'OPERATOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument()
  })

  it('redirects to /unauthorized when user role is not allowed', () => {
    useAuthStore.setState({
      token: 'valid-token',
      user: { id: 1, username: 'operator1', role: 'OPERATOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Denied 403</div>} />
          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR']} />}>
            <Route path="/admin/users" element={<div>User Management</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Access Denied 403')).toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
  })

  it('allows access when user has one of the allowed roles', () => {
    useAuthStore.setState({
      token: 'valid-token',
      user: { id: 2, username: 'spv1', role: 'SUPERVISOR' },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Denied 403</div>} />
          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGEMENT']} />}>
            <Route path="/admin/users" element={<div>User Management</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('User Management')).toBeInTheDocument()
  })
})

