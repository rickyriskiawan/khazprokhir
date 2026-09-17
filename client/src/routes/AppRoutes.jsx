import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from '../pages/dashboard/DashboardPage'
import LoginPage from '../pages/auth/LoginPage'
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage'
import NotFoundPage from '../pages/common/NotFoundPage'
import { ProtectedRoute } from '../components/common/ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes (Strict Gatekeeper & RBAC Guard) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
