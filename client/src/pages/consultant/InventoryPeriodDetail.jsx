import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
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

// Hints contextuales por tipo de actividad
const ACTIVITY_HINTS = {
  teletrabajo: 'Ingresa el consumo diario en kWh del total de teletrabajadores. Para el total anual multiplica por los días laborales del período.',
  avion_domestico: 'Total anual de km recorridos (suma de todos los vuelos). Incluye ida y vuelta por cada viaje.',
  avion_internacional: 'Total anual de km recorridos (suma de todos los vuelos). Incluye ida y vuelta por cada viaje.',
  bus_interurbano: 'Total anual de km. Incluye ida y vuelta por cada viaje.',
  tren: 'Total anual de km. Incluye ida y vuelta por cada viaje.',
  taxi_auto: 'Total anual de km recorridos en taxi o auto de alquiler.',
  auto_particular: 'Total anual de km de todos los empleados. Incluye ida y vuelta de cada jornada laboral.',
  moto: 'Total anual de km de todos los empleados. Incluye ida y vuelta de cada jornada laboral.',
  transporte_publico: 'Total anual de km de todos los empleados. Incluye ida y vuelta de cada jornada laboral.',
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

export default function InventoryPeriodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const basePath = user?.role === 'admin' ? '/admin' : '/dashboard'
  const [period, setPeriod] = useState(null)
  const [sources, setSources] = useState([])
  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)
  const [reopening, setReopening] = useState(false)
  // Estado para edición inline de cantidad
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingSaving, setEditingSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [importingValorizapp, setImportingValorizapp] = useState(false)
  const [valorizappResult, setValorizappResult] = useState(null)
  const [valorizappError, setValorizappError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/inventory-periods/${id}`),
      api.get(`/inventory-periods/${id}/emission-sources`),
      api.get('/emission-factors')
    ]).then(([calcRes, entriesRes, factorsRes]) => {
      setPeriod(calcRes.data)
      setNotes(calcRes.data.notes || '')
      setSources(entriesRes.data)
      setFactors(factorsRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  const categoriesForScope = [...new Set(factors.filter(f => f.scope === Number(form.scope)).map(f => f.category))]
  const activityTypesForCategory = factors.filter(f => f.scope === Number(form.scope) && f.category === form.category)
  const selectedFactor = activityTypesForCategory.find(f => f.activityType === form.activityType)
  const previewCo2e = selectedFactor && form.activityValue
    ? ((Number(form.activityValue) * selectedFactor.factor) / 1000).toFixed(4)
    : null

  const openModal = () => { setForm(EMPTY_FORM); setError(''); setModalOpen(true) }
  const handleScopeChange = (scope) => setForm({ ...EMPTY_FORM, scope })
  const handleCategoryChange = (category) => setForm(f => ({ ...f, category, activityType: '' }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedFactor) return setError('Selecciona un tipo de actividad')
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/inventory-periods/${id}/emission-sources`, {
        scope: Number(form.scope),
        category: form.category,
        activityType: form.activityType,
        activityValue: Number(form.activityValue),
        description: form.description
      })
      setSources(prev => [...prev, data.source])
      setPeriod(prev => ({ ...prev, totals: data.totals }))
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (sourceId) => {
    try {
      const { data } = await api.delete(`/inventory-periods/${id}/emission-sources/${sourceId}`)
      setSources(prev => prev.filter(e => e._id !== sourceId))
      setPeriod(prev => ({ ...prev, totals: data.totals }))
    } catch { /* silencioso */ }
  }

  const startEdit = (entry) => {
    setEditingId(entry._id)
    setEditingValue(String(entry.activityValue))
  }

  const cancelEdit = () => { setEditingId(null); setEditingValue('') }

  const handleSaveEdit = async (sourceId) => {
    if (!editingValue || Number(editingValue) < 0) return
    setEditingSaving(true)
    try {
      const { data } = await api.patch(`/inventory-periods/${id}/emission-sources/${sourceId}`, {
        activityValue: Number(editingValue)
      })
      setSources(prev => prev.map(e => e._id === data.source._id ? data.source : e))
      setPeriod(prev => ({ ...prev, totals: data.totals }))
      cancelEdit()
    } catch { /* silencioso */ }
    finally { setEditingSaving(false) }
  }

  const handleComplete = async () => {
    if (!window.confirm('¿Marcar este cálculo como completado?')) return
    setCompleting(true)
    try {
      const { data } = await api.patch(`/inventory-periods/${id}`, { status: 'completed' })
      setPeriod(data)
    } finally {
      setCompleting(false)
    }
  }

  const handleSaveNotes = async () => {
    setNotesSaving(true)
    try {
      const { data } = await api.patch(`/inventory-periods/${id}`, { notes })
      setPeriod(data)
    } finally {
      setNotesSaving(false)
    }
  }

  const handleReopen = async () => {
    setReopening(true)
    try {
      const { data } = await api.patch(`/inventory-periods/${id}`, { status: 'draft' })
      setPeriod(data)
    } finally {
      setReopening(false)
    }
  }

  const handleImportValorizapp = async () => {
    setImportingValorizapp(true)
    setValorizappError('')
    try {
      const { data } = await api.post(`/inventory-periods/${id}/import-valorizapp`)
      setValorizappResult(data)
      const { data: freshSources } = await api.get(`/inventory-periods/${id}/emission-sources`)
      setSources(freshSources)
      setPeriod(prev => ({ ...prev, totals: data.totals }))
    } catch (err) {
      setValorizappError(err.response?.data?.message || 'No se pudo conectar con Valorizapp')
    } finally {
      setImportingValorizapp(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>
  if (!period) return <div className="p-6 text-sm text-gray-500">Período no encontrado.</div>

  const isDraft = period.status === 'draft'

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate(`${basePath}/periods`)} className="text-xs text-gray-400 hover:text-gray-600 mb-2 block">
            ← Cálculos
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {period.org?.name} — {period.year}
          </h2>
          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDraft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {isDraft ? 'Borrador' : 'Completado'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft ? (
            <>
              <button
                onClick={openModal}
                className="bg-[#0068ec] hover:bg-[#005acc] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + Agregar entrada
              </button>
              {sources.length > 0 && (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="border border-green-600 text-green-700 hover:bg-green-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {completing ? 'Guardando...' : 'Completar cálculo'}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {reopening ? 'Reabriendo...' : 'Reabrir cálculo'}
              </button>
              <button
                onClick={() => navigate(`${basePath}/periods/${id}/results`)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Ver resultados
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resumen por alcance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ScopeCard scope={1} value={period.totals.scope1} />
        <ScopeCard scope={2} value={period.totals.scope2} />
        <ScopeCard scope={3} value={period.totals.scope3} />
        <div className="border border-gray-900 bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-semibold text-white">{period.totals.total.toFixed(3)}</p>
          <p className="text-xs text-gray-400">tCO₂e</p>
        </div>
      </div>

      {/* Banner integración Valorizapp */}
      {isDraft && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-green-800">Importar residuos desde Valorizapp</p>
            <p className="text-xs text-green-700 mt-0.5">
              {valorizappResult
                ? `${valorizappResult.imported.length} residuos importados como Alcance 3 · Cat. 5${valorizappResult.skipped.length > 0 ? ` (${valorizappResult.skipped.length} registros no convertibles omitidos)` : ''}.`
                : 'Trae automáticamente los residuos declarados en Valorizapp para este año como fuentes de Alcance 3.'}
            </p>
            {valorizappError && <p className="text-xs text-red-600 mt-1">{valorizappError}</p>}
          </div>
          <button
            onClick={handleImportValorizapp}
            disabled={importingValorizapp}
            className="shrink-0 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {importingValorizapp ? 'Importando...' : 'Importar desde Valorizapp'}
          </button>
        </div>
      )}

      {/* Notas */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Notas</p>
        {isDraft ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Agrega contexto, supuestos o comentarios sobre este cálculo..."
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving || notes === (period.notes || '')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
              >
                {notesSaving ? 'Guardando...' : 'Guardar notas'}
              </button>
              {notes !== (period.notes || '') && (
                <span className="text-xs text-gray-400">Cambios sin guardar</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {period.notes || <span className="text-gray-400 italic">Sin notas.</span>}
          </p>
        )}
      </div>

      {/* Entradas agrupadas por alcance */}
      {sources.length === 0 ? (
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
          const scopeEntries = sources.filter(e => e.scope === scope)
          if (scopeEntries.length === 0) return null
          return (
            <div key={scope} className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">{SCOPE_LABELS[scope]}</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Categoría', 'Actividad', 'Descripción', 'Cantidad', 'Factor', 'tCO₂e', isDraft ? '' : null]
                      .filter(h => h !== null)
                      .map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scopeEntries.map(entry => {
                    const isEditing = editingId === entry._id
                    const editedCo2e = isEditing && editingValue
                      ? ((Number(editingValue) * entry.emissionFactor) / 1000).toFixed(4)
                      : null
                    return (
                      <tr key={entry._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{CATEGORY_LABELS[entry.category] || entry.category}</td>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{entry.label}</td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {entry.importedFrom === 'valorizapp' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 mr-1.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              Valorizapp
                            </span>
                          )}
                          {entry.description || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              autoFocus
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              className="w-28 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-600">{entry.activityValue.toLocaleString('es-CL')} {entry.unit}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.emissionFactor} kgCO₂e/{entry.unit}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">
                          {isEditing && editedCo2e
                            ? <span className="text-blue-600">{editedCo2e}</span>
                            : entry.co2e.toFixed(4)
                          }
                        </td>
                        {isDraft && (
                          <td className="px-4 py-2.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSaveEdit(entry._id)}
                                  disabled={editingSaving}
                                  className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                                >
                                  {editingSaving ? '...' : 'Guardar'}
                                </button>
                                <button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-600">
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry._id)}
                                  className="text-xs text-red-400 hover:text-red-600"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )
        })
      )}

      {/* Modal agregar entrada */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
                          ? 'bg-[#0068ec] text-white border-[#0068ec]'
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

              {/* Cantidad + hint contextual */}
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
                  {ACTIVITY_HINTS[form.activityType] && (
                    <p className="flex items-start gap-1.5 text-xs text-gray-400 mt-1 leading-relaxed">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                      {ACTIVITY_HINTS[form.activityType]}
                    </p>
                  )}
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
                  className="flex-1 bg-[#0068ec] hover:bg-[#005acc] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
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
