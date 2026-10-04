import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import DashboardPage from '../pages/dashboard/DashboardPage'
import BonMasukPage from '../pages/bon-masuk/BonMasukPage'
import ProsesSortirPage from '../pages/sortir/ProsesSortirPage'
import HasilKemasPage from '../pages/kemas/HasilKemasPage'
import LoginPage from '../pages/auth/LoginPage'
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage'
import NotFoundPage from '../pages/common/NotFoundPage'
import ModulePlaceholderPage from '../pages/common/ModulePlaceholderPage'
import { ProtectedRoute } from '../components/common/ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes (Strict Gatekeeper & RBAC Guard) */}
      <Route element={<ProtectedRoute />}>
        {/* All operational routes wrapped in DashboardLayout App Shell */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Modul Operasional Fisik (Supervisor & Operator) */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR', 'OPERATOR']} />}>
            <Route path="/bon-masuk" element={<BonMasukPage />} />
            <Route path="/sortir" element={<ProsesSortirPage />} />
            <Route path="/kemas" element={<HasilKemasPage />} />
          </Route>

          {/* Modul Monitoring Doos (Semua Peran, Auditor & Management read-only) */}
          <Route
            path="/monitoring-doos"
            element={
              <ModulePlaceholderPage
                moduleName="Modul 4: Monitoring Doos & Deteksi Celah Register"
                moduleCode="FE-10 s/d FE-11"
                description="Buku register doos per denominasi & tahun anggaran serta deteksi otomatis loncatan nomor doos (GAP)."
              />
            }
          />

          {/* Perencanaan & Master Data */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGEMENT', 'AUDITOR']} />}>
            <Route
              path="/target-produksi"
              element={
                <ModulePlaceholderPage
                  moduleName="Perencanaan: Target Produksi Tahunan & Bulanan"
                  moduleCode="FE-12"
                  description="Pencatatan target TA berjalan, pembagian bulanan, dan evaluasi persediaan HCTS."
                />
              }
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR']} />}>
            <Route
              path="/master-data"
              element={
                <ModulePlaceholderPage
                  moduleName="Master Data: Denominasi, Emisi, Shift & Akun"
                  moduleCode="FE-12"
                  description="Konfigurasi data master referensi, kode huruf pecahan, dan manajemen akun pengguna."
                />
              }
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR', 'AUDITOR']} />}>
            <Route
              path="/audit-trail"
              element={
                <ModulePlaceholderPage
                  moduleName="Audit Trail Log Aktivitas"
                  moduleCode="FE-13"
                  description="Pencatatan forensik mutasi data, login pengguna, dan riwayat pembatalan/koreksi transaksi."
                />
              }
            />
          </Route>
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
