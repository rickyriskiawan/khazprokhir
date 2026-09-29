import { describe, it, expect } from 'vitest';
import { parsePackRange, formatPackNumbers } from '../packParser.js';

describe('client packParser utils', () => {
  it('parses valid multi-range pack strings', () => {
    const res = parsePackRange('1-10, 13, 16, 20, 22');
    expect(res.isValid).toBe(true);
    expect(res.totalPack).toBe(14);
    expect(res.packDari).toBe(1);
    expect(res.packSampai).toBe(22);
    expect(res.jumlahBilyet).toBe(14 * 45000);
    expect(res.canonicalList).toBe('1-10, 13, 16, 20, 22');
  });

  it('handles invalid inputs gracefully by returning error message', () => {
    expect(parsePackRange('').isValid).toBe(false);
    expect(parsePackRange('   ').isValid).toBe(false);
    expect(parsePackRange('0-10').error).toContain('1 sampai 100');
    expect(parsePackRange('10-5').error).toContain('tidak valid');
    expect(parsePackRange('1-5, 3').error).toContain('duplikat');
    expect(parsePackRange('abc').error).toContain('tidak valid');
  });

  it('formats array of numbers back to concise range string', () => {
    expect(formatPackNumbers([1, 2, 3, 5, 8, 9, 10])).toBe('1-3, 5, 8-10');
    expect(formatPackNumbers([])).toBe('');
  });
});

