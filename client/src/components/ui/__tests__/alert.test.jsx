import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

describe('Alert component', () => {
  it('renders default alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Perhatian</AlertTitle>
        <AlertDescription>Pesan notifikasi sistem operasional.</AlertDescription>
      </Alert>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Perhatian')).toBeInTheDocument()
    expect(screen.getByText('Pesan notifikasi sistem operasional.')).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Peringatan Bahaya</AlertTitle>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('border-rose-200')
  })
})
