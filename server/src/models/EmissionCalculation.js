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
    categoryTotals: { type: mongoose.Schema.Types.Mixed, default: {} },
    intensities: {
      perEmployee: { type: Number, default: null },
      perMillionClpRevenue: { type: Number, default: null }
    },
    employeeCountAtSnapshot: { type: Number, default: null },
    annualRevenueMillionClpAtSnapshot: { type: Number, default: null },
    previousPeriodComparison: {
      previousYear: { type: Number, default: null },
      previousTotal: { type: Number, default: null },
      changePct: { type: Number, default: null } // (total - previousTotal) / previousTotal * 100
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
