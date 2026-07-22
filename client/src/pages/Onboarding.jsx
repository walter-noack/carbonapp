import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Onboarding() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', orgName: '', taxId: '', industry: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/onboarding', form)
      window.location.href = '/#/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Error al completar el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#005429' }}>
      <div className="w-full max-w-sm bg-white rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Completa tu registro</h1>
        <p className="text-sm text-gray-500 mb-6">
          Es tu primera vez en CarbonApp — cuéntanos de tu empresa para empezar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tu nombre</label>
            <input
              type="text"
              required
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nombre de la empresa</label>
            <input
              type="text"
              required
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={form.orgName}
              onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">RUT (opcional)</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Rubro (opcional)</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#005429' }}
          >
            {loading ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
