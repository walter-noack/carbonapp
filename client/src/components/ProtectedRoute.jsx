import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AMBIENTAPP_LOGIN_URL } from '../api/axios'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, needsOnboarding } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>

  if (needsOnboarding) return <Navigate to="/onboarding" replace />

  if (!user) {
    window.location.href = AMBIENTAPP_LOGIN_URL
    return null
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
