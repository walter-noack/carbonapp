const puppeteer = require('puppeteer')

const SCOPE_LABELS = { 1: 'Alcance 1 — Emisiones directas', 2: 'Alcance 2 — Electricidad comprada', 3: 'Alcance 3 — Emisiones indirectas' }
const CATEGORY_LABELS = {
  combustion_estacionaria: 'Combustión estacionaria',
  combustion_movil: 'Combustión móvil',
  fugitivas: 'Emisiones fugitivas',
  electricidad: 'Electricidad',
  bienes_servicios: 'Bienes y servicios comprados',
  bienes_capital: 'Bienes de capital',
  transporte_upstream: 'Transporte y distribución upstream',
  upstream_combustible_energia: 'Actividades de combustible y energía (upstream)',
  residuos: 'Residuos',
  viajes_negocio: 'Viajes de negocios',
  desplazamiento_empleados: 'Desplazamiento de empleados'
}
const NON_EVALUATED_LABELS = {
  cat_2: 'Cat. 2 — Bienes de capital',
  cat_3: 'Cat. 3 — Actividades relacionadas con combustible y energía (upstream)',
  cat_8: 'Cat. 8 — Activos arrendados upstream',
  cat_9: 'Cat. 9 — Transporte y distribución downstream',
  cat_10: 'Cat. 10 — Procesamiento de productos vendidos',
  cat_11: 'Cat. 11 — Uso de productos vendidos',
  cat_12: 'Cat. 12 — Fin de vida de productos vendidos',
  cat_13: 'Cat. 13 — Activos arrendados downstream',
  cat_14: 'Cat. 14 — Franquicias',
  cat_15: 'Cat. 15 — Inversiones'
}

const RECOMMENDATIONS_BY_SCOPE = {
  1: [
    'Sustituir equipos de combustión antigua por tecnología de alta eficiencia energética.',
    'Evaluar la transición a combustibles de menor intensidad carbónica (gas natural, biogás) o electrificación de flota.',
    'Implementar un protocolo periódico de detección y reparación de fugas de refrigerante.'
  ],
  2: [
    'Instalar paneles solares fotovoltaicos para autoconsumo y reducir la dependencia de la red.',
    'Realizar auditorías energéticas para identificar equipos de alto consumo.',
    'Implementar un sistema de gestión de energía (SGE / ISO 50001).'
  ],
  3: [
    'Priorizar proveedores con menor huella de carbono declarada en las categorías de mayor gasto.',
    'Implementar un programa de segregación y reciclaje para desviar residuos del relleno sanitario.',
    'Establecer una política de viajes y desplazamiento que priorice medios de bajo impacto.'
  ]
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = (n, d = 3) => Number(n ?? 0).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d })

