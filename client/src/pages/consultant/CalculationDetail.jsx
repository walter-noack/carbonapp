import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const SCOPE_LABELS = { 1: 'Alcance 1 — Emisiones directas', 2: 'Alcance 2 — Electricidad comprada', 3: 'Alcance 3 — Emisiones indirectas' }
const CATEGORY_LABELS = {
  combustion_estacionaria: 'Combustión estacionaria',
  combustion_movil: 'Combustión móvil',
  fugitivas: 'Emisiones fugitivas',
  electricidad: 'Electricidad',
  residuos: 'Residuos',
  viajes_negocio: 'Viajes de negocios',
  desplazamiento_empleados: 'Desplazamiento de empleados'
}

const EMPTY_FORM = { scope: 1, category: '', activityType: '', activityValue: '', description: '' }

function ScopeCard({ scope, value }) {
  const colors = { 1: 'border-orange-200 bg-orange-50', 2: 'border-yellow-200 bg-yellow-50', 3: 'border-purple-200 bg-purple-50' }
  return (
    <div className={`border rounded-xl p-4 ${colors[scope]}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">Alcance {scope}</p>
      <p className="text-2xl font-semibold text-gray-900">{value.toFixed(3)}</p>
      <p className="text-xs text-gray-500">tCO₂e</p>
    </div>
  )
}

export default function CalculationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const basePath = user?.role === 'admin' ? '/admin' : '/dashboard'
  const [calc, setCalc] = useState(null)
  const [entries, setEntries] = useState([])
  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/calculations/${id}`),
      api.get(`/calculations/${id}/entries`),
      api.get('/emission-factors')
    ]).then(([calcRes, entriesRes, factorsRes]) => {
      setCalc(calcRes.data)
      setEntries(entriesRes.data)
      setFactors(factorsRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  // Opciones de categoría según scope seleccionado
  const categoriesForScope = [...new Set(factors.filter(f => f.scope === Number(form.scope)).map(f => f.category))]

  // Opciones de activityType según scope + category
  const activityTypesForCategory = factors.filter(
    f => f.scope === Number(form.scope) && f.category === form.category
  )

  // Factor seleccionado para preview
  const selectedFactor = activityTypesForCategory.find(f => f.activityType === form.activityType)
  const previewCo2e = selectedFactor && form.activityValue
    ? ((Number(form.activityValue) * selectedFactor.factor) / 1000).toFixed(4)
    : null

  const openModal = () => { setForm(EMPTY_FORM); setError(''); setModalOpen(true) }

  const handleScopeChange = (scope) => {
    setForm({ ...EMPTY_FORM, scope })
  }

  const handleCategoryChange = (category) => {
    setForm(f => ({ ...f, category, activityType: '' }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedFactor) return setError('Selecciona un tipo de actividad')
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/calculations/${id}/entries`, {
        scope: Number(form.scope),
        category: form.category,
        activityType: form.activityType,
        activityValue: Number(form.activityValue),
        description: form.description
      })
      setEntries(prev => [...prev, data.entry])
      setCalc(prev => ({ ...prev, totals: data.totals }))
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    try {
      const { data } = await api.delete(`/calculations/${id}/entries/${entryId}`)
      setEntries(prev => prev.filter(e => e._id !== entryId))
      setCalc(prev => ({ ...prev, totals: data.totals }))
    } catch { /* silencioso */ }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const { data } = await api.patch(`/calculations/${id}`, { status: 'completed' })
      setCalc(data)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>
  if (!calc) return <div className="p-6 text-sm text-gray-500">Cálculo no encontrado.</div>

  const isDraft = calc.status === 'draft'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate(`${basePath}/calculations`)} className="text-xs text-gray-400 hover:text-gray-600 mb-2 block">
            ← Mis cálculos
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {calc.org?.name} — {calc.year}
          </h2>
          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDraft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {isDraft ? 'Borrador' : 'Completado'}
          </span>
        </div>

        {isDraft && (
          <div className="flex gap-2">
            <button
              onClick={openModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Agregar entrada
            </button>
            {entries.length > 0 && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="border border-green-600 text-green-700 hover:bg-green-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {completing ? 'Guardando...' : 'Completar cálculo'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resumen por alcance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ScopeCard scope={1} value={calc.totals.scope1} />
        <ScopeCard scope={2} value={calc.totals.scope2} />
        <ScopeCard scope={3} value={calc.totals.scope3} />
        <div className="border border-gray-900 bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-semibold text-white">{calc.totals.total.toFixed(3)}</p>
          <p className="text-xs text-gray-400">tCO₂e</p>
        </div>
      </div>

      {/* Entradas agrupadas por alcance */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm">No hay entradas aún.</p>
          {isDraft && (
            <button onClick={openModal} className="text-sm text-blue-600 hover:underline mt-1">
              Agregar la primera
            </button>
          )}
        </div>
      ) : (
        [1, 2, 3].map(scope => {
          const scopeEntries = entries.filter(e => e.scope === scope)
          if (scopeEntries.length === 0) return null
          return (
            <div key={scope} className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">{SCOPE_LABELS[scope]}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Categoría', 'Actividad', 'Descripción', 'Cantidad', 'Factor', 'tCO₂e', isDraft ? '' : null]
                      .filter(Boolean)
                      .map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scopeEntries.map(entry => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">{CATEGORY_LABELS[entry.category] || entry.category}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{entry.label}</td>
                      <td className="px-4 py-2.5 text-gray-400">{entry.description || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{entry.activityValue.toLocaleString('es-CL')} {entry.unit}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.emissionFactor} kgCO₂e/{entry.unit}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{entry.co2e.toFixed(4)}</td>
                      {isDraft && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteEntry(entry._id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}

      {/* Modal agregar entrada */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Agregar entrada</h3>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Alcance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alcance</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleScopeChange(s)}
                      className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                        Number(form.scope) === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Alcance {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {categoriesForScope.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de actividad */}
              {form.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de actividad *</label>
                  <select
                    required
                    value={form.activityType}
                    onChange={(e) => setForm(f => ({ ...f, activityType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {activityTypesForCategory.map(f => (
                      <option key={f.activityType} value={f.activityType}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cantidad */}
              {form.activityType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad ({selectedFactor?.unit}) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.activityValue}
                    onChange={(e) => setForm(f => ({ ...f, activityValue: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  {previewCo2e && (
                    <p className="text-xs text-blue-600 mt-1">
                      = <strong>{previewCo2e} tCO₂e</strong> · factor: {selectedFactor.factor} kgCO₂e/{selectedFactor.unit}
                    </p>
                  )}
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: Generador sala de servidores"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
