import { createContext, useContext, useState, useEffect } from 'react'
import api, { AMBIENTAPP_LOGIN_URL } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err) => {
        if (err.response?.data?.message === 'onboarding_required') {
          setNeedsOnboarding(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }))
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignorar */ }
    setUser(null)
    window.location.href = AMBIENTAPP_LOGIN_URL
  }

  return (
    <AuthContext.Provider value={{ user, loading, needsOnboarding, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
