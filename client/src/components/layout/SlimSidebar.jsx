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
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function SlimSidebar({ activeTab = 'dashboard', onTabChange }) {
  const { logout } = useAuthStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'bon-masuk', label: 'Bon Masuk', icon: Layers },
    { id: 'sortir', label: 'Sortir Pack', icon: CheckSquare2 },
    { id: 'kemas', label: 'Pengemasan Doos', icon: Package },
    { id: 'monitoring', label: 'Buku Register Doos', icon: Compass },
    { id: 'master', label: 'Master & Target', icon: Target },
    { id: 'help', label: 'Bantuan', icon: HelpCircle },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="w-20 hidden md:flex flex-col items-center justify-between py-6 bg-white dark:bg-[#12151c] border-r border-[#e8ebf1] dark:border-[#1e2430] shrink-0 sticky top-0 h-screen transition-colors duration-200 z-40">
      {/* Brand Logo Circle */}
      <div className="flex flex-col items-center">
        <div className="w-11 h-11 rounded-full bg-[#0f1115] dark:bg-white text-white dark:text-[#0f1115] flex items-center justify-center font-bold text-sm shadow-md cursor-pointer tracking-tighter">
          KP
        </div>
      </div>

      {/* Navigation Icons List */}
      <nav className="flex flex-col items-center gap-3 w-full my-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative w-full flex items-center justify-center">
              {/* Active Indicator Bar on Left Edge */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#0f1115] dark:bg-white" />
              )}
              <button
                type="button"
                onClick={() => onTabChange && onTabChange(item.id)}
                title={item.label}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#0f1115] dark:text-white bg-[#f1f3f7] dark:bg-[#1a1f29] shadow-sm'
                    : 'text-[#9ca3af] hover:text-[#0f1115] dark:hover:text-white hover:bg-[#f8f9fb] dark:hover:bg-[#1a1f29]/60'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} />
              </button>
            </div>
          );
        })}
      </nav>

      {/* Bottom Action: Logout */}
      <div className="flex flex-col items-center w-full">
        <button
          type="button"
          onClick={logout}
          title="Keluar / Logout"
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#9ca3af] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
}
