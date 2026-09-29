import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../table'

describe('Table component', () => {
  it('renders table elements correctly with semantic structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pecahan</TableHead>
            <TableHead>Total Doos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Rp 100.000</TableCell>
            <TableCell>18 Doos</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('Pecahan')).toBeInTheDocument()
    expect(screen.getByText('Total Doos')).toBeInTheDocument()
    expect(screen.getByText('Rp 100.000')).toBeInTheDocument()
    expect(screen.getByText('18 Doos')).toBeInTheDocument()
  })
})
