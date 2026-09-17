import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button'

describe('Button component', () => {
  it('renders correctly with default variant and size', () => {
    render(<Button>Click Me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button.className).toContain('inline-flex')
  })

  it('applies variant classes', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button', { name: /outline/i })
    expect(button.className).toContain('border')
  })

  it('supports disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:opacity-50')
  })
})

