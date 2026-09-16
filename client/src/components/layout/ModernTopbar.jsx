import React from 'react';
import { Search, FileText, Bell, ChevronDown, PanelLeft } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export default function ModernTopbar({ onSearch }) {
  const { user } = useAuthStore();
  const { isSidebarExpanded, toggleSidebar } = useUIStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const displayName = user?.nama_lengkap || user?.username || 'Operator Khazprokhir';
  const roleTitle = user?.role ? `Seksi Khazprokhir • ${user.role}` : 'Seksi Khazanah Produk Akhir';

  return (
    <header className="w-full flex items-center justify-between py-4 px-6 md:px-8 bg-transparent transition-colors duration-200">
      {/* Left: Sidebar Toggle Button + Greeting */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarExpanded ? "Ciutkan Sidebar Menu" : "Perluas Sidebar Menu (Tampilkan Teks)"}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#6b7280] hover:text-[#0f1115] dark:text-[#9ca3af] dark:hover:text-white transition-all cursor-pointer shrink-0"
        >
          <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>

        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#11141a] dark:text-white">
            {getGreeting()}, {displayName.split(' ')[0]}!
          </h1>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-0.5 font-medium">
            {roleTitle}
          </p>
        </div>
      </div>

      {/* Center: Search Bar (Hidden on small screens) */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <input
            type="text"
            onChange={(e) => onSearch && onSearch(e.target.value)}
            placeholder="Cari nomor batch, bon masuk, doos..."
            className="w-full pl-5 pr-11 py-2.5 rounded-full text-xs bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] text-[#11141a] dark:text-[#f9fafb] placeholder-[#9ca3af] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#0f1115]/10 dark:focus:ring-white/10 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#9ca3af]">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Quick Report Icon Pill */}
        <button
          type="button"
          title="Dokumen & Rekap"
          className="w-10 h-10 rounded-full bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#6b7280] dark:text-[#9ca3af] hover:text-[#11141a] dark:hover:text-white transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Notification Bell Pill */}
        <button
          type="button"
          title="Notifikasi Sistem"
          className="relative w-10 h-10 rounded-full bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#6b7280] dark:text-[#9ca3af] hover:text-[#11141a] dark:hover:text-white transition-all cursor-pointer"
        >
          <Bell className="w-4 h-4" strokeWidth={1.75} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#12151c]" />
        </button>

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-2 pl-2 cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-[#e8ebf1] dark:bg-[#1a1f29] border border-white dark:border-[#1e2430] shadow-sm flex items-center justify-center overflow-hidden text-xs font-bold text-[#11141a] dark:text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#11141a] dark:group-hover:text-white transition-colors" />
        </div>
      </div>
    </header>
  );
}
