const XLSX = require('xlsx')
const { CATEGORY_LABELS, NON_EVALUATED_LABELS, extractSourceYear } = require('./reportService')

// Genera el libro Excel con las tablas requeridas para subir al portal HuellaChile:
// resumen, datos de actividad por categoría, factores utilizados y categorías no evaluadas.
const buildHuellaChileWorkbook = ({ org, period, sources, nonEvaluatedCategories }) => {
  const wb = XLSX.utils.book_new()

  const resumenSheet = XLSX.utils.aoa_to_sheet([
    ['Expediente HuellaChile'],
    ['Razón social', org.name],
    ['RUT', org.taxId || ''],
    ['Rubro', org.industry || ''],
    ['Período', period.year],
    [],
    ['Alcance', 'tCO2eq'],
    ['Alcance 1', period.totals.scope1],
    ['Alcance 2', period.totals.scope2],
    ['Alcance 3', period.totals.scope3],
    ['Total', period.totals.total]
  ])
  XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen')

  const activityRows = [
    ['Alcance', 'Categoría', 'Actividad', 'Descripción', 'Dato de actividad', 'Unidad', 'Factor (kgCO2e/u)', 'tCO2e'],
    ...sources.map((s) => [
      s.scope,
      CATEGORY_LABELS[s.category] || s.category,
      s.label,
      s.description || '',
      s.activityValue,
      s.unit,
      s.emissionFactor,
      s.co2e
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(activityRows), 'Datos de actividad')

  const seen = new Set()
  const factorRows = [
    ['Actividad', 'Valor', 'Unidad', 'Fuente', 'Año'],
    ...sources.filter((s) => {
      const key = `${s.category}|${s.activityType}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map((s) => [s.label, s.emissionFactor, s.unit, s.factorSource || '', extractSourceYear(s.factorSource) ?? ''])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(factorRows), 'Factores')

  const nonEvalRows = [
    ['Categoría', 'Justificación'],
    ...nonEvaluatedCategories.map((c) => [NON_EVALUATED_LABELS[c.category] || c.category, c.justification])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nonEvalRows), 'No evaluadas')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { buildHuellaChileWorkbook }