const baseStyles = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; font-size: 12px; }
    .page { padding: 36px 40px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #005429; }
    h2 { font-size: 16px; margin: 24px 0 10px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 13px; margin: 16px 0 6px; color: #374151; }
    p { line-height: 1.5; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 11px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #4b5563; text-transform: uppercase; font-size: 9px; letter-spacing: 0.03em; }
    .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center; }
    .cover .brand { color: #73c91b; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; margin-bottom: 40px; }
    .cover h1 { font-size: 30px; margin-bottom: 8px; }
    .cover .meta { color: #6b7280; margin-top: 24px; font-size: 13px; }
    .stat-grid { display: flex; gap: 12px; margin: 16px 0; }
    .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .stat .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .stat .value { font-size: 20px; font-weight: 700; color: #111827; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .bar-label { width: 140px; font-size: 11px; color: #4b5563; flex-shrink: 0; }
    .bar-track { flex: 1; background: #f3f4f6; border-radius: 4px; height: 14px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .bar-value { width: 90px; text-align: right; font-size: 11px; font-weight: 600; flex-shrink: 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .footer-note { font-size: 9px; color: #9ca3af; margin-top: 24px; }
    ul { padding-left: 18px; margin: 6px 0; }
    li { margin-bottom: 4px; }
  </style>
`

const scopeBarChart = (totals) => {
  const max = Math.max(totals.scope1, totals.scope2, totals.scope3, 0.0001)
  const colors = { 1: '#f97316', 2: '#eab308', 3: '#a855f7' }
  return [1, 2, 3].map((s) => {
    const value = totals[`scope${s}`]
    const pct = Math.max((value / max) * 100, value > 0 ? 2 : 0)
    return `
      <div class="bar-row">
        <div class="bar-label">Alcance ${s}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${colors[s]}"></div></div>
        <div class="bar-value">${fmt(value)} tCO₂e</div>
      </div>`
  }).join('')
}

// El año de publicación de la fuente (ej. "IPCC 2006", "DEFRA 2023") viene
// embebido en el texto de factorSource — es más confiable que la fecha de
// creación del registro en la DB, que solo indica cuándo se ingresó el dato.
const extractSourceYear = (factorSource) => {
  const match = String(factorSource || '').match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

const dominantScope = (totals) => {
  const entries = [[1, totals.scope1], [2, totals.scope2], [3, totals.scope3]]
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

const sourcesTableRows = (sources) => sources.map((s) => `
  <tr>
    <td>Alcance ${s.scope}</td>
    <td>${esc(CATEGORY_LABELS[s.category] || s.category)}</td>
    <td>${esc(s.label)}</td>
    <td>${fmt(s.activityValue, 2)} ${esc(s.unit)}</td>
    <td>${fmt(s.emissionFactor, 4)}</td>
    <td>${fmt(s.co2e, 4)}</td>
  </tr>`).join('')

const factorsTableRows = (sources) => {
  const seen = new Set()
  return sources.filter((s) => {
    const key = `${s.category}|${s.activityType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((s) => `
    <tr>
      <td>${esc(s.label)}</td>
      <td>${fmt(s.emissionFactor, 4)}</td>
      <td>${esc(s.unit)}</td>
      <td>${esc(s.factorSource || '—')}</td>
      <td>${extractSourceYear(s.factorSource) ?? '—'}</td>
    </tr>`).join('')
}

// ── Reporte PDF interno ────────────────────────────────────────────────────
const buildInternalReportHtml = ({ org, period, sources, nonEvaluatedCategories }) => {
  const totals = period.totals
  const dominant = dominantScope(totals)
  const recommendations = RECOMMENDATIONS_BY_SCOPE[dominant]
  const generatedDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!doctype html><html><head><meta charset="utf-8">${baseStyles}</head><body>
    <div class="page cover">
      <div class="brand">CARBONAPP · AMBIENTAPP</div>
      <h1>Reporte de Huella de Carbono</h1>
      <p style="font-size:16px; color:#374151;">${esc(org.name)}</p>
      <p style="color:#6b7280;">Período ${period.year} · GHG Protocol (Scope 1, 2 y 3)</p>
      <div class="meta">Generado el ${generatedDate}</div>
    </div>

    <div class="page">
      <h1>Resumen ejecutivo</h1>
      <div class="stat-grid">
        <div class="stat"><div class="label">Alcance 1</div><div class="value">${fmt(totals.scope1)}</div></div>
        <div class="stat"><div class="label">Alcance 2</div><div class="value">${fmt(totals.scope2)}</div></div>
        <div class="stat"><div class="label">Alcance 3</div><div class="value">${fmt(totals.scope3)}</div></div>
        <div class="stat" style="background:#111827; border-color:#111827;"><div class="label" style="color:#9ca3af;">Total</div><div class="value" style="color:#fff;">${fmt(totals.total)}</div></div>
      </div>
      <p style="color:#6b7280; font-size:11px;">Todos los valores en toneladas de CO₂ equivalente (tCO₂e).</p>
      <h2>Distribución por alcance</h2>
      ${scopeBarChart(totals)}

      <h2>Top 3 recomendaciones</h2>
      <p style="color:#6b7280;">Basadas en el alcance dominante de este inventario (Alcance ${dominant}).</p>
      <ul>${recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    </div>

    <div class="page">
      <h1>Inventario detallado</h1>
      <table>
        <thead><tr><th>Alcance</th><th>Categoría</th><th>Actividad</th><th>Dato de actividad</th><th>Factor (kgCO₂e/u)</th><th>tCO₂e</th></tr></thead>
        <tbody>${sourcesTableRows(sources)}</tbody>
      </table>

      <h2>Factores de emisión utilizados</h2>
      <table>
        <thead><tr><th>Actividad</th><th>Factor</th><th>Unidad</th><th>Fuente</th><th>Año</th></tr></thead>
        <tbody>${factorsTableRows(sources)}</tbody>
      </table>

      <h2>Categorías Scope 3 no evaluadas</h2>
      ${nonEvaluatedCategories.length === 0
        ? '<p style="color:#6b7280;">No se declararon categorías no evaluadas.</p>'
        : `<ul>${nonEvaluatedCategories.map((c) => `<li><strong>${esc(NON_EVALUATED_LABELS[c.category] || c.category)}:</strong> ${esc(c.justification)}</li>`).join('')}</ul>`}

      <p class="footer-note">Reporte generado automáticamente por CarbonApp. No constituye certificación oficial — el sello HuellaChile lo emite el Ministerio del Medio Ambiente tras revisión del expediente.</p>
    </div>
  </body></html>`
}

// ── Expediente HuellaChile ─────────────────────────────────────────────────
const apaReference = (source, year) => {
  if (!source) return 'Fuente no especificada.'
  if (source.includes('IPCC')) return `IPCC (${year || 's.f.'}). ${source}.`
  if (source.includes('DEFRA')) return `DEFRA (${year || '2023'}). Greenhouse gas reporting: conversion factors. UK Department for Environment, Food & Rural Affairs.`
  if (source.includes('Ministerio de Energía') || source.includes('CNE')) return `Ministerio de Energía de Chile (${year || 's.f.'}). Factor de emisión del Sistema Eléctrico Nacional.`
  return `${source} (${year || 's.f.'}).`
}

const buildHuellaChileHtml = ({ org, period, sources, nonEvaluatedCategories }) => {
  const totals = period.totals
  const generatedDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
  const seen = new Set()
  const uniqueFactors = sources.filter((s) => {
    const key = `${s.category}|${s.activityType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return `<!doctype html><html><head><meta charset="utf-8">${baseStyles}</head><body>
    <div class="page">
      <h1>Expediente HuellaChile</h1>
      <p style="color:#6b7280;">Programa HuellaChile — Ministerio del Medio Ambiente de Chile</p>

      <h2>1. Formulario de inventario</h2>
      <table>
        <tbody>
          <tr><th style="width:220px;">Razón social</th><td>${esc(org.name)}</td></tr>
          <tr><th>RUT</th><td>${esc(org.taxId || '—')}</td></tr>
          <tr><th>Rubro / Industria</th><td>${esc(org.industry || '—')}</td></tr>
          <tr><th>Período reportado</th><td>${period.year}</td></tr>
          <tr><th>Emisiones totales</th><td>${fmt(totals.total)} tCO₂e</td></tr>
          <tr><th>Alcance 1</th><td>${fmt(totals.scope1)} tCO₂e</td></tr>
          <tr><th>Alcance 2</th><td>${fmt(totals.scope2)} tCO₂e</td></tr>
          <tr><th>Alcance 3</th><td>${fmt(totals.scope3)} tCO₂e</td></tr>
        </tbody>
      </table>

      <h2>2. Declaración de límites organizacionales</h2>
      <p>${esc(org.name)} reporta su inventario de Gases de Efecto Invernadero bajo el enfoque de <strong>control operacional</strong>,
      incluyendo las instalaciones y actividades sobre las cuales la organización ejerce control operacional directo, conforme al GHG Protocol Corporate Standard.</p>

      <h2>3. Declaración de límites operacionales</h2>
      <p>Se incluyen en este inventario: Alcance 1 (emisiones directas), Alcance 2 (electricidad comprada, enfoque location-based)
      y Alcance 3 en las categorías 1, 4, 5, 6 y 7${nonEvaluatedCategories.length > 0 ? ', junto con la categoría 2 y/o 3 según corresponda' : ''}.</p>
      ${nonEvaluatedCategories.length > 0 ? `
        <h3>Categorías Scope 3 declaradas como no evaluadas</h3>
        <ul>${nonEvaluatedCategories.map((c) => `<li><strong>${esc(NON_EVALUATED_LABELS[c.category] || c.category)}:</strong> ${esc(c.justification)}</li>`).join('')}</ul>
      ` : ''}
    </div>

    <div class="page">
      <h2>4. Tabla de datos de actividad por categoría</h2>
      <table>
        <thead><tr><th>Alcance</th><th>Categoría</th><th>Actividad</th><th>Dato de actividad</th><th>Unidad</th><th>tCO₂e</th></tr></thead>
        <tbody>${sourcesTableRows(sources)}</tbody>
      </table>

      <h2>5. Tabla de factores de emisión — referencias bibliográficas (APA)</h2>
      <table>
        <thead><tr><th>Factor</th><th>Valor</th><th>Unidad</th><th>Referencia (APA)</th></tr></thead>
        <tbody>${uniqueFactors.map((s) => `
          <tr>
            <td>${esc(s.label)}</td>
            <td>${fmt(s.emissionFactor, 4)}</td>
            <td>${esc(s.unit)}</td>
            <td>${esc(apaReference(s.factorSource, extractSourceYear(s.factorSource)))}</td>
          </tr>`).join('')}</tbody>
      </table>

      <h2>6. Checklist de documentación complementaria</h2>
      <ul>
        <li>Facturas de consumo eléctrico del período reportado</li>
        <li>Facturas o guías de despacho de combustibles (diesel, gasolina, GLP, gas natural)</li>
        <li>Registros de recarga de gases refrigerantes (órdenes de servicio)</li>
        <li>Comprobantes de disposición/valorización de residuos (Ley REP / SINADER)</li>
        <li>Registros de viajes de negocios (pasajes, liquidaciones de gastos de viaje)</li>
        <li>Nómina de empleados del período (para Cat. 7 — desplazamiento)</li>
        <li>Estados financieros o reporte de ventas del período (para intensidad de carbono)</li>
      </ul>

      <p class="footer-note">Expediente generado por CarbonApp el ${generatedDate}. Este documento prepara la información para el programa HuellaChile;
      el sello oficial lo emite el Ministerio del Medio Ambiente tras su revisión. Formato pendiente de validación final con MMA.</p>
    </div>
  </body></html>`
}

const renderPdf = async (html) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const bytes = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0' } })
    return Buffer.from(bytes)
  } finally {
    await browser.close()
  }
}

module.exports = { buildInternalReportHtml, buildHuellaChileHtml, renderPdf, CATEGORY_LABELS, NON_EVALUATED_LABELS, extractSourceYear }
