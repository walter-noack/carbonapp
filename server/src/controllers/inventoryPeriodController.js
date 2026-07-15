const InventoryPeriod = require('../models/InventoryPeriod')
const EmissionSource = require('../models/EmissionSource')
const EmissionCalculation = require('../models/EmissionCalculation')
const Organization = require('../models/Organization')
const { round, sumByScope, sumByCategory, computeIntensities } = require('../services/calculationEngine')

const recalculateTotals = async (inventoryPeriodId) => {
  const sources = await EmissionSource.find({ inventoryPeriod: inventoryPeriodId })
  const totals = sumByScope(sources)
  await InventoryPeriod.findByIdAndUpdate(inventoryPeriodId, { totals })
  return totals
}

// Congela un snapshot inmutable de totales + factores usados. Se crea uno
// nuevo cada vez que el período se completa (no se edita uno existente),
// para que reabrir/recompletar deje historial en vez de perder el anterior.
const createCalculationSnapshot = async (period, userId) => {
  const orgId = period.org._id || period.org
  const [sources, org, previousPeriod] = await Promise.all([
    EmissionSource.find({ inventoryPeriod: period._id }),
    Organization.findById(orgId),
    InventoryPeriod.findOne({ org: orgId, year: period.year - 1 })
  ])

  const totals = sumByScope(sources)
  const categoryTotals = sumByCategory(sources)
  const intensities = computeIntensities(totals, org)

  const factorsSnapshot = sources.map((s) => ({
    emissionSource: s._id,
    factor: s.emissionFactor,
    gwp: s.gwp ?? 1,
    source: s.factorSource,
    year: s.createdAt.getFullYear()
  }))

  let previousPeriodComparison = { previousYear: null, previousTotal: null, changePct: null }
  if (previousPeriod) {
    // Preferir el último snapshot completado del período anterior; si no
    // existe (nunca se completó), usar sus totales en vivo como referencia.
    const previousSnapshot = await EmissionCalculation.findOne({ inventoryPeriod: previousPeriod._id }).sort({ createdAt: -1 })
    const previousTotal = previousSnapshot ? previousSnapshot.totals.total : previousPeriod.totals.total
    previousPeriodComparison = {
      previousYear: previousPeriod.year,
      previousTotal,
      changePct: previousTotal > 0 ? round(((totals.total - previousTotal) / previousTotal) * 100) : null
    }
  }

  return EmissionCalculation.create({
    inventoryPeriod: period._id,
    org: orgId,
    totals,
    categoryTotals,
    intensities,
    employeeCountAtSnapshot: org?.employeeCount ?? null,
    annualRevenueMillionClpAtSnapshot: org?.annualRevenueMillionClp ?? null,
    previousPeriodComparison,
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
  recalculateTotals,
  createCalculationSnapshot
}
