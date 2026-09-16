import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Layers, 
  CheckSquare2, 
  Package, 
  Compass, 
  Target, 
  Settings, 
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function SlimSidebar({ activeTab = 'dashboard', onTabChange }) {
  const { logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('khazprokhir_sidebar_expanded') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('khazprokhir_sidebar_expanded', String(next));
      return next;
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutGrid },
    { id: 'bon-masuk', label: 'Bon Masuk Khazai', icon: Layers },
    { id: 'sortir', label: 'Proses Sortir Pack', icon: CheckSquare2 },
    { id: 'kemas', label: 'Pengemasan Doos', icon: Package },
    { id: 'monitoring', label: 'Buku Register Doos', icon: Compass },
    { id: 'master', label: 'Master & Target', icon: Target },
    { id: 'help', label: 'Pusat Bantuan', icon: HelpCircle },
    { id: 'settings', label: 'Pengaturan Sistem', icon: Settings },
  ];

  return (
    <aside 
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } hidden md:flex flex-col justify-between py-6 bg-white dark:bg-[#12151c] border-r border-[#e8ebf1] dark:border-[#1e2430] shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-40`}
    >
      {/* 1. Header: Brand Logo & Expand Toggle */}
      <div className={`flex items-center px-4 w-full ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={toggleSidebar}>
          <div className="w-11 h-11 rounded-full bg-[#0f1115] dark:bg-white text-white dark:text-[#0f1115] flex items-center justify-center font-bold text-sm shadow-md shrink-0 tracking-tighter">
            KP
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden transition-opacity duration-300">
              <span className="text-sm font-bold tracking-tight text-[#11141a] dark:text-white truncate">
                KHAZPROKHIR
              </span>
              <span className="text-[10px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                Monitoring Produksi
              </span>
            </div>
          )}
        </div>

        {/* Toggle Button when Expanded */}
        {isExpanded && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Ciutkan Menu"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ca3af] hover:text-[#0f1115] dark:hover:text-white hover:bg-[#f1f3f7] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Navigation Items List */}
      <nav className="flex flex-col gap-2 w-full my-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative w-full">
              {/* Active Indicator Bar on Left Edge */}
              {isActive && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#0f1115] dark:bg-white" />
              )}

              <button
                type="button"
                onClick={() => onTabChange && onTabChange(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center rounded-2xl transition-all duration-200 cursor-pointer ${
                  isExpanded ? 'px-3 py-2.5 gap-3.5' : 'justify-center h-11'
                } ${
                  isActive
                    ? 'text-[#0f1115] dark:text-white bg-[#f1f3f7] dark:bg-[#1a1f29] shadow-sm font-semibold'
                    : 'text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0f1115] dark:hover:text-white hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29]/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                {isExpanded && (
                  <span className="text-xs tracking-tight whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Actions: Expand Toggle (when collapsed) & Logout */}
      <div className="flex flex-col gap-2 w-full px-3 pt-4 border-t border-[#e8ebf1] dark:border-[#1e2430]">
        {/* Toggle button when Collapsed */}
        {!isExpanded && (
          <div className="flex justify-center w-full">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Perluas Menu Sidebar"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#9ca3af] hover:text-[#0f1115] dark:hover:text-white hover:bg-[#f1f3f7] dark:hover:bg-[#1a1f29] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          title="Keluar / Logout"
          className={`w-full flex items-center rounded-2xl text-[#9ca3af] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ${
            isExpanded ? 'px-3 py-2.5 gap-3.5' : 'justify-center h-11'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          {isExpanded && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap truncate">
              Keluar dari Sistem
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
