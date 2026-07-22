import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AMBIENTAPP_LOGIN_URL } from './api/axios'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import ConsultantLayout from './components/ConsultantLayout'
import Onboarding from './pages/Onboarding'
import AdminDashboard from './pages/admin/Dashboard'
import Organizations from './pages/admin/Organizations'
import Users from './pages/admin/Users'
import ConsultantHome from './pages/consultant/Home'
import InventoryPeriods from './pages/consultant/InventoryPeriods'
import InventoryPeriodDetail from './pages/consultant/InventoryPeriodDetail'
import InventoryPeriodResults from './pages/consultant/InventoryPeriodResults'

function RedirectToHubLogin() {
  useEffect(() => {
    window.location.href = AMBIENTAPP_LOGIN_URL
  }, [])
  return null
}

export default function App() {
  return (
    // HashRouter: Banahosting (mismo hosting que Valorizapp) suele ignorar el
    // .htaccess de estos subdominios (AllowOverride deshabilitado), lo que
    // rompe rutas como /admin o /dashboard al recargar. Con hash (/#/admin)
    // el navegador nunca le pide nada al servidor más allá de index.html.
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<RedirectToHubLogin />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Área admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="users" element={<Users />} />
            <Route path="periods" element={<InventoryPeriods />} />
            <Route path="periods/:id" element={<InventoryPeriodDetail />} />
            <Route path="periods/:id/results" element={<InventoryPeriodResults />} />
          </Route>

          {/* Área consultant */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['consultant']}>
                <ConsultantLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ConsultantHome />} />
            <Route path="periods" element={<InventoryPeriods />} />
            <Route path="periods/:id" element={<InventoryPeriodDetail />} />
            <Route path="periods/:id/results" element={<InventoryPeriodResults />} />
          </Route>

          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center text-gray-500">
              No tienes permiso para acceder a esta página.
            </div>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
