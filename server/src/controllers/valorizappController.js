const InventoryPeriod = require('../models/InventoryPeriod')
const EmissionSource = require('../models/EmissionSource')
const EmissionFactor = require('../models/EmissionFactor')
const { getWasteSummary } = require('../services/valorizappClient')
const { mapWasteSummaryToSources } = require('../services/valorizappMapper')
const { recalculateTotals } = require('./inventoryPeriodController')

// GET /api/inventory-periods/:id/valorizapp-preview
// Previsualiza qué se importaría desde Valorizapp sin guardar nada.
const previewImport = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }

    const { resumen } = await getWasteSummary(period.org, period.year)
    const { candidates, skipped } = mapWasteSummaryToSources(resumen)

    const preview = []
    for (const c of candidates) {
      const factor = await EmissionFactor.findOne({ scope: 3, category: 'residuos', activityType: c.activityType, active: true })
      if (!factor) continue
      preview.push({
        activityType: c.activityType,
        label: factor.label,
        activityValue: c.activityValue,
        unit: factor.unit,
        co2e: Math.round((c.activityValue * factor.factor * (factor.gwp ?? 1) / 1000) * 10000) / 10000
      })
    }

    res.json({ preview, skipped })
  } catch (err) {
    res.status(502).json({ message: err.message || 'Error consultando Valorizapp' })
  }
}

// POST /api/inventory-periods/:id/import-valorizapp
// Importa los residuos de Valorizapp como EmissionSource (Scope 3 Cat. 5).
// Reemplaza las fuentes previamente auto-importadas del mismo período para
// evitar duplicados si se corre más de una vez.
const importFromValorizapp = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    if (period.status === 'completed') {
      return res.status(400).json({ message: 'No se pueden importar fuentes a un período completado' })
    }

    const { resumen } = await getWasteSummary(period.org, period.year)
    const { candidates, skipped } = mapWasteSummaryToSources(resumen)

    await EmissionSource.deleteMany({ inventoryPeriod: period._id, importedFrom: 'valorizapp' })

    const created = []
    for (const c of candidates) {
      const factor = await EmissionFactor.findOne({ scope: 3, category: 'residuos', activityType: c.activityType, active: true })
      if (!factor) continue

      const co2e = Math.round((c.activityValue * factor.factor * (factor.gwp ?? 1) / 1000) * 10000) / 10000
      const source = await EmissionSource.create({
        inventoryPeriod: period._id,
        org: period.org,
        scope: 3,
        category: 'residuos',
        activityType: c.activityType,
        label: factor.label,
        description: 'Importado automáticamente desde Valorizapp',
        activityValue: c.activityValue,
        unit: factor.unit,
        emissionFactor: factor.factor,
        gwp: factor.gwp ?? 1,
        factorSource: factor.source,
        co2e,
        importedFrom: 'valorizapp'
      })
      created.push(source)
    }

    const totals = await recalculateTotals(period._id)
    res.status(201).json({ imported: created, skipped, totals })
  } catch (err) {
    res.status(502).json({ message: err.message || 'Error consultando Valorizapp' })
  }
}

module.exports = { previewImport, importFromValorizapp }
