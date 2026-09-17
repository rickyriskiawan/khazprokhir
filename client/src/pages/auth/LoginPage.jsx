import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  User,
  Lock,
  AlertCircle,
  Loader2,
  Layers,
  FileCheck2,
  Truck,
  Shield,
} from 'lucide-react'
import { KhazprokhirLogo } from '@/components/common/KhazprokhirLogo'
import ThemeToggle from '@/components/common/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, isAuthenticated } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [serverStatus, setServerStatus] = useState('checking') // 'online' | 'offline' | 'checking'

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  // Check server health
  useEffect(() => {
    let isMounted = true
    if (api?.get) {
      api
        .get('/health')
        .then(() => {
          if (isMounted) setServerStatus('online')
        })
        .catch(() => {
          if (isMounted) setServerStatus('offline')
        })
    }
    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', { username, password })
      const { token, user } = res.data?.data || res.data
      if (token && user) {
        setAuth(token, user)
        const from = location.state?.from?.pathname || '/dashboard'
        navigate(from, { replace: true })
      } else {
        throw new Error('Respons autentikasi tidak valid')
      }
    } catch (err) {
      setErrorMessage(
        err.userMessage ||
          err.response?.data?.message ||
          'Gagal masuk. Periksa kembali username dan password Anda.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickRole = (roleUser, rolePass) => {
    setUsername(roleUser)
    setPassword(rolePass)
    setErrorMessage('')
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200">
      {/* LEFT PANEL: 50% Desktop Official Branding & Security Showcase */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white lg:w-1/2 lg:p-12 xl:p-16">
        {/* Subtle Ambient Radial Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <KhazprokhirLogo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold text-emerald tracking-wide">
            <Shield className="h-3 w-3 text-emerald" />
            Seksi Khazanah Produk Akhir (Khazprokhir)
          </div>
        </div>

        {/* Middle Narrative & Value Pillars */}
        <div className="relative z-10 my-10 max-w-lg space-y-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl leading-snug">
            Sistem Terpadu Monitoring & Pengendalian Alur Produksi Uang Kertas Rupiah
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Platform pengawasan terintegrasi mulai dari penerimaan bahan setengah jadi Khazai, sortir kelipatan 4 pack, pengemasan 9 doos standar Bank Indonesia, hingga manajemen buku register fisik bebas celah (Zero Gap).
          </p>

          {/* 3 Pillars */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 backdrop-blur-sm">
              <div className="rounded-lg bg-emerald/10 p-2 text-emerald">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Zero Reject Accounting</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Rasio presisi 4 Pack (180.000 bilyet) = 9 Doos kemasan tanpa sisa lembar lepas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 backdrop-blur-sm">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Continuous Register Integrity</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Pelacakan buku register digital dan deteksi dini loncatan nomor doos per pecahan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 backdrop-blur-sm">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Secure Bank Indonesia Handover</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Dokumen serah terima pengiriman resmi BI lengkap dengan nominal terbilang presisi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Institutional Footer */}
        <div className="relative z-10 border-t border-slate-800/60 pt-4 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Divisi Percetakan Uang Kertas — Perum Peruri</span>
          <span className="font-mono text-slate-400">TA 2026</span>
        </div>
      </div>

      {/* RIGHT PANEL: 50% Desktop Clean Login Form */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Top Bar: Server Status & Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-ink-secondary dark:text-ink-secondary-dark">
              Status Server:
            </span>
            {serverStatus === 'online' && (
              <Badge variant="emerald" className="gap-1 text-[10px] font-mono tracking-wide py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                ONLINE
              </Badge>
            )}
            {serverStatus === 'offline' && (
              <Badge variant="destructive" className="gap-1 text-[10px] font-mono tracking-wide py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                OFFLINE
              </Badge>
            )}
            {serverStatus === 'checking' && (
              <Badge variant="outline" className="gap-1 text-[10px] font-mono tracking-wide py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                CHECKING
              </Badge>
            )}
          </div>
          <ThemeToggle />
        </div>

        {/* Middle: Login Form Card */}
        <div className="mx-auto my-8 w-full max-w-sm">
          <Card className="border-border/80 shadow-soft-card dark:border-border-dark dark:shadow-soft-card-dark">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="space-y-1.5 text-center">
                <h2 className="text-xl font-bold tracking-tight text-pitch dark:text-white">
                  Masuk ke Sistem
                </h2>
                <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
                  Gunakan akun dinas Anda untuk mengakses ruang kerja produksi
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="username">Username / NIP</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="Masukkan username Anda"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="pl-9"
                    />
                    <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted dark:text-ink-muted-dark" />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password Anda"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-9 pr-10"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted dark:text-ink-muted-dark" />
                    <button
                      type="button"
                      aria-label="Tampilkan password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full font-semibold gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>

              {/* Quick-Role Selector (Development Mode) */}
              <div className="border-t border-border/80 dark:border-border-dark/80 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-muted-dark">
                    Akun Cepat (Testing)
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                    DEV
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickRole('supervisor', 'password123')}
                    className="flex items-center justify-center rounded-lg border border-border bg-surface-subtle py-1.5 px-2 text-[11px] font-medium text-ink hover:bg-border/50 dark:border-border-dark dark:bg-surface-subtle-dark dark:text-ink-dark dark:hover:bg-border-dark/50 transition-colors"
                  >
                    Supervisor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRole('operator1', 'password123')}
                    className="flex items-center justify-center rounded-lg border border-border bg-surface-subtle py-1.5 px-2 text-[11px] font-medium text-ink hover:bg-border/50 dark:border-border-dark dark:bg-surface-subtle-dark dark:text-ink-dark dark:hover:bg-border-dark/50 transition-colors"
                  >
                    Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRole('auditor', 'password123')}
                    className="flex items-center justify-center rounded-lg border border-border bg-surface-subtle py-1.5 px-2 text-[11px] font-medium text-ink hover:bg-border/50 dark:border-border-dark dark:bg-surface-subtle-dark dark:text-ink-dark dark:hover:bg-border-dark/50 transition-colors"
                  >
                    Auditor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRole('management', 'password123')}
                    className="flex items-center justify-center rounded-lg border border-border bg-surface-subtle py-1.5 px-2 text-[11px] font-medium text-ink hover:bg-border/50 dark:border-border-dark dark:bg-surface-subtle-dark dark:text-ink-dark dark:hover:bg-border-dark/50 transition-colors"
                  >
                    Management
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Helper Notice */}
        <div className="text-center text-[11px] text-ink-muted dark:text-ink-muted-dark">
          Keamanan Sistem: Akses diaudit dan dilindungi kebijakan privasi Perum Peruri.
        </div>
      </div>
    </div>
  )
}
