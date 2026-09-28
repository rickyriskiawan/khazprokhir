import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  fetchDashboardOverview,
  getTodayBonMasuk,
  getTodaySortir,
  getTodayKemas,
  getMonitoringDoosSummary,
  getSystemHealth,
} from '../dashboardService';

vi.mock('../api');

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('individual endpoint helpers', () => {
    it('calls bon-masuk summary endpoint', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { total_bon: 2 } } });
      const result = await getTodayBonMasuk('2026-09-29');
      expect(api.get).toHaveBeenCalledWith('/bon-masuk/summary/today', {
        params: { tanggal: '2026-09-29' },
      });
      expect(result).toEqual({ total_bon: 2 });
    });

    it('calls sortir summary endpoint', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { total_pack: 20 } } });
      const result = await getTodaySortir();
      expect(api.get).toHaveBeenCalledWith('/sortir/summary/today', {
        params: {},
      });
      expect(result).toEqual({ total_pack: 20 });
    });

    it('calls kemas summary endpoint', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            output_selesai: { total_doos: 18 },
            antrian_wip: { total_pack: 4 },
          },
        },
      });
      const result = await getTodayKemas();
      expect(api.get).toHaveBeenCalledWith('/kemas/summary/today', {
        params: {},
      });
      expect(result.output_selesai.total_doos).toBe(18);
    });

    it('calls monitoring doos summary endpoint', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            total_nominal_rupiah: 'Rp 1.450.000.000',
            siap_kirim: { total_doos: 18 },
          },
        },
      });
      const result = await getMonitoringDoosSummary();
      expect(api.get).toHaveBeenCalledWith('/monitoring-doos/summary');
      expect(result.siap_kirim.total_doos).toBe(18);
    });

    it('calls health endpoint', async () => {
      api.get.mockResolvedValueOnce({ data: { status: 'ok', database: 'connected' } });
      const result = await getSystemHealth();
      expect(api.get).toHaveBeenCalledWith('/health');
      expect(result.database).toBe('connected');
    });
  });

  describe('fetchDashboardOverview', () => {
    it('aggregates all responses into a unified dashboard data structure', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/bon-masuk/summary/today')) {
          return Promise.resolve({ data: { data: { total_bon: 1, total_pack: 10, total_bilyet: '450000' } } });
        }
        if (url.includes('/sortir/summary/today')) {
          return Promise.resolve({ data: { data: { total_pack: 10, total_brood: 450, total_bilyet: '450000' } } });
        }
        if (url.includes('/kemas/summary/today')) {
          return Promise.resolve({
            data: {
              data: {
                total_doos: 18,
                output_selesai: { total_doos: 18, total_pack: 8, total_bilyet: '360000' },
                antrian_wip: { total_doos: 0, total_pack: 2, total_bilyet: '90000' },
              },
            },
          });
        }
        if (url.includes('/monitoring-doos/summary')) {
          return Promise.resolve({
            data: {
              data: {
                total_nominal_rupiah: 'Rp 1.800.000.000',
                total_nominal_angka: '1800000000',
                siap_kirim: { total_doos: 18 },
                antrian_wip: { total_pack: 2 },
              },
            },
          });
        }
        if (url.includes('/health')) {
          return Promise.resolve({ data: { status: 'ok', database: 'connected' } });
        }
        if (url === '/kemas') {
          return Promise.resolve({
            data: {
              data: [
                { shift_id: 1, total_doos: 9, total_pack: 4, total_bilyet: '180000' },
                { shift_id: 2, total_doos: 9, total_pack: 4, total_bilyet: '180000' },
              ],
            },
          });
        }
        if (url === '/sortir') {
          return Promise.resolve({
            data: {
              data: [
                { shift_id: 1, total_pack: 4, total_bilyet: '180000' },
                { shift_id: 2, total_pack: 6, total_bilyet: '270000' },
              ],
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const overview = await fetchDashboardOverview();

      expect(overview.bonMasuk.total_bon).toBe(1);
      expect(overview.sortir.total_pack).toBe(10);
      expect(overview.kemas.output_selesai.total_doos).toBe(18);
      expect(overview.doosMonitoring.total_nominal_rupiah).toBe('Rp 1.800.000.000');
      expect(overview.health.status).toBe('connected');
      expect(overview.shiftStats[1].total_doos).toBe(9);
      expect(overview.shiftStats[2].total_doos).toBe(9);
      expect(overview.shiftStats[3].total_doos).toBe(0);
      expect(overview.lastUpdated).toBeInstanceOf(Date);
    });

    it('survives individual endpoint failures without throwing', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/bon-masuk/summary/today')) {
          return Promise.reject(new Error('Network Error'));
        }
        if (url.includes('/health')) {
          return Promise.resolve({ data: { status: 'ok', database: 'connected' } });
        }
        return Promise.resolve({ data: { data: {} } });
      });

      const overview = await fetchDashboardOverview();

      expect(overview.bonMasuk).toBeNull();
      expect(overview.errors.length).toBeGreaterThan(0);
      expect(overview.health.status).toBe('connected');
    });
  });
});
