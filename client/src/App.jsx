import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // Initialize Dual Theme on app load (adds .dark to <html> if dark mode)
    initTheme();
    // Verify stored JWT token if present
    checkAuth();
  }, [initTheme, checkAuth]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
