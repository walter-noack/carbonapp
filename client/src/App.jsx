import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import ConsultantLayout from './components/ConsultantLayout'
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/Dashboard'
import Organizations from './pages/admin/Organizations'
import Users from './pages/admin/Users'
import ConsultantHome from './pages/consultant/Home'
import Calculations from './pages/consultant/Calculations'
import CalculationDetail from './pages/consultant/CalculationDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

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
            <Route path="calculations" element={<Calculations />} />
            <Route path="calculations/:id" element={<CalculationDetail />} />
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
            <Route path="calculations" element={<Calculations />} />
            <Route path="calculations/:id" element={<CalculationDetail />} />
          </Route>

          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center text-gray-500">
              No tienes permiso para acceder a esta página.
            </div>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
