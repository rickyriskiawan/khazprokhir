import React, { useState, useEffect } from "react";
import { 
  Server, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/health`);
      const latency = Math.round(performance.now() - start);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data);
      setPingLatency(latency);
    } catch (err) {
      setError(err.message);
      setHealthData(null);
      setPingLatency(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              KP
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                KHAZPROKHIR
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Step 1 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Sistem Monitoring Produksi Uang Kertas &bull; Seksi Khazanah Produk Akhir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Re-check Status
            </button>
            <a
              href="https://github.com/rickyriskiawan/khazprokhir/issues/1"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
            >
              <span>GitHub Issue #1</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner Hero */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 p-6 md:p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Fondasi Sistem Siap
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Inisialisasi Project & Konfigurasi Multi-Environment
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Struktur project telah siap dengan pemisahan lingkungan pengembangan (*development*) 
              dan produksi (*production*). Backend API, Frontend React, dan database PostgreSQL 
              lokal telah dikonfigurasi.
            </p>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Frontend Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Frontend Client</h3>
                  <p className="text-xs text-slate-400">React 19 + Vite + Tailwind</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/60 font-mono">
              <div className="flex justify-between">
                <span>Target API:</span>
                <span className="text-slate-200 truncate max-w-[180px]">{apiUrl}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="text-slate-200">{import.meta.env.MODE}</span>
              </div>
            </div>
          </div>

          {/* Backend Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Backend API</h3>
                  <p className="text-xs text-slate-400">Node.js + Express 5</p>
                </div>
              </div>
              {loading ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
                  Checking...
                </span>
              ) : healthData ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Offline
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/60 font-mono">
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="text-slate-200">GET /api/health</span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="text-slate-200">{pingLatency !== null ? `${pingLatency} ms` : "-"}</span>
              </div>
              {healthData && (
                <div className="flex justify-between">
                  <span>Server Env:</span>
                  <span className="text-emerald-400 font-semibold">{healthData.environment}</span>
                </div>
              )}
            </div>
          </div>

          {/* Database Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Database Base</h3>
                  <p className="text-xs text-slate-400">PostgreSQL 16/18</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Configured
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/60 font-mono">
              <div className="flex justify-between">
                <span>Port:</span>
                <span className="text-slate-200">5432</span>
              </div>
              <div className="flex justify-between">
                <span>Dev DB:</span>
                <span className="text-slate-200">khazprokhir_dev</span>
              </div>
              <div className="flex justify-between">
                <span>Docker Compose:</span>
                <span className="text-slate-200">Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Preview */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Layers className="w-4 h-4 text-emerald-400" />
              Progres Pengerjaan Step (Master Roadmap)
            </div>
            <span className="text-xs text-slate-400 font-mono">1 of 12 Steps Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Step 1: Init Project, Env Setup, & Docker Base
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 uppercase font-bold">
                PR Ready
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                Step 2: Database Schema (Prisma), Migrations & Seed
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Upcoming</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                Step 3: Core Business Rules (4-Pack Ratio) & Auth
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Upcoming</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                Step 4: Master Data & Target / Perencanaan Produksi
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Upcoming</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Khazprokhir Banknote Production Monitoring &bull; PT Peruri &bull; Automated Deployment Pipeline
      </footer>
    </div>
  );
}
