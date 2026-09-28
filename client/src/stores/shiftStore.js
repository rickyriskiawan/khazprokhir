import { create } from 'zustand';
import api from '../services/api';
import { DEFAULT_SHIFTS } from '../utils/shiftUtils';

export const useShiftStore = create((set, get) => ({
  shifts: DEFAULT_SHIFTS,
  isLoading: false,
  error: null,

  fetchShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/master/shift');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        set({ shifts: data, isLoading: false });
        return data;
      }
      set({ isLoading: false });
      return get().shifts;
    } catch (err) {
      // Fallback silently to DEFAULT_SHIFTS jika API belum siap
      set({ error: err.userMessage || err.message, isLoading: false });
      return get().shifts;
    }
  },

  updateShift: async (id, updatedData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put(`/master/shift/${id}`, updatedData);
      const updated = res.data?.data || res.data;

      set((state) => ({
        shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...updated } : s)),
        isLoading: false,
      }));

      return { success: true, data: updated };
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || err.message;
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },
}));

