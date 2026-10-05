import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getKemasList,
  getKemasById,
  getSesiSiapKemas,
  getKemasSummary,
  createKemas,
  updateKemas,
  completeKemas,
  deleteKemas,
  getNextDoosNumber,
  calculateDoosFromPack,
} from '../kemasService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('kemasService (FE-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getKemasList mengirim filter dan mengembalikan data + meta', async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { total: 1 } } });

    const res = await getKemasList({ page: 1, limit: 15, search: '1822001', tanggal_dari: '2026-10-01' });

    expect(api.get).toHaveBeenCalledWith('/kemas', {
      params: { page: 1, limit: 15, search: '1822001', tanggal_dari: '2026-10-01' },
    });
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.meta.total).toBe(1);
  });

  it('getSesiSiapKemas mengambil daftar sesi sortir yang siap dikemas', async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 100, total_pack: 4 }], meta: { total: 1 } } });

    const res = await getSesiSiapKemas({ limit: 100 });

    expect(api.get).toHaveBeenCalledWith('/kemas/sesi-siap-kemas', { params: { limit: 100 } });
    expect(res.data[0].id).toBe(100);
  });

  it('getKemasSummary mengembalikan ringkasan siap kemas & hasil kemas', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          siap_kemas: { total_kemas: 1, total_pack: 4, total_doos: 9, total_bilyet: '180000' },
          hasil_kemas: { total_kemas: 2, total_pack: 12, total_doos: 27, total_bilyet: '540000' },
        },
      },
    });

    const res = await getKemasSummary({ shift_id: 1 });

    expect(api.get).toHaveBeenCalledWith('/kemas/summary', { params: { shift_id: 1 } });
    expect(res.siap_kemas.total_doos).toBe(9);
    expect(res.hasil_kemas.total_doos).toBe(27);
  });

  it('createKemas mengirim payload berbasis sesi sortir', async () => {
    api.post.mockResolvedValue({ data: { data: { id: 9 } } });

    const payload = {
      proses_sortir_id: 100,
      shift_id: 1,
      tanggal_kemas: '2026-10-04',
      no_doos_awal: 1,
      no_doos_akhir: 9,
    };
    const res = await createKemas(payload);

    expect(api.post).toHaveBeenCalledWith('/kemas', payload);
    expect(res.id).toBe(9);
  });

  it('getKemasById, updateKemas, completeKemas, dan deleteKemas menembak endpoint yang benar', async () => {
    api.get.mockResolvedValue({ data: { data: { id: 5 } } });
    api.put.mockResolvedValue({ data: { data: { id: 5, catatan: 'x' } } });
    api.post.mockResolvedValue({ data: { data: { id: 5, status: 'READY' } } });
    api.delete.mockResolvedValue({ data: { success: true } });

    await getKemasById(5);
    expect(api.get).toHaveBeenCalledWith('/kemas/5');

    await updateKemas(5, { catatan: 'x' });
    expect(api.put).toHaveBeenCalledWith('/kemas/5', { catatan: 'x' });

    await completeKemas(5, { shift_id: 2 });
    expect(api.post).toHaveBeenCalledWith('/kemas/5/complete', { shift_id: 2 });

    await deleteKemas(5);
    expect(api.delete).toHaveBeenCalledWith('/kemas/5');
  });

  it('getNextDoosNumber mengirim parameter batch', async () => {
    api.get.mockResolvedValue({ data: { data: { next_no_doos_awal: 19 } } });

    const res = await getNextDoosNumber({ batch_id: 123 });

    expect(api.get).toHaveBeenCalledWith('/kemas/next-doos-number', { params: { batch_id: 123 } });
    expect(res.next_no_doos_awal).toBe(19);
  });

  it('calculateDoosFromPack mengikuti rasio 4 Pack = 9 Doos dan menolak non-kelipatan', () => {
    expect(calculateDoosFromPack(4)).toBe(9);
    expect(calculateDoosFromPack(8)).toBe(18);
    expect(calculateDoosFromPack(12)).toBe(27);
    expect(calculateDoosFromPack(5)).toBe(0);
    expect(calculateDoosFromPack(0)).toBe(0);
  });
});
