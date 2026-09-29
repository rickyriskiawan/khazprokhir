import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'

describe('Tabs component', () => {
  it('renders tab triggers and active content correctly', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab Pertama</TabsTrigger>
          <TabsTrigger value="tab2">Tab Kedua</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Konten Tab Pertama</TabsContent>
        <TabsContent value="tab2">Konten Tab Kedua</TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Tab Pertama')).toBeInTheDocument()
    expect(screen.getByText('Konten Tab Pertama')).toBeInTheDocument()
    expect(screen.queryByText('Konten Tab Kedua')).not.toBeInTheDocument()
  })
})
