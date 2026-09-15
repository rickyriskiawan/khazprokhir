import { create } from 'zustand';

const THEME_STORAGE_KEY = 'khazprokhir_theme';

const applyThemeToDOM = (isDark) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const getSystemDarkPreference = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'dark'; // Default to elegant dark slate mode
};

export const useThemeStore = create((set, get) => {
  const initialTheme = getInitialTheme();

  return {
    theme: initialTheme,
    isDark: initialTheme === 'system' ? getSystemDarkPreference() : initialTheme === 'dark',

    setTheme: (newTheme) => {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      const isDark = newTheme === 'system' ? getSystemDarkPreference() : newTheme === 'dark';
      applyThemeToDOM(isDark);
      set({ theme: newTheme, isDark });
    },

    toggleTheme: () => {
      const { isDark } = get();
      const nextTheme = isDark ? 'light' : 'dark';
      get().setTheme(nextTheme);
    },

    initTheme: () => {
      const currentTheme = getInitialTheme();
      const isDark = currentTheme === 'system' ? getSystemDarkPreference() : currentTheme === 'dark';
      applyThemeToDOM(isDark);
      set({ theme: currentTheme, isDark });

      // Listen for system theme changes if set to 'system'
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
          if (get().theme === 'system') {
            applyThemeToDOM(e.matches);
            set({ isDark: e.matches });
          }
        };
        mediaQuery.addEventListener('change', handleChange);
      }
    },
  };
});
