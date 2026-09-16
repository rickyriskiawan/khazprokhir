import React from 'react';
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
import { useUIStore } from '../../stores/uiStore';

export default function SlimSidebar({ activeTab = 'dashboard', onTabChange }) {
  const { logout } = useAuthStore();
  const { isSidebarExpanded, toggleSidebar } = useUIStore();

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
        isSidebarExpanded ? 'w-64' : 'w-20'
      } relative hidden md:flex flex-col justify-between py-6 bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-40`}
    >
      {/* 🌟 Floating Pill Toggle Button on the Right Border (Linear / Notion Style) */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={isSidebarExpanded ? "Ciutkan Menu Sidebar" : "Perluas Menu Sidebar (Tampilkan Teks)"}
        className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-md flex items-center justify-center text-ink-secondary hover:text-pitch dark:hover:text-white transition-all duration-200 hover:scale-110 z-50 cursor-pointer"
      >
        {isSidebarExpanded ? (
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        ) : (
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        )}
      </button>

      {/* 1. Header: Brand Logo & Title */}
      <div className={`flex items-center px-4 w-full ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer group" 
          onClick={toggleSidebar}
          title={isSidebarExpanded ? "Klik untuk ciutkan" : "Klik untuk perluas"}
        >
          <div className="w-11 h-11 rounded-full bg-pitch dark:bg-white text-white dark:text-pitch flex items-center justify-center font-bold text-sm shadow-md shrink-0 tracking-tighter group-hover:scale-105 transition-transform">
            KP
          </div>
          {isSidebarExpanded && (
            <div className="flex flex-col overflow-hidden transition-opacity duration-300">
              <span className="text-sm font-bold tracking-tight text-ink dark:text-white truncate">
                KHAZPROKHIR
              </span>
              <span className="text-[10px] text-ink-secondary dark:text-ink-secondary-dark truncate">
                Monitoring Produksi
              </span>
            </div>
          )}
        </div>
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
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-pitch dark:bg-white" />
              )}

              <button
                type="button"
                onClick={() => onTabChange && onTabChange(item.id)}
                title={!isSidebarExpanded ? item.label : undefined}
                className={`w-full flex items-center rounded-2xl transition-all duration-200 cursor-pointer ${
                  isSidebarExpanded ? 'px-3 py-2.5 gap-3.5' : 'justify-center h-11'
                } ${
                  isActive
                    ? 'text-pitch dark:text-white bg-canvas dark:bg-surface-subtle-dark shadow-sm font-semibold'
                    : 'text-ink-secondary dark:text-ink-secondary-dark hover:text-pitch dark:hover:text-white hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                {isSidebarExpanded && (
                  <span className="text-xs tracking-tight whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Actions: Expand Toggle Button & Logout */}
      <div className="flex flex-col gap-2 w-full px-3 pt-4 border-t border-border dark:border-border-dark">
        {/* Full button at bottom */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarExpanded ? "Ciutkan Sidebar" : "Perluas Sidebar"}
          className={`w-full flex items-center rounded-2xl text-ink-secondary dark:text-ink-secondary-dark hover:text-pitch dark:hover:text-white hover:bg-canvas dark:hover:bg-surface-subtle-dark transition-colors cursor-pointer ${
            isSidebarExpanded ? 'px-3 py-2.5 gap-3.5' : 'justify-center h-11'
          }`}
        >
          {isSidebarExpanded ? (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <span className="text-xs font-semibold tracking-tight whitespace-nowrap truncate">
                Ciutkan Menu
              </span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          )}
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          title="Keluar / Logout"
          className={`w-full flex items-center rounded-2xl text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ${
            isSidebarExpanded ? 'px-3 py-2.5 gap-3.5' : 'justify-center h-11'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          {isSidebarExpanded && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap truncate">
              Keluar dari Sistem
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
