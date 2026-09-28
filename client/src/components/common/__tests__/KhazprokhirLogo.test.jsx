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

  it('applies dark theme variant styling correctly', () => {
    render(<KhazprokhirLogo themeVariant="dark" />)
    const brandText = screen.getByText('KHAZPROKHIR')
    expect(brandText).toHaveClass('text-white')
  })

  it('renders hero size preset without error', () => {
    const { container } = render(<KhazprokhirLogo size="hero" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('max-w-[420px]')
  })

  it('generates unique linearGradient IDs across multiple instances to prevent hidden element collision', () => {
    const { container } = render(
      <div>
        <KhazprokhirLogo />
        <KhazprokhirLogo />
      </div>
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(2)

    const linearGradients = container.querySelectorAll('linearGradient')
    const ids = Array.from(linearGradients).map((el) => el.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})

