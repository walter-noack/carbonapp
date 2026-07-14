const InventoryPeriod = require('../models/InventoryPeriod')
const EmissionSource = require('../models/EmissionSource')
const EmissionCalculation = require('../models/EmissionCalculation')

const recalculateTotals = async (inventoryPeriodId) => {
  const sources = await EmissionSource.find({ inventoryPeriod: inventoryPeriodId })
  const t = { scope1: 0, scope2: 0, scope3: 0 }
  sources.forEach((s) => {
    if (s.scope === 1) t.scope1 += s.co2e
    else if (s.scope === 2) t.scope2 += s.co2e
    else if (s.scope === 3) t.scope3 += s.co2e
  })
  const round = (n) => Math.round(n * 1000) / 1000
  const totals = {
    scope1: round(t.scope1),
    scope2: round(t.scope2),
    scope3: round(t.scope3),
    total: round(t.scope1 + t.scope2 + t.scope3)
  }
  await InventoryPeriod.findByIdAndUpdate(inventoryPeriodId, { totals })
  return totals
}

// Congela un snapshot inmutable de totales + factores usados. Se crea uno
// nuevo cada vez que el período se completa (no se edita uno existente),
// para que reabrir/recompletar deje historial en vez de perder el anterior.
const createCalculationSnapshot = async (period, userId) => {
  const sources = await EmissionSource.find({ inventoryPeriod: period._id })
  const factorsSnapshot = sources.map((s) => ({
    emissionSource: s._id,
    factor: s.emissionFactor,
    gwp: s.gwp ?? 1,
    source: s.factorSource,
    year: s.createdAt.getFullYear()
  }))

  return EmissionCalculation.create({
    inventoryPeriod: period._id,
    org: period.org._id || period.org,
    totals: period.totals,
    factorsSnapshot,
    generatedBy: userId
  })
}

const getInventoryPeriods = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { org: req.user.org }
    const periods = await InventoryPeriod.find(filter)
      .populate('org', 'name')
      .populate('createdBy', 'name')
      .sort({ year: -1 })
    res.json(periods)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createInventoryPeriod = async (req, res) => {
  try {
    const { year, notes } = req.body
    const org = req.user.role === 'admin' ? req.body.org : req.user.org
    if (!org) return res.status(400).json({ message: 'Organización requerida' })

    const period = await InventoryPeriod.create({ org, year, notes, createdBy: req.user._id })
    await period.populate('org', 'name')
    res.status(201).json(period)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un período de reporte para ese año en esta organización' })
    }
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const getInventoryPeriodById = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
      .populate('org', 'name')
      .populate('createdBy', 'name')
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org._id.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    res.json(period)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateInventoryPeriod = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
      .populate('org', 'name')
      .populate('createdBy', 'name')
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org._id.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }

    const wasDraft = period.status === 'draft'

    const allowed = ['status', 'notes', 'nonEvaluatedCategories']
    allowed.forEach((k) => { if (req.body[k] !== undefined) period[k] = req.body[k] })
    await period.save()

    if (wasDraft && period.status === 'completed') {
      await createCalculationSnapshot(period, req.user._id)
    }

    res.json(period)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const getCalculationSnapshots = async (req, res) => {
  try {
    const period = await InventoryPeriod.findById(req.params.id)
    if (!period) return res.status(404).json({ message: 'Período no encontrado' })

    if (req.user.role !== 'admin' && period.org.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }

    const snapshots = await EmissionCalculation.find({ inventoryPeriod: period._id })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
    res.json(snapshots)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = {
  getInventoryPeriods,
  createInventoryPeriod,
  getInventoryPeriodById,
  updateInventoryPeriod,
  getCalculationSnapshots,
  recalculateTotals
}
