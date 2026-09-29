import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../tooltip'

describe('Tooltip component', () => {
  it('renders trigger element inside provider', () => {
    render(
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger asChild>
            <button>Bantuan</button>
          </TooltipTrigger>
          <TooltipContent>Keterangan Bantuan</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    expect(screen.getByRole('button', { name: /bantuan/i })).toBeInTheDocument()
    expect(screen.getByText('Keterangan Bantuan')).toBeInTheDocument()
  })
})

