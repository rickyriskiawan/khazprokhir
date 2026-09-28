import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

export default function DashboardLayout() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const location = useLocation();

  const [prevPath, setPrevPath] = useState(location.pathname);

  // Close mobile drawer when route changes
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setIsMobileDrawerOpen(false);
  }

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileDrawerOpen]);

  return (
    <div className="min-h-screen flex bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark antialiased overflow-hidden">
      {/* 1. Desktop Sidebar (Hidden on Mobile) */}
      <div className="hidden md:flex shrink-0 sticky top-0 h-screen z-30">
        <Sidebar />
      </div>

      {/* 2. Mobile Sidebar Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-surface dark:bg-surface-dark shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {/* Close Button on Mobile Drawer */}
            <div className="absolute top-3.5 right-3.5 z-20">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup menu navigasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Sidebar
              isMobile={true}
              onItemClick={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Main Operational Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Topbar */}
        <Topbar onToggleMobileSidebar={() => setIsMobileDrawerOpen(true)} />

        {/* Dynamic Outlet Page Content */}
        <main className="flex-1 overflow-y-auto bg-canvas dark:bg-canvas-dark">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
