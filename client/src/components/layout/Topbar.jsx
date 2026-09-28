import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Clock, Pencil, LogOut } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import ThemeToggle from '../common/ThemeToggle';
import LogoutConfirmModal from './LogoutConfirmModal';
import ShiftEditModal from './ShiftEditModal';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import {
  getCurrentShiftInfo,
  formatLiveClock,
  getShiftBadgeStyle,
} from '../../utils/shiftUtils';

export default function Topbar({ onToggleMobileSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { shifts, fetchShifts } = useShiftStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // Live timer tick every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch shift master data on mount
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const shiftInfo = getCurrentShiftInfo(currentTime, shifts);
  const isSupervisor = user?.role === 'SUPERVISOR';
  const displayName = user?.full_name || user?.username || 'Petugas Khazprokhir';
  const roleName = user?.role || 'OPERATOR';

  const roleBadgeStyle = {
    SUPERVISOR: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    OPERATOR: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    AUDITOR: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    MANAGEMENT: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  }[roleName] || 'bg-slate-100 text-slate-700 border-slate-200';

  const handleConfirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <header className="w-full flex items-center justify-between h-16 px-4 md:px-6 lg:px-8 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-border dark:border-border-dark sticky top-0 z-20 transition-colors duration-200">
      {/* 1. Left: Hamburger (Mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-ink-secondary hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* 2. Right: Shift Pill + Live Clock + ThemeToggle + User Profile + Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Shift Badge Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-tight transition-all ${getShiftBadgeStyle(
            shiftInfo.activeShift?.nama,
            shiftInfo.isHandover
          )}`}
          title={`Jadwal Kerja Aktif: ${shiftInfo.label}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-none">
            {shiftInfo.isHandover ? 'Peralihan Shift' : shiftInfo.activeShift?.nama || 'Luar Shift'}
          </span>

          {/* Supervisor can edit shift schedule */}
          {isSupervisor && (
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              title="Kelola Jam Kerja Shift"
              className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Kelola Jam Kerja Shift"
            >
              <Pencil className="w-3 h-3 text-current" />
            </button>
          )}
        </div>

        {/* Live Digital Clock (Hidden on very small screens) */}
        <div className="hidden sm:flex items-center px-2 py-1 text-xs font-mono font-medium text-ink-secondary dark:text-ink-secondary-dark tracking-tight">
          {formatLiveClock(currentTime)}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-1 border-l border-border dark:border-border-dark">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-border dark:border-border-dark flex items-center justify-center font-bold text-xs text-ink dark:text-white shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-xs font-semibold text-ink dark:text-white truncate max-w-[120px] lg:max-w-[160px]">
              {displayName}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border w-fit ${roleBadgeStyle}`}
            >
              {roleName}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          title="Keluar dari Sistem"
          className="p-2 rounded-lg text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          aria-label="Keluar dari Sistem"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {isSupervisor && (
        <ShiftEditModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        />
      )}
    </header>
  );
}
