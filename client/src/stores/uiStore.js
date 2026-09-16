import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isSidebarExpanded: typeof window !== 'undefined' ? localStorage.getItem('khazprokhir_sidebar_expanded') === 'true' : false,
  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarExpanded;
      localStorage.setItem('khazprokhir_sidebar_expanded', String(next));
      return { isSidebarExpanded: next };
    }),
  setSidebarExpanded: (val) => {
    localStorage.setItem('khazprokhir_sidebar_expanded', String(val));
    set({ isSidebarExpanded: val });
  },
}));
