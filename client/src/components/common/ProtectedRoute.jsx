import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas dark:bg-canvas-dark">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
          <p className="text-xs font-medium text-ink-secondary dark:text-ink-secondary-dark">
            Memverifikasi sesi...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user && allowedRoles.includes(user.role)
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children ? children : <Outlet />
}

