import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { Copy, Check, Download, ChevronDown, ChevronUp } from 'lucide-react'

const SCOPE_COLORS = { 1: '#f97316', 2: '#eab308', 3: '#a855f7' }
const CATEGORY_LABELS = {
  combustion_estacionaria: 'Comb. estacionaria',
  combustion_movil: 'Comb. móvil',
  fugitivas: 'Fugitivas',
  electricidad: 'Electricidad',
  residuos: 'Residuos',
  viajes_negocio: 'Viajes negocio',
  desplazamiento_empleados: 'Desplazamiento'
}

const CATEGORY_SCOPE = {
  combustion_estacionaria: 1, combustion_movil: 1, fugitivas: 1,
  electricidad: 2,
  residuos: 3, viajes_negocio: 3, desplazamiento_empleados: 3,
}

const COMPLEXITY_STYLE = {
  bajo:  'bg-green-100 text-green-700',
  medio: 'bg-amber-100 text-amber-700',
  alto:  'bg-red-100 text-red-700',
}

// { text, reduction, complexity: 'bajo'|'medio'|'alto' }
const RECOMMENDATIONS = {
  combustion_estacionaria: [
    { text: 'Sustituir equipos de combustión antigua por tecnología de alta eficiencia energética.',            reduction: '15-30%',          complexity: 'alto'  },
    { text: 'Evaluar la transición a gas natural o biogás como combustible de menor intensidad carbónica.',    reduction: '20-40%',          complexity: 'alto'  },
    { text: 'Implementar mantenimiento preventivo de calderas y quemadores para reducir consumo.',             reduction: '5-15%',           complexity: 'bajo'  },
  ],
  combustion_movil: [
    { text: 'Incorporar vehículos eléctricos o híbridos en la flota de la organización.',                     reduction: '30-70%',          complexity: 'alto'  },
    { text: 'Implementar un programa de conducción eficiente (eco-driving) para los conductores.',             reduction: '5-15%',           complexity: 'bajo'  },
    { text: 'Optimizar rutas y consolidar viajes para reducir los kilómetros recorridos.',                    reduction: '10-20%',          complexity: 'medio' },
  ],
  fugitivas: [
    { text: 'Reemplazar refrigerantes de alto GWP (R-410A, R-404A) por alternativas de bajo impacto como R-32 o CO₂.', reduction: '50-80%', complexity: 'alto'  },
    { text: 'Establecer un protocolo periódico de detección y reparación de fugas de refrigerante.',          reduction: '10-30%',          complexity: 'medio' },
    { text: 'Mantener un registro detallado de recargas para identificar equipos con pérdidas recurrentes.',  reduction: '5-15%',           complexity: 'bajo'  },
    { text: 'Planificar el retiro progresivo de equipos con R-22 (sustancia controlada bajo el Protocolo de Montreal).', reduction: '100%', complexity: 'alto'  },
  ],
  electricidad: [
    { text: 'Instalar paneles solares fotovoltaicos para autoconsumo y reducir la dependencia de la red.',    reduction: '20-40%',          complexity: 'alto'  },
    { text: 'Realizar auditorías energéticas para identificar equipos de alto consumo y oportunidades de mejora.', reduction: '10-20%',     complexity: 'bajo'  },
    { text: 'Implementar un sistema de gestión de energía (SGE / ISO 50001).',                                reduction: '15-25%',          complexity: 'medio' },
    { text: 'Reemplazar iluminación por tecnología LED e instalar sensores de ocupación.',                    reduction: '5-10%',           complexity: 'bajo'  },
  ],
  residuos: [
    { text: 'Implementar un programa de segregación en origen y reciclaje para desviar residuos del relleno sanitario.', reduction: '20-40%', complexity: 'medio' },
    { text: 'Establecer compostaje o digestión anaeróbica para la fracción de residuos orgánicos.',           reduction: '30-50%',          complexity: 'medio' },
    { text: 'Adoptar principios de economía circular para reducir la generación de residuos en la fuente.',   reduction: '10-30%',          complexity: 'medio' },
    { text: 'Registrarse en SINADER y cumplir con la Ley REP (N° 20.920) para los productos prioritarios que apliquen a la organización.', reduction: '10-20%', complexity: 'medio' },
    { text: 'Contratar gestores autorizados bajo la Ley REP para garantizar la trazabilidad y valorización de envases, lubricantes, neumáticos u otros productos prioritarios.', reduction: '5-15%', complexity: 'bajo' },
    { text: 'Realizar un diagnóstico de residuos para identificar productos prioritarios bajo Ley REP y establecer metas de valorización.', reduction: '15-25%', complexity: 'bajo' },
  ],
  viajes_negocio: [
    { text: 'Priorizar reuniones virtuales y reducir viajes aéreos no esenciales.',                           reduction: '30-60%',          complexity: 'bajo'  },
    { text: 'Establecer una política de viajes que exija justificación para vuelos domésticos.',              reduction: '20-40%',          complexity: 'bajo'  },
    { text: 'Optar por tren o bus interurbano cuando la distancia y el tiempo lo permitan.',                  reduction: '60-80%',          complexity: 'medio' },
    { text: 'Compensar las emisiones inevitables de viajes mediante proyectos verificados (Gold Standard, VCS).', reduction: '100% compensado', complexity: 'medio' },
  ],
  desplazamiento_empleados: [
    { text: 'Implementar política de teletrabajo para reducir los desplazamientos diarios.',                  reduction: '30-70%',          complexity: 'bajo'  },
    { text: 'Fomentar y subsidiar el uso del transporte público entre los empleados.',                        reduction: '60-80%',          complexity: 'medio' },
    { text: 'Crear un programa de carpooling (auto compartido) entre empleados que vivan en zonas cercanas.', reduction: '20-40%',          complexity: 'bajo'  },
    { text: 'Habilitar estacionamientos para bicicletas y duchas para fomentar el uso de medios activos.',    reduction: '10-20%',          complexity: 'bajo'  },
  ],
}

