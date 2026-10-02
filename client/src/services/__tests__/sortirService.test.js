import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  formatPackRanges,
  formatCompactPackRanges,
  getSortirList,
  getSortirById,
  createSortir,
  updateSortir,
  deleteSortir,
  getAvailablePacks,
  getTodaySortirSummary,
} from '../sortirService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('sortirService - formatPackRanges', () => {
  it('mengembalikan string kosong jika input kosong atau null', () => {
    expect(formatPackRanges([])).toBe('-');
    expect(formatPackRanges(null)).toBe('-');
    expect(formatPackRanges('')).toBe('-');
  });

  it('memformat nomor pack tunggal dengan padding 2 digit', () => {
    expect(formatPackRanges([1])).toBe('Pack 01');
    expect(formatPackRanges([25])).toBe('Pack 25');
  });

  it('memformat satu rentang kontigu', () => {
    expect(formatPackRanges([1, 2, 3, 4])).toBe('Pack 01–04');
    expect(formatPackRanges([5, 6, 7, 8, 9, 10, 11, 12])).toBe('Pack 05–12');
  });

  it('memformat beberapa rentang non-kontigu', () => {
    expect(formatPackRanges([1, 2, 3, 4, 13, 14, 15, 16])).toBe('Pack 01–04, 13–16');
    expect(formatPackRanges([1, 2, 3, 4, 13, 14, 15, 16, 17, 18, 19, 20])).toBe('Pack 01–04, 13–20');
  });

  it('menerima string koma dan mengurutkan secara otomatis', () => {
    expect(formatPackRanges('4,3,2,1,16,15,14,13')).toBe('Pack 01–04, 13–16');
  });
});

describe('sortirService - formatCompactPackRanges', () => {
  it('memberikan output ringkas jika jumlah rentang melebihi maxRangesToShow', () => {
    // 3 rentang: 1-4, 13-16, 25-28
    const packs = [1, 2, 3, 4, 13, 14, 15, 16, 25, 26, 27, 28];
    const result = formatCompactPackRanges(packs, 2);

    expect(result.totalPacks).toBe(12);
    expect(result.display).toBe('Pack 01–04, 13–16');
    expect(result.full).toBe('Pack 01–04, 13–16, 25–28');
    expect(result.remainingGroups).toBe(1);
    expect(result.isTruncated).toBe(true);
  });

  it('tidak menandai truncated jika jumlah rentang <= maxRangesToShow', () => {
    const packs = [1, 2, 3, 4, 13, 14, 15, 16];
    const result = formatCompactPackRanges(packs, 2);

    expect(result.totalPacks).toBe(8);
    expect(result.display).toBe('Pack 01–04, 13–16');
    expect(result.full).toBe('Pack 01–04, 13–16');
    expect(result.remainingGroups).toBe(0);
    expect(result.isTruncated).toBe(false);
  });
});

describe('sortirService - API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSortirList memanggil GET /sortir dengan query parameter', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ id: 1 }], meta: { total: 1 } } });
    const result = await getSortirList({ batch_id: 10, shift_id: 2 });

    expect(api.get).toHaveBeenCalledWith('/sortir', { params: { batch_id: 10, shift_id: 2 } });
    expect(result.data).toHaveLength(1);
  });

  it('createSortir memanggil POST /sortir dengan payload data sesi', async () => {
    const payload = {
      batch_id: 5,
      shift_id: 1,
      tanggal_sortir: '2026-09-15',
      selected_packs: [1, 2, 3, 4],
      penyortir_1: 'Ahmad',
    };
    api.post.mockResolvedValueOnce({ data: { data: { id: 100, ...payload, status: 'COMPLETED' } } });

    const result = await createSortir(payload);
    expect(api.post).toHaveBeenCalledWith('/sortir', payload);
    expect(result.status).toBe('COMPLETED');
  });

  it('deleteSortir memanggil DELETE /sortir/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });
    const result = await deleteSortir(100);

    expect(api.delete).toHaveBeenCalledWith('/sortir/100');
    expect(result.success).toBe(true);
  });

  it('getAvailablePacks memanggil GET /sortir/available-packs/:batchId', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { total_available: 32 } } });
    const result = await getAvailablePacks(5);

    expect(api.get).toHaveBeenCalledWith('/sortir/available-packs/5');
    expect(result.total_available).toBe(32);
  });

  it('getTodaySortirSummary memanggil GET /sortir/summary/today', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { total_pack_today: 40 } } });
    const result = await getTodaySortirSummary('2026-09-15');

    expect(api.get).toHaveBeenCalledWith('/sortir/summary/today', { params: { tanggal: '2026-09-15' } });
    expect(result.total_pack_today).toBe(40);
  });
});
