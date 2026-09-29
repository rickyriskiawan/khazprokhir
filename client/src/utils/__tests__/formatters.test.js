import { describe, it, expect } from 'vitest';
import {
  formatRupiah,
  formatCompactRupiah,
  formatBilyet,
  formatDoos,
  formatIndonesianDate,
  formatPackRange,
  formatDoosRange,
} from '../formatters';

describe('formatters utility', () => {
  describe('formatRupiah', () => {
    it('formats numbers into Indonesian Rupiah format', () => {
      expect(formatRupiah(1000000)).toMatch(/Rp\s*1\.000\.000/);
      expect(formatRupiah('50000')).toMatch(/Rp\s*50\.000/);
      expect(formatRupiah(0)).toMatch(/Rp\s*0/);
    });

    it('handles null, undefined, or NaN gracefully', () => {
      expect(formatRupiah(null)).toBe('Rp 0');
      expect(formatRupiah(undefined)).toBe('Rp 0');
      expect(formatRupiah('invalid')).toBe('Rp 0');
    });
  });

  describe('formatCompactRupiah', () => {
    it('formats billions (Miliar) correctly', () => {
      expect(formatCompactRupiah(1450000000)).toBe('Rp 1,45 Miliar');
      expect(formatCompactRupiah(1000000000)).toBe('Rp 1 Miliar');
      expect(formatCompactRupiah('2500000000', true)).toBe('Rp 2,5 M');
    });

    it('formats millions (Juta) correctly', () => {
      expect(formatCompactRupiah(450000000)).toBe('Rp 450 Juta');
      expect(formatCompactRupiah(15000000)).toBe('Rp 15 Juta');
      expect(formatCompactRupiah('180000000', true)).toBe('Rp 180 Jt');
    });

    it('formats thousands (Ribu) correctly', () => {
      expect(formatCompactRupiah(500000)).toBe('Rp 500 Ribu');
      expect(formatCompactRupiah('25000', true)).toBe('Rp 25 Rb');
    });

    it('formats trillions (Triliun) correctly', () => {
      expect(formatCompactRupiah(2500000000000)).toBe('Rp 2,5 Triliun');
      expect(formatCompactRupiah(1000000000000, true)).toBe('Rp 1 T');
    });

    it('falls back to formatRupiah for values less than 1.000', () => {
      expect(formatCompactRupiah(500)).toMatch(/Rp\s*500/);
      expect(formatCompactRupiah(0)).toMatch(/Rp\s*0/);
      expect(formatCompactRupiah(null)).toBe('Rp 0');
    });
  });

  describe('formatBilyet', () => {
    it('formats sheets with thousands separator and suffix', () => {
      expect(formatBilyet(45000)).toBe('45.000 Bilyet');
      expect(formatBilyet('180000')).toBe('180.000 Bilyet');
      expect(formatBilyet(0)).toBe('0 Bilyet');
      expect(formatBilyet(1000)).toBe('1.000 Bilyet');
      expect(formatBilyet(1000, 'Bilyet')).toBe('1.000 Bilyet');
    });
  });

  describe('formatDoos', () => {
    it('pads doos number to 4 digits', () => {
      expect(formatDoos(1)).toBe('0001');
      expect(formatDoos(18)).toBe('0018');
      expect(formatDoos('345')).toBe('0345');
      expect(formatDoos(null)).toBe('0000');
    });
  });

  describe('formatIndonesianDate', () => {
    it('formats standard date string', () => {
      const formatted = formatIndonesianDate('2026-09-15T00:00:00.000Z');
      expect(formatted).toContain('15');
      expect(formatted).toContain('September');
      expect(formatted).toContain('2026');
    });

    it('returns "-" for falsy dates', () => {
      expect(formatIndonesianDate(null)).toBe('-');
      expect(formatIndonesianDate('')).toBe('-');
    });
  });

  describe('formatPackRange & formatDoosRange', () => {
    it('formats pack range', () => {
      expect(formatPackRange(1, 4)).toBe('Pack 01 - 04');
      expect(formatPackRange(5, 5)).toBe('Pack 05');
      expect(formatPackRange(null, null)).toBe('-');
    });

    it('formats doos range', () => {
      expect(formatDoosRange(1, 9)).toBe('Doos 0001 - 0009');
      expect(formatDoosRange(10, 10)).toBe('Doos 0010');
      expect(formatDoosRange(null, null)).toBe('-');
    });
  });
});