function StatCard({ label, value, color }) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value.toFixed(3)}</p>
      <p className="text-xs text-gray-500">tCO₂e</p>
    </div>
  )
}

const DONUT_RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * DONUT_RADIAN)
  const y = cy + r * Math.sin(-midAngle * DONUT_RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function CalculationResults() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const basePath = user?.role === 'admin' ? '/admin' : '/dashboard'

  const [calc, setCalc] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [openScopes, setOpenScopes] = useState(new Set([1, 2, 3]))
  const pieRef = useRef(null)
  const barRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get(`/calculations/${id}`),
      api.get(`/calculations/${id}/entries`)
    ]).then(([calcRes, entriesRes]) => {
      setCalc(calcRes.data)
      setEntries(entriesRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  // Datos para gráfico de torta (distribución por alcance)
  const scopePieData = calc ? [
    { name: 'Alcance 1', value: calc.totals.scope1, color: SCOPE_COLORS[1] },
    { name: 'Alcance 2', value: calc.totals.scope2, color: SCOPE_COLORS[2] },
    { name: 'Alcance 3', value: calc.totals.scope3, color: SCOPE_COLORS[3] }
  ].filter(d => d.value > 0) : []

  // Datos para gráfico de barras (por categoría)
  const categoryMap = {}
  entries.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.co2e
  })
  const categoryBarData = Object.entries(categoryMap)
    .map(([cat, value]) => ({ name: CATEGORY_LABELS[cat] || cat, value: parseFloat(value.toFixed(4)), category: cat }))
    .sort((a, b) => b.value - a.value)

  // Categorías ordenadas por emisión para recomendaciones
  const topCategories = categoryBarData.map(d => d.category)

  // Exportar CSV
  const buildCsv = useCallback(() => {
    const rows = [
      ['Alcance', 'Categoría', 'Actividad', 'Descripción', 'Cantidad', 'Unidad', 'Factor (kgCO2e/u)', 'tCO2e'],
      ...entries.map(e => [
        `Alcance ${e.scope}`,
        CATEGORY_LABELS[e.category] || e.category,
        e.label,
        e.description || '',
        e.activityValue,
        e.unit,
        e.emissionFactor,
        e.co2e.toFixed(4)
      ])
    ]
    return rows.map(r => r.join('\t')).join('\n')
  }, [entries])

  const exportChartAsPng = useCallback((containerRef, filename) => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const { width, height } = svg.getBoundingClientRect()
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2 // resolución 2x
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.download = filename
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = url
  }, [])

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(buildCsv())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silencioso */ }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>
  if (!calc) return <div className="p-6 text-sm text-gray-500">Cálculo no encontrado.</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl w-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/calculations/${id}`)}
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 block"
        >
          ← Volver al cálculo
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          Resultados — {calc.org?.name} {calc.year}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">Análisis de huella de carbono · GHG Protocol</p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Alcance 1" value={calc.totals.scope1} color="border-orange-200 bg-orange-50" />
        <StatCard label="Alcance 2" value={calc.totals.scope2} color="border-yellow-200 bg-yellow-50" />
        <StatCard label="Alcance 3" value={calc.totals.scope3} color="border-purple-200 bg-purple-50" />
        <div className="border border-gray-900 bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-semibold text-white">{calc.totals.total.toFixed(3)}</p>
          <p className="text-xs text-gray-400">tCO₂e</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Donut — distribución por alcance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Distribución por alcance</h3>
            <button
              onClick={() => exportChartAsPng(pieRef, `distribucion-alcances-${calc?.year}.png`)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PNG
            </button>
          </div>
          {scopePieData.length > 0 ? (
            <div ref={pieRef}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={scopePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="value"
                    labelLine={false}
                    label={CustomLabel}
                  >
                    {scopePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v.toFixed(3)} tCO₂e`, '']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">Sin datos</p>
          )}
        </div>

        {/* Bar — emisiones por categoría */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Emisiones por categoría (tCO₂e)</h3>
            <button
              onClick={() => exportChartAsPng(barRef, `emisiones-categoria-${calc?.year}.png`)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PNG
            </button>
          </div>
          {categoryBarData.length > 0 ? (
            <div ref={barRef}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(2)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    formatter={(v) => [`${v.toFixed(4)} tCO₂e`, 'Emisiones']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">Sin datos</p>
          )}
        </div>
      </div>

      {/* Tabla exportable */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Datos detallados</h3>
            <p className="text-xs text-gray-400 mt-0.5">Copia la tabla para pegar en Excel u hojas de cálculo</p>
          </div>
          <button
            onClick={handleCopyData}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar tabla'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Alcance', 'Categoría', 'Actividad', 'Descripción', 'Cantidad', 'Unidad', 'Factor kgCO₂e/u', 'tCO₂e'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map(e => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500">Alcance {e.scope}</td>
                  <td className="px-4 py-2.5 text-gray-600">{CATEGORY_LABELS[e.category] || e.category}</td>
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{e.label}</td>
                  <td className="px-4 py-2.5 text-gray-400">{e.description || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{e.activityValue.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{e.unit}</td>
                  <td className="px-4 py-2.5 text-gray-500">{e.emissionFactor}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{e.co2e.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={7} className="px-4 py-2.5 text-xs font-semibold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{calc.totals.total.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-white border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recomendaciones de reducción</h3>
          <p className="text-xs text-gray-400 mt-0.5">Organizadas por alcance · ordenadas por categorías de mayores emisiones</p>
        </div>

        {[1, 2, 3].map(scope => {
          const scopeCats = topCategories.filter(cat =>
            CATEGORY_SCOPE[cat] === scope && RECOMMENDATIONS[cat]
          )
          if (scopeCats.length === 0) return null
          const isOpen = openScopes.has(scope)
          const scopeTotal = scopeCats.reduce((sum, cat) =>
            sum + (categoryBarData.find(d => d.category === cat)?.value || 0), 0)
          const scopeColors = {
            1: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
            2: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
            3: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
          }
          const sc = scopeColors[scope]

          return (
            <div key={scope} className={`border-b border-gray-100 last:border-0`}>
              {/* Scope header — toggle */}
              <button
                onClick={() => setOpenScopes(prev => {
                  const next = new Set(prev)
                  next.has(scope) ? next.delete(scope) : next.add(scope)
                  return next
                })}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50 ${isOpen ? sc.bg : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                    Alcance {scope}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {scope === 1 ? 'Emisiones directas' : scope === 2 ? 'Electricidad comprada' : 'Emisiones indirectas'}
                  </span>
                  <span className="text-xs text-gray-400">{scopeTotal.toFixed(3)} tCO₂e</span>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                }
              </button>

              {/* Categories + recommendations */}
              {isOpen && (
                <div className="px-5 py-4 space-y-5 bg-white">
                  {scopeCats.map((cat, i) => (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-5 h-5 rounded-full ${sc.dot} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span className="text-xs text-gray-400">
                          {categoryBarData.find(d => d.category === cat)?.value.toFixed(3)} tCO₂e
                        </span>
                      </div>
                      <div className="space-y-2 pl-7">
                        {RECOMMENDATIONS[cat].map((rec, j) => (
                          <div key={j} className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-2">
                            <p className="text-sm text-gray-700 leading-snug">{rec.text}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                Reducción estimada: {rec.reduction}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-md ${COMPLEXITY_STYLE[rec.complexity]}`}>
                                Complejidad: {rec.complexity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {topCategories.filter(cat => RECOMMENDATIONS[cat]).length === 0 && (
          <p className="px-5 py-6 text-sm text-gray-400 bg-white">No hay recomendaciones disponibles para las categorías registradas.</p>
        )}
      </div>
    </div>
  )
}
