import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Layers,
  CheckSquare2,
  Package,
  Compass,
  Target,
  Database,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import KhazprokhirLogo from '../common/KhazprokhirLogo';

const MENU_GROUPS = [
  {
    title: 'Utama',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard Utama',
        icon: LayoutGrid,
        roles: ['OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'],
      },
    ],
  },
  {
    title: 'Operasional Produksi',
    items: [
      {
        to: '/bon-masuk',
        label: 'Bon Masuk Khazai',
        icon: Layers,
        roles: ['OPERATOR', 'SUPERVISOR'],
      },
      {
        to: '/sortir',
        label: 'Proses Sortir Pack',
        icon: CheckSquare2,
        roles: ['OPERATOR', 'SUPERVISOR'],
      },
      {
        to: '/kemas',
        label: 'Pengemasan Doos',
        icon: Package,
        roles: ['OPERATOR', 'SUPERVISOR'],
      },
      {
        to: '/monitoring-doos',
        label: 'Monitoring Doos',
        icon: Compass,
        roles: ['OPERATOR', 'SUPERVISOR', 'AUDITOR', 'MANAGEMENT'],
        readOnlyRoles: ['AUDITOR', 'MANAGEMENT'],
      },
    ],
  },
  {
    title: 'Perencanaan & Master',
    items: [
      {
        to: '/target-produksi',
        label: 'Target Produksi',
        icon: Target,
        roles: ['SUPERVISOR', 'MANAGEMENT', 'AUDITOR'],
      },
      {
        to: '/master-data',
        label: 'Master Data',
        icon: Database,
        roles: ['SUPERVISOR'],
      },
      {
        to: '/audit-trail',
        label: 'Audit Trail',
        icon: ShieldAlert,
        roles: ['SUPERVISOR', 'AUDITOR'],
      },
    ],
  },
];

export default function Sidebar({ onItemClick, isMobile = false }) {
  const { user } = useAuthStore();
  const { isSidebarExpanded, toggleSidebar } = useUIStore();

  const userRole = user?.role || 'OPERATOR';
  const effectiveExpanded = isMobile ? true : isSidebarExpanded;

  // Filter groups according to current user role
  const visibleGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(userRole)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={`${
        effectiveExpanded ? 'w-64' : 'w-20'
      } relative flex flex-col justify-between py-5 bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark shrink-0 h-full transition-all duration-300 ease-in-out z-30 select-none`}
    >
      {/* Floating Pill Toggle Button on Desktop Right Border */}
      {!isMobile && (
        <button
          type="button"
          onClick={toggleSidebar}
          title={effectiveExpanded ? 'Ciutkan Sidebar' : 'Perluas Sidebar'}
          className="absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-md flex items-center justify-center text-ink-secondary hover:text-pitch dark:hover:text-white transition-all duration-200 hover:scale-110 z-40 cursor-pointer"
          aria-label={effectiveExpanded ? 'Ciutkan Sidebar' : 'Perluas Sidebar'}
        >
          {effectiveExpanded ? (
            <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
          ) : (
            <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
          )}
        </button>
      )}

      {/* 1. Header: Logo & Branding */}
      <div className={`px-4 mb-4 flex items-center ${effectiveExpanded ? 'justify-between' : 'justify-center'}`}>
        <div
          className="flex items-center gap-3 overflow-hidden cursor-pointer group"
          onClick={!isMobile ? toggleSidebar : undefined}
        >
          <div className="shrink-0 group-hover:scale-105 transition-transform duration-200">
            <KhazprokhirLogo size="sm" />
          </div>
          {effectiveExpanded && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black tracking-tight text-ink dark:text-white truncate uppercase font-mono">
                KHAZPROKHIR
              </span>
              <span className="text-[10px] text-ink-secondary dark:text-ink-secondary-dark truncate font-medium">
                Monitoring Produksi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Navigation Items Grouped */}
      <div className="flex-1 overflow-y-auto px-3 space-y-5 py-2 scrollbar-none">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {effectiveExpanded && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted/80 dark:text-slate-500">
                {group.title}
              </div>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isReadOnly = item.readOnlyRoles?.includes(userRole);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onItemClick}
                    title={!effectiveExpanded ? `${item.label}${isReadOnly ? ' (Read-Only)' : ''}` : undefined}
                    className={({ isActive }) =>
                      `relative w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                        effectiveExpanded ? 'px-3 py-2.5 gap-3' : 'justify-center h-10 px-0'
                      } ${
                        isActive
                          ? 'text-pitch dark:text-white bg-slate-100 dark:bg-surface-subtle-dark font-semibold shadow-xs'
                          : 'text-ink-secondary dark:text-ink-secondary-dark hover:text-pitch dark:hover:text-white hover:bg-slate-50 dark:hover:bg-surface-subtle-dark/50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-pitch dark:bg-emerald-400" />
                        )}

                        <Icon
                          className="w-4 h-4 shrink-0 transition-colors"
                          strokeWidth={isActive ? 2.25 : 1.75}
                        />

                        {effectiveExpanded && (
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="text-xs truncate tracking-tight">
                              {item.label}
                            </span>
                            {isReadOnly && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 font-medium">
                                Read-Only
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Footer: Status Pill & Collapse Toggle (Desktop) */}
      <div className="pt-3 px-3 border-t border-border dark:border-border-dark flex flex-col gap-2">
        {/* System Health Indicator */}
        <div
          className={`flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 ${
            effectiveExpanded ? 'px-3 py-1.5 gap-2' : 'justify-center py-2'
          }`}
          title="Status Sistem: Online"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {effectiveExpanded && (
            <span className="text-[11px] font-medium tracking-tight truncate">
              Sistem Aktif
            </span>
          )}
        </div>

        {/* Collapsible Toggle Button at bottom for desktop */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center rounded-xl text-xs text-ink-muted hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
              effectiveExpanded ? 'px-3 py-2 gap-2.5' : 'justify-center h-9'
            }`}
          >
            {effectiveExpanded ? (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">Ciutkan Menu</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
