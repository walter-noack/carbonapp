import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i)

const STATUS_LABEL = { draft: 'Borrador', completed: 'Completado' }
const STATUS_STYLE = {
  draft: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700'
}

export default function Calculations() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const basePath = isAdmin ? '/admin' : '/dashboard'

  const [calcs, setCalcs] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [year, setYear] = useState(currentYear)
  const [orgId, setOrgId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const requests = [api.get('/calculations')]
    if (isAdmin) requests.push(api.get('/organizations'))
    Promise.all(requests).then(([calcsRes, orgsRes]) => {
      setCalcs(calcsRes.data)
      if (orgsRes) setOrgs(orgsRes.data.filter(o => o.active))
    }).finally(() => setLoading(false))
  }, [isAdmin])

  const openModal = () => {
    setYear(currentYear)
    setOrgId('')
    setError('')
    setModalOpen(true)
  }

  const handleReopen = async (e, calcId) => {
    e.stopPropagation()
    try {
      const { data } = await api.patch(`/calculations/${calcId}`, { status: 'draft' })
      setCalcs(prev => prev.map(c => c._id === data._id ? data : c))
    } catch { /* silencioso */ }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (isAdmin && !orgId) return setError('Selecciona una organización')
    setSaving(true)
    setError('')
    try {
      const payload = { year, ...(isAdmin && { org: orgId }) }
      const { data } = await api.post('/calculations', payload)
      navigate(`${basePath}/calculations/${data._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear')
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cálculos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Huella de carbono corporativa — GHG Protocol</p>
        </div>
        <button
          onClick={openModal}
          className="bg-[#0068ec] hover:bg-[#005acc] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo cálculo
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : calcs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Aún no hay cálculos.</p>
          <button onClick={openModal} className="text-sm text-blue-600 hover:underline mt-1">
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Año', 'Organización', 'Alcance 1', 'Alcance 2', 'Alcance 3', 'Total tCO₂e', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calcs.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => navigate(`${basePath}/calculations/${c._id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.year}</td>
                  <td className="px-4 py-3 text-gray-600">{c.org?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.totals.scope1.toFixed(3)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.totals.scope2.toFixed(3)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.totals.scope3.toFixed(3)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.totals.total.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      {c.status === 'draft' ? (
                        <button
                          onClick={() => navigate(`${basePath}/calculations/${c._id}`)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          Completar
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleReopen(e, c._id)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`${basePath}/calculations/${c._id}/results`)}
                        disabled={c.status !== 'completed'}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Ver resultados
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Nuevo cálculo</h3>
              <p className="text-sm text-gray-500 mt-0.5">Selecciona el año fiscal a reportar</p>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organización *</label>
                  <select
                    required
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#0068ec] hover:bg-[#005acc] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
