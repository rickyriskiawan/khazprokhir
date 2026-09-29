import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../dialog'

describe('Dialog component', () => {
  it('renders title and description when open', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Test Title</DialogTitle>
            <DialogDescription>Dialog Test Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Dialog Test Title')).toBeInTheDocument()
    expect(screen.getByText('Dialog Test Description')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hidden Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument()
  })
})

