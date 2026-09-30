import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BatchCombobox, { parseBatchSearchQuery } from '../BatchCombobox.jsx';

describe('BatchCombobox & parseBatchSearchQuery', () => {
  describe('parseBatchSearchQuery helper', () => {
    it('ekstrak digit terakhir sebagai kepala dan huruf sebelumnya sebagai seri', () => {
      expect(parseBatchSearchQuery('AA-BA0')).toEqual({
        seri: 'AA-BA',
        kepala: '0',
        raw: 'AA-BA0',
      });
      expect(parseBatchSearchQuery('AA-BA 1')).toEqual({
        seri: 'AA-BA',
        kepala: '1',
        raw: 'AA-BA 1',
      });
      expect(parseBatchSearchQuery('XY9')).toEqual({
        seri: 'XY',
        kepala: '9',
        raw: 'XY9',
      });
    });

    it('memberikan default kepala 0 jika hanya ada huruf', () => {
      expect(parseBatchSearchQuery('AA-BA')).toEqual({
        seri: 'AA-BA',
        kepala: '0',
        raw: 'AA-BA',
      });
    });
  });

  describe('BatchCombobox component', () => {
    const sampleBatches = [
      {
        id: 1,
        nomor_batch: 'ORD-101',
        seri: 'AA-BA',
        kepala: '0',
        tahun_anggaran: 2026,
        emisi: { denominasi: { nilai: 100000 } },
      },
      {
        id: 2,
        nomor_batch: 'ORD-102',
        seri: 'BB-CC',
        kepala: '1',
        tahun_anggaran: 2026,
        emisi: { denominasi: { nilai: 50000 } },
      },
    ];

    it('merender input pencarian dan memfilter berdasarkan nomor batch atau seri+kepala', () => {
      const handleSelect = vi.fn();
      render(
        <BatchCombobox
          batches={sampleBatches}
          selectedBatch={null}
          onSelectBatch={handleSelect}
        />
      );

      const input = screen.getByPlaceholderText(/Cari Batch/i);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'AA-BA0' } });

      expect(screen.getByText('ORD-101')).toBeInTheDocument();
      expect(screen.queryByText('ORD-102')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('ORD-101'));
      expect(handleSelect).toHaveBeenCalledWith(sampleBatches[0]);
    });

    it('menampilkan opsi registrasi batch baru jika batch tidak ditemukan', () => {
      const handleRequestNew = vi.fn();
      render(
        <BatchCombobox
          batches={sampleBatches}
          selectedBatch={null}
          onSelectBatch={vi.fn()}
          onRequestNewBatch={handleRequestNew}
        />
      );

      const input = screen.getByPlaceholderText(/Cari Batch/i);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'ZZ-YY5' } });

      const newBatchBtn = screen.getByRole('button', { name: /\+ Registrasi Batch Baru/i });
      expect(newBatchBtn).toBeInTheDocument();

      fireEvent.click(newBatchBtn);
      expect(handleRequestNew).toHaveBeenCalledWith({
        seri: 'ZZ-YY',
        kepala: '5',
        raw: 'ZZ-YY5',
      });
    });
  });
});

