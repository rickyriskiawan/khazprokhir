import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function ModulePlaceholderPage({
  moduleName = 'Modul Operasional',
  moduleCode = 'FE-XX',
  description = 'Antarmuka modul ini sedang dalam tahap persiapan sesuai master roadmap perencanaan.',
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 shadow-sm">
        <Construction className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-ink-muted mb-2 font-mono">
        Roadmap {moduleCode}
      </span>

      <h2 className="text-xl md:text-2xl font-bold text-ink dark:text-white tracking-tight">
        {moduleName}
      </h2>

      <p className="text-xs md:text-sm text-ink-secondary dark:text-ink-secondary-dark max-w-md mt-2 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="default" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
