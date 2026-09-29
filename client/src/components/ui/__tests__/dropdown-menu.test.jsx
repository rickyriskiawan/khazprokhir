import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../dropdown-menu'

describe('DropdownMenu component', () => {
  it('renders trigger correctly and content when open', () => {
    render(
      <DropdownMenu open={true}>
        <DropdownMenuTrigger>Buka Aksi</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Pilihan Modul</DropdownMenuLabel>
          <DropdownMenuItem>Modul Sortir</DropdownMenuItem>
          <DropdownMenuItem>Modul Kemas</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    expect(screen.getByText('Buka Aksi')).toBeInTheDocument()
    expect(screen.getByText('Pilihan Modul')).toBeInTheDocument()
    expect(screen.getByText('Modul Sortir')).toBeInTheDocument()
    expect(screen.getByText('Modul Kemas')).toBeInTheDocument()
  })
})

