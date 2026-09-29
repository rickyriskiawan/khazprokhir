import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'

describe('Select component', () => {
  it('renders trigger and default value correctly', () => {
    render(
      <Select defaultValue="shift-1">
        <SelectTrigger>
          <SelectValue placeholder="Pilih Shift" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shift-1">Shift 1 (Pagi)</SelectItem>
          <SelectItem value="shift-2">Shift 2 (Siang)</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('Shift 1 (Pagi)')
  })
})

