import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('khazprokhir_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling & 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Terjadi kesalahan pada jaringan atau server.';

    error.userMessage = message;

    // Handle token expiry or unauthorized access
    if (error.response?.status === 401) {
      localStorage.removeItem('khazprokhir_token');
      localStorage.removeItem('khazprokhir_user');
      // Dispatch custom event so authStore or UI can react reactively
      window.dispatchEvent(new CustomEvent('khazprokhir:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default api;

