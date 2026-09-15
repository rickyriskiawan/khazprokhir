import { create } from 'zustand';
import api from '../services/api';

const getInitialToken = () => localStorage.getItem('khazprokhir_token') || null;
const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('khazprokhir_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set, get) => {
  // Listen for unauthorized 401 events from Axios interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('khazprokhir:unauthorized', () => {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });
  }

  const initialToken = getInitialToken();
  const initialUser = getInitialUser();

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialToken,
    isLoading: !!initialToken, // true if we need to verify stored token

    setAuth: (token, user) => {
      localStorage.setItem('khazprokhir_token', token);
      localStorage.setItem('khazprokhir_user', JSON.stringify(user));
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    logout: () => {
      localStorage.removeItem('khazprokhir_token');
      localStorage.removeItem('khazprokhir_user');
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    checkAuth: async () => {
      const { token } = get();
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      set({ isLoading: true });
      try {
        const res = await api.get('/auth/me');
        const userData = res.data?.data?.user || res.data?.data || res.data?.user;
        if (userData) {
          localStorage.setItem('khazprokhir_user', JSON.stringify(userData));
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          get().logout();
        }
      } catch (err) {
        // If /auth/me fails (invalid or expired token)
        console.warn('Authentication token check failed:', err.userMessage || err.message);
        get().logout();
      }
    },
  };
});
