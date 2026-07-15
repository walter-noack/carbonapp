import { useEffect, useState } from 'react'
import api from '../../api/axios'

const EMPTY_FORM = { name: '', taxId: '', industry: '', country: 'CL', active: true, employeeCount: '', annualRevenueMillionClp: '' }

export default function Organizations() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // org object | null
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchOrgs = async () => {
    try {
      const { data } = await api.get('/organizations')
      setOrgs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrgs() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (org) => {
    setEditing(org)
    setForm({
      name: org.name,
      taxId: org.taxId || '',
      industry: org.industry || '',
      country: org.country || 'CL',
      active: org.active,
      employeeCount: org.employeeCount ?? '',
      annualRevenueMillionClp: org.annualRevenueMillionClp ?? ''
    })
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        employeeCount: form.employeeCount === '' ? null : Number(form.employeeCount),
        annualRevenueMillionClp: form.annualRevenueMillionClp === '' ? null : Number(form.annualRevenueMillionClp)
      }
      if (editing) {
        const { data } = await api.patch(`/organizations/${editing._id}`, payload)
        setOrgs((prev) => prev.map((o) => (o._id === data._id ? data : o)))
      } else {
        const { data } = await api.post('/organizations', payload)
        setOrgs((prev) => [...prev, data])
      }
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Organizaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">{orgs.length} registradas</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#0068ec] hover:bg-[#005acc] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva organización
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No hay organizaciones aún.</p>
          <button onClick={openCreate} className="text-sm text-green-600 hover:underline mt-1">
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nombre', 'RUT', 'Industria', 'País', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr key={org._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-500">{org.taxId || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{org.industry || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{org.country}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      org.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {org.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(org)}
                      className="text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editing ? 'Editar organización' : 'Nueva organización'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                  placeholder="Acme S.A."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT / Tax ID</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                    placeholder="76.123.456-7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                  <input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                    placeholder="CL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
                <input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                  placeholder="Manufactura, Retail, Minería..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° empleados</label>
                  <input
                    type="number"
                    min="0"
                    value={form.employeeCount}
                    onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingreso anual (millón CLP)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.annualRevenueMillionClp}
                    onChange={(e) => setForm({ ...form, annualRevenueMillionClp: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0068ec] focus:border-transparent"
                    placeholder="1200"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">Opcional — se usa para calcular las intensidades de carbono (tCO₂e/empleado, tCO₂e/millón CLP).</p>

              {editing && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.active}
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className="text-sm text-gray-700">{form.active ? 'Activa' : 'Inactiva'}</span>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#0068ec] hover:bg-[#005acc] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
