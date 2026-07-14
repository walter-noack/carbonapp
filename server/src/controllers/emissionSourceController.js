const EmissionSource = require('../models/EmissionSource')
const InventoryPeriod = require('../models/InventoryPeriod')
const EmissionFactor = require('../models/EmissionFactor')
const { recalculateTotals } = require('./inventoryPeriodController')

const calcCo2e = (activityValue, factor, gwp) =>
  Math.round((activityValue * factor * gwp / 1000) * 10000) / 10000

const getEmissionSources = async (req, res) => {
  try {
    const sources = await EmissionSource.find({ inventoryPeriod: req.params.id }).sort({ scope: 1, createdAt: 1 })
    res.json(sources)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createEmissionSource = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    if (period.status === 'completed') {
      return res.status(400).json({ message: 'No se pueden agregar fuentes a un período completado' })
    }

    const { scope, category, activityType, description, activityValue } = req.body

    const factor = await EmissionFactor.findOne({ scope, category, activityType, active: true })
    if (!factor) return res.status(404).json({ message: 'Factor de emisión no encontrado' })

    const gwp = factor.gwp ?? 1
    // emisiones_tCO2eq = cantidad × factor × gwp
    const co2e = calcCo2e(activityValue, factor.factor, gwp)

    const source = await EmissionSource.create({
      inventoryPeriod: period._id,
      org: period.org,
      scope,
      category,
      activityType,
      label: factor.label,
      description: description || '',
      activityValue,
      unit: factor.unit,
      emissionFactor: factor.factor,
      gwp,
      factorSource: factor.source,
      co2e
    })

    const totals = await recalculateTotals(period._id)
    res.status(201).json({ source, totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateEmissionSource = async (req, res) => {
  try {
    const { activityValue, description } = req.body
    const source = await EmissionSource.findById(req.params.sourceId)
    if (!source) return res.status(404).json({ message: 'Fuente no encontrada' })

    if (req.user.role !== 'admin' && source.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }

    if (activityValue !== undefined) {
      source.activityValue = activityValue
      source.co2e = calcCo2e(activityValue, source.emissionFactor, source.gwp ?? 1)
    }
    if (description !== undefined) source.description = description
    await source.save()

    const totals = await recalculateTotals(source.inventoryPeriod)
    res.json({ source, totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const deleteEmissionSource = async (req, res) => {
  try {
    const source = await EmissionSource.findById(req.params.sourceId)
    if (!source) return res.status(404).json({ message: 'Fuente no encontrada' })

    if (req.user.role !== 'admin' && source.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    await source.deleteOne()

    const totals = await recalculateTotals(source.inventoryPeriod)
    res.json({ message: 'Fuente eliminada', totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getEmissionSources, createEmissionSource, updateEmissionSource, deleteEmissionSource }
