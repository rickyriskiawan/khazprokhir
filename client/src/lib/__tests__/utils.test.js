import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
  it('merges multiple class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('handles conditional class names', () => {
    const isActive = true
    const isHidden = false
    expect(cn('base', isActive && 'is-active', isHidden && 'is-hidden')).toBe('base is-active')
  })

  it('resolves conflicting tailwind classes with precedence to the latter', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })
})
