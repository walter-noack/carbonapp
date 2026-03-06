import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const STATUS_LABEL = { draft: 'Borrador', completed: 'Completado' }
const STATUS_STYLE = {
  draft: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700'
}

const SCOPE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [calcs, setCalcs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/calculations')
      .then(res => setCalcs(res.data))
      .finally(() => setLoading(false))
  }, [])

  const total = calcs.length
  const completed = calcs.filter(c => c.status === 'completed').length
  const drafts = calcs.filter(c => c.status === 'draft').length
  const totalCo2 = calcs.reduce((sum, c) => sum + (c.totals?.total || 0), 0)

  const recent = [...calcs].slice(0, 5)

  // Trend: completed calcs sorted by year
  const trendData = [...calcs]
    .filter(c => c.status === 'completed')
    .sort((a, b) => a.year - b.year)
    .map(c => ({ year: String(c.year), total: c.totals?.total || 0 }))

  // Scope breakdown of latest completed calc
  const latestCompleted = [...calcs]
    .filter(c => c.status === 'completed')
    .sort((a, b) => b.year - a.year)[0]

  const scopeData = latestCompleted
    ? [
        { name: 'Alcance 1', value: latestCompleted.totals?.scope1 || 0 },
        { name: 'Alcance 2', value: latestCompleted.totals?.scope2 || 0 },
        { name: 'Alcance 3', value: latestCompleted.totals?.scope3 || 0 },
      ].filter(d => d.value > 0)
    : []

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bienvenido, {user?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{user?.org?.name}</p>
        </div>
        {user?.org && (
          <button
            onClick={() => navigate('/dashboard/calculations')}
            className="bg-[#0068ec] hover:bg-[#005acc] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo cálculo
          </button>
        )}
      </div>

      {!user?.org ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">Sin organización asignada</p>
          <p className="text-sm text-amber-700 mt-1">Contacta al administrador para que te asigne a una organización.</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Cálculos totales</p>
              <p className="text-2xl font-semibold text-gray-900">{total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Completados</p>
              <p className="text-2xl font-semibold text-green-700">{completed}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">En borrador</p>
              <p className="text-2xl font-semibold text-amber-600">{drafts}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">tCO₂e acumulado</p>
              <p className="text-2xl font-semibold text-gray-900">{totalCo2.toFixed(1)}</p>
            </div>
          </div>

          {/* Charts row */}
          {(trendData.length > 0 || scopeData.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

              {/* Trend chart */}
              {trendData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-4">Evolución de emisiones (tCO₂e)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={trendData} barSize={trendData.length === 1 ? 40 : undefined}>
                      <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={45} />
                      <Tooltip
                        formatter={(v) => [`${v.toFixed(2)} tCO₂e`, 'Total']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Scope breakdown of latest calc */}
              {scopeData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">Desglose por alcance</p>
                    <span className="text-xs text-gray-400">Año {latestCompleted.year}</span>
                  </div>
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={scopeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {scopeData.map((_, i) => (
                            <Cell key={i} fill={SCOPE_COLORS[i % SCOPE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [`${v.toFixed(2)} tCO₂e`]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
                    {scopeData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SCOPE_COLORS[i] }} />
                        <span className="text-xs text-gray-500">{d.name}</span>
                        <span className="text-xs font-medium text-gray-900">{d.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">Total: <span className="font-semibold text-gray-700">{(latestCompleted.totals?.total || 0).toFixed(2)} tCO₂e</span></p>
                </div>
              )}
            </div>
          )}

          {/* Cálculos recientes */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Cálculos recientes</h3>
              <button
                onClick={() => navigate('/dashboard/calculations')}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Ver todos →
              </button>
            </div>

            {calcs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400 mb-3">Aún no hay cálculos registrados.</p>
                <button
                  onClick={() => navigate('/dashboard/calculations')}
                  className="bg-[#0068ec] hover:bg-[#005acc] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Crear el primero
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Año', 'Alcance 1', 'Alcance 2', 'Alcance 3', 'Total tCO₂e', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(c => (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/dashboard/calculations/${c._id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{c.year}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.totals.scope1.toFixed(3)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.totals.scope2.toFixed(3)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.totals.scope3.toFixed(3)}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{c.totals.total.toFixed(3)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
