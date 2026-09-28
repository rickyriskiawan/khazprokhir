import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas p-4 dark:bg-canvas-dark transition-colors">
      <Card className="w-full max-w-md border-border/80 text-center dark:border-border-dark shadow-soft-card dark:shadow-soft-card-dark">
        <CardContent className="flex flex-col items-center p-8 space-y-5">
          {/* Shield Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400 shadow-sm">
            <ShieldAlert className="h-8 w-8" strokeWidth={1.75} />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <Badge variant="destructive" className="mb-2 uppercase tracking-wider">
              Status 403 Forbidden
            </Badge>
            <h1 className="text-xl font-bold tracking-tight text-pitch dark:text-white">
              Otoritas Tidak Mencukupi
            </h1>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark leading-relaxed">
              Akun Anda tidak memiliki izin untuk mengakses modul ini. Setiap transaksi di Seksi Khazprokhir dibatasi sesuai kewenangan tugas.
            </p>
          </div>

          {/* User Info Badge */}
          {user && (
            <div className="w-full rounded-xl border border-border bg-surface-subtle p-3 text-xs dark:border-border-dark dark:bg-surface-subtle-dark flex items-center justify-between">
              <div className="text-left">
                <p className="font-semibold text-ink dark:text-ink-dark">{user.nama_lengkap || user.username}</p>
                <p className="text-ink-muted dark:text-ink-muted-dark font-mono">NIP/User: {user.username}</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wide">
                ROLE: {user.role}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline"
              size="default"
              className="w-full gap-2 text-xs"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Ganti Akun
            </Button>
            <Button
              variant="default"
              size="default"
              className="w-full gap-2 text-xs"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Ke Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

