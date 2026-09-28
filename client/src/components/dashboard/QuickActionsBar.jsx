import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  ArrowUpRight, 
  Layers, 
  Package, 
  FileSearch, 
  BookOpen, 
  History, 
  Target,
  Zap
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function QuickActionsBar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isReadOnlyRole = user?.role === 'AUDITOR' || user?.role === 'MANAGEMENT';

  const operationalActions = [
    {
      label: '+ Input Bon Masuk',
      description: 'Penerimaan pack Khazai',
      icon: PlusCircle,
      path: '/bon-masuk',
      color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20 hover:border-sky-300',
    },
    {
      label: '+ Sesi Sortir',
      description: 'Penataan pack & brood',
      icon: Layers,
      path: '/sortir',
      color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-300',
    },
    {
      label: '+ Kemas Doos',
      description: 'Pengemasan rasio 4:9',
      icon: Package,
      path: '/kemas',
      color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 hover:border-amber-300',
    },
    {
      label: 'Cek Celah Register',
      description: 'Deteksi celah & nomor hilang',
      icon: FileSearch,
      path: '/monitoring-doos',
      color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20 hover:border-purple-300',
    },
  ];

  const inspectionActions = [
    {
      label: 'Buku Register Doos',
      description: 'Daftar doos dan status kirim',
      icon: BookOpen,
      path: '/monitoring-doos',
      color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20 hover:border-sky-300',
    },
    {
      label: 'Deteksi Celah',
      description: 'Audit integritas nomor doos',
      icon: FileSearch,
      path: '/monitoring-doos',
      color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20 hover:border-rose-300',
    },
    {
      label: 'Log Audit Trail',
      description: 'Aktivitas mutasi sistem',
      icon: History,
      path: '/audit-trail',
      color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20 hover:border-purple-300',
    },
    {
      label: 'Target Produksi',
      description: 'Monitoring HCTS & capaian',
      icon: Target,
      path: '/target-produksi',
      color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-300',
    },
  ];

  const actions = isReadOnlyRole ? inspectionActions : operationalActions;

  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-6 md:p-8 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold tracking-tight text-ink dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Pintasan Aksi Cepat</span>
          </h3>
          <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark mt-0.5">
            {isReadOnlyRole
              ? 'Pintasan modul verifikasi, audit log, dan pelaporan eksekutif'
              : 'Pintasan instan untuk memulai input formulir dan sesi kerja'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.label}
              type="button"
              onClick={() => navigate(act.path)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer group flex flex-col justify-between ${act.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-sans">
                  {act.label}
                </h4>
                <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">
                  {act.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
