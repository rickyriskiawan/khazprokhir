import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHIFTS,
  timeToMinutes,
  isTimeInShift,
  getCurrentShiftInfo,
  formatLiveClock,
  getShiftBadgeStyle,
} from '../shiftUtils';

describe('shiftUtils', () => {
  describe('timeToMinutes', () => {
    it('converts HH:mm format to minutes from midnight', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('07:30')).toBe(450);
      expect(timeToMinutes('15:30')).toBe(930);
      expect(timeToMinutes('16:00')).toBe(960);
      expect(timeToMinutes('23:30')).toBe(1410);
    });
  });

  describe('isTimeInShift', () => {
    it('handles normal shift within the same day', () => {
      // Shift 1: 07:30 - 16:00
      expect(isTimeInShift('07:30', '07:30', '16:00')).toBe(true);
      expect(isTimeInShift('12:00', '07:30', '16:00')).toBe(true);
      expect(isTimeInShift('16:00', '07:30', '16:00')).toBe(true);
      expect(isTimeInShift('07:00', '07:30', '16:00')).toBe(false);
      expect(isTimeInShift('16:01', '07:30', '16:00')).toBe(false);
    });

    it('handles overnight shift spanning past midnight', () => {
      // Shift 3: 23:00 - 07:00
      expect(isTimeInShift('23:00', '23:00', '07:00')).toBe(true);
      expect(isTimeInShift('23:45', '23:00', '07:00')).toBe(true);
      expect(isTimeInShift('02:30', '23:00', '07:00')).toBe(true);
      expect(isTimeInShift('07:00', '23:00', '07:00')).toBe(true);
      expect(isTimeInShift('22:59', '23:00', '07:00')).toBe(false);
      expect(isTimeInShift('07:01', '23:00', '07:00')).toBe(false);
    });
  });

  describe('getCurrentShiftInfo', () => {
    it('identifies Shift 1 accurately during standard day hours', () => {
      const info = getCurrentShiftInfo('10:00', DEFAULT_SHIFTS);
      expect(info.activeShift?.nama).toBe('Shift 1');
      expect(info.isHandover).toBe(false);
      expect(info.label).toBe('Shift 1 (07:30 - 16:00)');
    });

    it('detects handover period between Shift 1 and Shift 2 (15:30 - 16:00)', () => {
      const info = getCurrentShiftInfo('15:45', DEFAULT_SHIFTS);
      expect(info.isHandover).toBe(true);
      expect(info.activeShifts.length).toBe(2);
      expect(info.label).toContain('Peralihan Shift 1 & 2');
    });

    it('identifies Shift 2 after 16:00 up to 23:30', () => {
      const info = getCurrentShiftInfo('20:00', DEFAULT_SHIFTS);
      expect(info.activeShift?.nama).toBe('Shift 2');
      expect(info.isHandover).toBe(false);
      expect(info.label).toBe('Shift 2 (15:30 - 23:30)');
    });

    it('returns off-duty when time is past 23:30 and Shift 3 is inactive', () => {
      const info = getCurrentShiftInfo('01:00', DEFAULT_SHIFTS);
      expect(info.activeShift).toBeNull();
      expect(info.label).toBe('Di Luar Jam Operasional');
    });

    it('identifies Shift 3 if Shift 3 is activated by supervisor', () => {
      const shiftsWithShift3Active = DEFAULT_SHIFTS.map((s) =>
        s.nama === 'Shift 3' ? { ...s, is_active: true } : s
      );
      const info = getCurrentShiftInfo('01:00', shiftsWithShift3Active);
      expect(info.activeShift?.nama).toBe('Shift 3');
      expect(info.isHandover).toBe(false);
      expect(info.label).toBe('Shift 3 (23:00 - 07:00)');
    });
  });

  describe('formatLiveClock', () => {
    it('formats date to HH:mm:ss WIB', () => {
      const testDate = new Date('2026-09-28T14:30:15');
      const formatted = formatLiveClock(testDate);
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}\sWIB/);
    });
  });

  describe('getShiftBadgeStyle', () => {
    it('returns respective color class names for shifts and handover', () => {
      expect(getShiftBadgeStyle('Shift 1')).toContain('emerald');
      expect(getShiftBadgeStyle('Shift 2')).toContain('indigo');
      expect(getShiftBadgeStyle('Shift 3')).toContain('purple');
      expect(getShiftBadgeStyle(null, true)).toContain('amber');
    });
  });
});

