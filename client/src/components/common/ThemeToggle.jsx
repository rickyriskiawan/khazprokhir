import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      aria-label="Toggle Dark/Light Theme"
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 
        bg-white hover:bg-[#f8f9fb] text-[#6b7280] border border-[#e8ebf1] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]
        dark:bg-[#12151c] dark:hover:bg-[#1a1f29] dark:text-[#9ca3af] dark:border-[#1e2430]
        focus:outline-none focus:ring-2 focus:ring-[#0f1115]/10 dark:focus:ring-white/10 cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4 text-[#0f1115] transition-transform duration-300 -rotate-12 hover:rotate-0" strokeWidth={1.75} />
      )}
    </button>
  );
}

