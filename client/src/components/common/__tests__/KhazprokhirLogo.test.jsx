import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KhazprokhirLogo } from '../KhazprokhirLogo'

describe('KhazprokhirLogo component', () => {
  it('renders full logo with text by default', () => {
    const { container } = render(<KhazprokhirLogo />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('KHAZPROKHIR')).toBeInTheDocument()
  })

  it('renders icon only mode without text', () => {
    const { container } = render(<KhazprokhirLogo iconOnly />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('KHAZPROKHIR')).not.toBeInTheDocument()
  })
})

