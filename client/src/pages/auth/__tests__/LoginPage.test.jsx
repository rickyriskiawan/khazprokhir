import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../LoginPage'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
    post: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { from: { pathname: '/dashboard' } } }),
  }
})

describe('LoginPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('renders split screen elements including logo, form inputs, and brand text', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // Brand elements
    expect(screen.getAllByText(/KHAZPROKHIR/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Seksi Khazanah Produk Akhir/i)).toBeInTheDocument()

    // Form inputs
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^masuk$/i })).toBeInTheDocument()
  })

  it('toggles password visibility when clicking eye button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /tampilkan password/i })
    fireEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('fills credentials when clicking a quick-role button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const supervisorBtn = screen.getByRole('button', { name: /supervisor/i })
    fireEvent.click(supervisorBtn)

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/^password$/i)

    expect(usernameInput).toHaveValue('supervisor')
    expect(passwordInput).toHaveValue('password123')
  })

  it('submits login request and redirects on success', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'supervisor', role: 'SUPERVISOR', nama_lengkap: 'Budi SPV' },
        },
      },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'supervisor' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'supervisor',
        password: 'password123',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('displays error banner when login fails', async () => {
    api.post.mockRejectedValueOnce({
      userMessage: 'Username atau password salah',
      response: { data: { message: 'Username atau password salah' } },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Username atau password salah/i)).toBeInTheDocument()
    })
  })
})
