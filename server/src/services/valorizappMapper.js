// Traduce el resumen de residuos de Valorizapp (corrientes Ley REP) a
// candidatos de EmissionSource para Scope 3 Cat. 5, normalizando todo a kg.
// 'unidades' no se puede convertir a masa sin un factor de peso por unidad
// propio de cada corriente, así que esas filas se omiten y quedan para
// ingreso manual.
const KG_PER_LITRO = { aceites: 0.9 } // densidad aproximada aceite usado

const CORRIENTE_TO_ACTIVITY_TYPE = {
  envases: 'rep_envases',
  neumaticos: 'rep_neumaticos',
  aceites: 'rep_aceites',
  raee: 'rep_raee',
  pilas: 'rep_pilas'
}

const toKg = (corriente, unidad, cantidad) => {
  if (unidad === 'kg') return cantidad
  if (unidad === 'ton') return cantidad * 1000
  if (unidad === 'litros' && KG_PER_LITRO[corriente]) return cantidad * KG_PER_LITRO[corriente]
  return null // 'unidades', o 'litros' sin densidad conocida → no convertible
}

// Recibe el array 'resumen' del endpoint interno de Valorizapp y devuelve
// candidatos { activityType, activityValue (kg), skipped[] } listos para
// buscar su EmissionFactor y calcular co2e.
const mapWasteSummaryToSources = (resumen) => {
  const byActivityType = {}
  const skipped = []

  resumen.forEach((row) => {
    const kg = toKg(row.corriente, row.unidad, row.cantidadEntregada)
    const activityType = CORRIENTE_TO_ACTIVITY_TYPE[row.corriente]

    if (kg === null || !activityType) {
      skipped.push(row)
      return
    }
    byActivityType[activityType] = (byActivityType[activityType] || 0) + kg
  })

  const candidates = Object.entries(byActivityType).map(([activityType, activityValue]) => ({
    activityType,
    activityValue: Math.round(activityValue * 1000) / 1000
  }))

  return { candidates, skipped }
}

module.exports = { mapWasteSummaryToSources }
