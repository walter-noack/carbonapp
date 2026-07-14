const mongoose = require('mongoose')

// Snapshot inmutable de un cálculo ejecutado sobre un período: registra
// los factores usados al momento del cálculo para trazabilidad del reporte.
const emissionCalculationSchema = new mongoose.Schema(
  {
    inventoryPeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPeriod', required: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    totals: {
      scope1: { type: Number, default: 0 },
      scope2: { type: Number, default: 0 },
      scope3: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    factorsSnapshot: [
      {
        emissionSource: { type: mongoose.Schema.Types.ObjectId, ref: 'EmissionSource' },
        factor: Number,
        gwp: Number,
        source: String,
        year: Number
      }
    ],
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
)

module.exports = mongoose.model('EmissionCalculation', emissionCalculationSchema)
