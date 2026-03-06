const EmissionFactor = require('../models/EmissionFactor')

const getEmissionFactors = async (_req, res) => {
  try {
    const factors = await EmissionFactor.find({ active: true }).sort({ scope: 1, category: 1 })
    res.json(factors)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getEmissionFactors }
