const Calculation = require('../models/Calculation')
const EmissionEntry = require('../models/EmissionEntry')

const recalculateTotals = async (calculationId) => {
  const entries = await EmissionEntry.find({ calculation: calculationId })
  const t = { scope1: 0, scope2: 0, scope3: 0 }
  entries.forEach((e) => {
    if (e.scope === 1) t.scope1 += e.co2e
    else if (e.scope === 2) t.scope2 += e.co2e
    else if (e.scope === 3) t.scope3 += e.co2e
  })
  const round = (n) => Math.round(n * 1000) / 1000
  const totals = {
    scope1: round(t.scope1),
    scope2: round(t.scope2),
    scope3: round(t.scope3),
    total: round(t.scope1 + t.scope2 + t.scope3)
  }
  await Calculation.findByIdAndUpdate(calculationId, { totals })
  return totals
}

const getCalculations = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { org: req.user.org }
    const calcs = await Calculation.find(filter)
      .populate('org', 'name')
      .populate('createdBy', 'name')
      .sort({ year: -1 })
    res.json(calcs)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createCalculation = async (req, res) => {
  try {
    const { year, notes } = req.body
    const org = req.user.role === 'admin' ? req.body.org : req.user.org
    if (!org) return res.status(400).json({ message: 'Organización requerida' })

    const calc = await Calculation.create({ org, year, notes, createdBy: req.user._id })
    await calc.populate('org', 'name')
    res.status(201).json(calc)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un cálculo para ese año en esta organización' })
    }
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const getCalculationById = async (req, res) => {
  try {
    const calc = await Calculation.findById(req.params.id)
      .populate('org', 'name')
      .populate('createdBy', 'name')
    if (!calc) return res.status(404).json({ message: 'Cálculo no encontrado' })

    if (req.user.role !== 'admin' && calc.org._id.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    res.json(calc)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateCalculation = async (req, res) => {
  try {
    const calc = await Calculation.findById(req.params.id)
      .populate('org', 'name')
      .populate('createdBy', 'name')
    if (!calc) return res.status(404).json({ message: 'Cálculo no encontrado' })

    if (req.user.role !== 'admin' && calc.org._id.toString() !== req.user.org?.toString()) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }

    const allowed = ['status', 'notes']
    allowed.forEach((k) => { if (req.body[k] !== undefined) calc[k] = req.body[k] })
    await calc.save()
    res.json(calc)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getCalculations, createCalculation, getCalculationById, updateCalculation, recalculateTotals }
