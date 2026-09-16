import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data?.data || res.data;
      if (token && user) {
        setAuth(token, user);
        navigate('/');
      } else {
        throw new Error('Respons login tidak valid dari server');
      }
    } catch (err) {
      setErrorMessage(err.userMessage || 'Gagal masuk. Periksa kembali username dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f7] dark:bg-[#090b0e] text-[#11141a] dark:text-[#f9fafb] flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="px-6 md:px-8 py-5 flex justify-between items-center border-b border-[#e8ebf1] dark:border-[#1e2430] bg-white/70 dark:bg-[#12151c]/70 backdrop-blur">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#0f1115] dark:bg-white text-white dark:text-[#0f1115] flex items-center justify-center font-bold text-sm shadow-sm tracking-tight">
            KP
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block text-[#11141a] dark:text-white">
              KHAZPROKHIR
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#9ca3af] block -mt-0.5 font-medium">
              Seksi Khazanah Produk Akhir
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Card Container */}
          <div className="bg-white dark:bg-[#12151c] border border-[#e8ebf1] dark:border-[#1e2430] rounded-3xl p-7 sm:p-9 shadow-soft-card dark:shadow-soft-card-dark transition-all duration-200">
            {/* Header Icon */}
            <div className="text-center space-y-2 mb-7">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f8f9fb] dark:bg-[#1a1f29] flex items-center justify-center text-[#0f1115] dark:text-white mb-3 shadow-sm">
                <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#11141a] dark:text-white">
                Masuk Sistem
              </h1>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                Akses operasional monitoring produksi uang kertas
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-start gap-2.5 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#11141a] dark:text-white block">
                  Username / ID Operator
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-[#f8f9fb] dark:bg-[#1a1f29] border border-[#e8ebf1] dark:border-[#1e2430] text-[#11141a] dark:text-white placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0f1115]/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#11141a] dark:text-white block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-[#f8f9fb] dark:bg-[#1a1f29] border border-[#e8ebf1] dark:border-[#1e2430] text-[#11141a] dark:text-white placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0f1115]/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-[#0f1115] hover:bg-[#1f242d] dark:bg-white dark:hover:bg-[#f1f3f7] dark:text-[#0f1115] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Test credentials info hint */}
            <div className="mt-6 pt-4 border-t border-[#e8ebf1] dark:border-[#1e2430] text-center">
              <p className="text-[11px] text-[#9ca3af]">
                Akun dev: <span className="font-mono text-[#0f1115] dark:text-white font-semibold">supervisor</span> / <span className="font-mono text-[#0f1115] dark:text-white font-semibold">password123</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center border-t border-[#e8ebf1] dark:border-[#1e2430] text-xs text-[#9ca3af]">
        Seksi Khazanah Produk Akhir &bull; Banknote Monitoring System
      </footer>
    </div>
  );
}
