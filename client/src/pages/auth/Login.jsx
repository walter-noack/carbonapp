import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoWhite from '../../assets/logo-white.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#005429' }}>
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <img src={logoWhite} alt="CarbonApp" className="h-14 mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Plataforma de huella de carbono corporativa</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Ingresa a tu cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#0068ec' }}
                onFocus={e => e.target.style.borderColor = '#0068ec'}
                onBlur={e => e.target.style.borderColor = ''}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                onFocus={e => e.target.style.borderColor = '#0068ec'}
                onBlur={e => e.target.style.borderColor = ''}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-opacity"
              style={{ backgroundColor: '#0068ec' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#0058cc')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0068ec')}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          GHG Protocol · Alcances 1, 2 y 3
        </p>
      </div>
    </div>
  )
}
