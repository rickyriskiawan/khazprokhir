import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getBonMasukList,
  getBonMasukById,
  createBonMasuk,
  updateBonMasuk,
  deleteBonMasuk,
  getTodayBonMasukSummary,
  getBatches,
  createBatch,
  getMasterDenominasi,
  getMasterEmisi,
  getMasterShift,
} from '../bonMasukService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('bonMasukService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBonMasukList', () => {
    it('calls GET /bon-masuk with provided query params', async () => {
      const mockData = { data: [{ id: 1, no_segel: 'SGL-001' }], meta: { total: 1 } };
      api.get.mockResolvedValueOnce({ data: mockData });

      const res = await getBonMasukList({ page: 1, limit: 10, search: 'SGL' });

      expect(api.get).toHaveBeenCalledWith('/bon-masuk', {
        params: { page: 1, limit: 10, search: 'SGL' },
      });
      expect(res).toEqual(mockData);
    });
  });

  describe('getBonMasukById', () => {
    it('calls GET /bon-masuk/:id and returns data', async () => {
      const mockDetail = { id: 10, no_segel: 'SGL-010' };
      api.get.mockResolvedValueOnce({ data: { data: mockDetail } });

      const res = await getBonMasukById(10);

      expect(api.get).toHaveBeenCalledWith('/bon-masuk/10');
      expect(res).toEqual(mockDetail);
    });
  });

  describe('createBonMasuk', () => {
    it('calls POST /bon-masuk with payload', async () => {
      const payload = { no_segel: 'SGL-NEW', pack_dari: 1, pack_sampai: 100 };
      const created = { id: 100, ...payload };
      api.post.mockResolvedValueOnce({ data: { data: created } });

      const res = await createBonMasuk(payload);

      expect(api.post).toHaveBeenCalledWith('/bon-masuk', payload);
      expect(res).toEqual(created);
    });
  });

  describe('updateBonMasuk', () => {
    it('calls PUT /bon-masuk/:id with payload', async () => {
      const payload = { pack_dari: 1, pack_sampai: 60 };
      const updated = { id: 5, ...payload };
      api.put.mockResolvedValueOnce({ data: { data: updated } });

      const res = await updateBonMasuk(5, payload);

      expect(api.put).toHaveBeenCalledWith('/bon-masuk/5', payload);
      expect(res).toEqual(updated);
    });
  });

  describe('deleteBonMasuk', () => {
    it('calls DELETE /bon-masuk/:id', async () => {
      api.delete.mockResolvedValueOnce({ data: { success: true } });

      const res = await deleteBonMasuk(5);

      expect(api.delete).toHaveBeenCalledWith('/bon-masuk/5');
      expect(res).toEqual({ success: true });
    });
  });

  describe('getTodayBonMasukSummary', () => {
    it('calls GET /bon-masuk/summary/today with optional date', async () => {
      const mockSummary = { total_bon: 3, total_pack: 150 };
      api.get.mockResolvedValueOnce({ data: { data: mockSummary } });

      const res = await getTodayBonMasukSummary('2026-09-29');

      expect(api.get).toHaveBeenCalledWith('/bon-masuk/summary/today', {
        params: { tanggal: '2026-09-29' },
      });
      expect(res).toEqual(mockSummary);
    });
  });

  describe('getBatches & createBatch', () => {
    it('fetches batches from GET /batches', async () => {
      const batches = [{ id: 1, nomor_batch: 'BATCH-001' }];
      api.get.mockResolvedValueOnce({ data: { data: batches } });

      const res = await getBatches({ status: 'in_progress' });

      expect(api.get).toHaveBeenCalledWith('/batches', { params: { status: 'in_progress' } });
      expect(res).toEqual(batches);
    });

    it('creates a new batch with POST /batches', async () => {
      const payload = { nomor_batch: 'B-002', tahun_anggaran: 2026, seri: 'AA', kepala: '0', emisi_id: 1 };
      api.post.mockResolvedValueOnce({ data: { data: { id: 2, ...payload } } });

      const res = await createBatch(payload);

      expect(api.post).toHaveBeenCalledWith('/batches', payload);
      expect(res).toEqual({ id: 2, ...payload });
    });
  });

  describe('Master data endpoints', () => {
    it('fetches denominasi, emisi, and shift master lists', async () => {
      api.get
        .mockResolvedValueOnce({ data: { data: [{ id: 1, nama: 'Rp 100.000' }] } })
        .mockResolvedValueOnce({ data: { data: [{ id: 1, kode_emisi: 'TE 2022' }] } })
        .mockResolvedValueOnce({ data: { data: [{ id: 1, nama_shift: 'Shift 1' }] } });

      const denoms = await getMasterDenominasi();
      const emisi = await getMasterEmisi();
      const shifts = await getMasterShift();

      expect(api.get).toHaveBeenCalledWith('/master/denominasi');
      expect(api.get).toHaveBeenCalledWith('/master/emisi');
      expect(api.get).toHaveBeenCalledWith('/master/shift');
      expect(denoms).toHaveLength(1);
      expect(emisi).toHaveLength(1);
      expect(shifts).toHaveLength(1);
    });
  });
});
