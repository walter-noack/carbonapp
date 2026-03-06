const EmissionEntry = require('../models/EmissionEntry')
const Calculation = require('../models/Calculation')
const EmissionFactor = require('../models/EmissionFactor')
const { recalculateTotals } = require('./calculationController')

const getEntries = async (req, res) => {
  try {
    const entries = await EmissionEntry.find({ calculation: req.params.id }).sort({ scope: 1, createdAt: 1 })
    res.json(entries)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createEntry = async (req, res) => {
  try {
    const calc = await Calculation.findById(req.params.id)
    if (!calc) return res.status(404).json({ message: 'Cálculo no encontrado' })
    if (calc.status === 'completed') {
      return res.status(400).json({ message: 'No se pueden agregar entradas a un cálculo completado' })
    }

    const { scope, category, activityType, description, activityValue } = req.body

    const factor = await EmissionFactor.findOne({ scope, category, activityType, active: true })
    if (!factor) return res.status(404).json({ message: 'Factor de emisión no encontrado' })

    const co2e = Math.round((activityValue * factor.factor / 1000) * 10000) / 10000

    const entry = await EmissionEntry.create({
      calculation: calc._id,
      org: calc.org,
      scope,
      category,
      activityType,
      label: factor.label,
      description: description || '',
      activityValue,
      unit: factor.unit,
      emissionFactor: factor.factor,
      factorSource: factor.source,
      co2e
    })

    const totals = await recalculateTotals(calc._id)
    res.status(201).json({ entry, totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateEntry = async (req, res) => {
  try {
    const { activityValue, description } = req.body
    const entry = await EmissionEntry.findById(req.params.entryId)
    if (!entry) return res.status(404).json({ message: 'Entrada no encontrada' })

    if (activityValue !== undefined) {
      entry.activityValue = activityValue
      entry.co2e = Math.round((activityValue * entry.emissionFactor / 1000) * 10000) / 10000
    }
    if (description !== undefined) entry.description = description
    await entry.save()

    const totals = await recalculateTotals(entry.calculation)
    res.json({ entry, totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const deleteEntry = async (req, res) => {
  try {
    const entry = await EmissionEntry.findByIdAndDelete(req.params.entryId)
    if (!entry) return res.status(404).json({ message: 'Entrada no encontrada' })

    const totals = await recalculateTotals(entry.calculation)
    res.json({ message: 'Entrada eliminada', totals })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getEntries, createEntry, updateEntry, deleteEntry }
