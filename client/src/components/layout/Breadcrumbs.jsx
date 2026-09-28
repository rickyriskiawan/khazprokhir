import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'Dashboard Utama',
  'bon-masuk': 'Bon Masuk Khazai',
  sortir: 'Proses Sortir Pack',
  kemas: 'Pengemasan Doos',
  'monitoring-doos': 'Monitoring Doos & Register',
  'target-produksi': 'Target Produksi',
  'master-data': 'Master Data',
  'audit-trail': 'Audit Trail Log',
  unauthorized: 'Akses Ditolak',
};

function formatSlug(slug) {
  if (ROUTE_LABELS[slug]) return ROUTE_LABELS[slug];
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If path is root or /dashboard, render single clear identifier
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-ink-secondary dark:text-ink-secondary-dark">
        <div className="flex items-center gap-1.5 font-semibold text-ink dark:text-white">
          <Home className="w-3.5 h-3.5 text-pitch dark:text-emerald-400" />
          <span>Dashboard Utama</span>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-ink-muted">
      <ol className="flex items-center space-x-1.5">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-ink-secondary dark:text-ink-secondary-dark hover:text-pitch dark:hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khazprokhir</span>
          </Link>
        </li>

        {pathnames.map((segment, index) => {
          const isLast = index === pathnames.length - 1;
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const label = formatSlug(segment);

          return (
            <React.Fragment key={routeTo}>
              <li className="text-ink-muted/60 dark:text-slate-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-ink dark:text-white tracking-tight"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    to={routeTo}
                    className="text-ink-secondary dark:text-ink-secondary-dark hover:text-pitch dark:hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

