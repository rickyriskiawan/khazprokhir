import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from '../skeleton'

describe('Skeleton component', () => {
  it('renders skeleton placeholder with pulse animation class', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    const el = container.firstChild

    expect(el).toHaveClass('animate-pulse')
    expect(el).toHaveClass('h-4')
    expect(el).toHaveClass('w-32')
  })
})

