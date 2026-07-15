const round = (n) => Math.round(n * 1000) / 1000

// Suma emisiones por alcance (S1, S2, S3) y total general en tCO2eq
const sumByScope = (sources) => {
  const t = { scope1: 0, scope2: 0, scope3: 0 }
  sources.forEach((s) => {
    if (s.scope === 1) t.scope1 += s.co2e
    else if (s.scope === 2) t.scope2 += s.co2e
    else if (s.scope === 3) t.scope3 += s.co2e
  })
  return {
    scope1: round(t.scope1),
    scope2: round(t.scope2),
    scope3: round(t.scope3),
    total: round(t.scope1 + t.scope2 + t.scope3)
  }
}

// Suma por categoría dentro de Scope 3 (o cualquier alcance)
const sumByCategory = (sources) => {
  const map = {}
  sources.forEach((s) => {
    map[s.category] = round((map[s.category] || 0) + s.co2e)
  })
  return map
}

// Intensidades de carbono: tCO2eq/empleado y tCO2eq/millón CLP de ingreso.
// null cuando la organización no declaró el denominador correspondiente.
const computeIntensities = (totals, org) => {
  const employeeCount = org?.employeeCount
  const revenue = org?.annualRevenueMillionClp
  return {
    perEmployee: employeeCount ? round(totals.total / employeeCount) : null,
    perMillionClpRevenue: revenue ? round(totals.total / revenue) : null
  }
}

// Top N fuentes de emisión ordenadas por tCO2eq descendente
const topSources = (sources, n = 5) => {
  return [...sources].sort((a, b) => b.co2e - a.co2e).slice(0, n)
}

module.exports = { round, sumByScope, sumByCategory, computeIntensities, topSources }
