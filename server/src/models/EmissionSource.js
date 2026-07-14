const mongoose = require('mongoose')

const emissionSourceSchema = new mongoose.Schema(
  {
    inventoryPeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPeriod', required: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    scope: { type: Number, enum: [1, 2, 3], required: true },
    category: { type: String, required: true },
    activityType: { type: String, required: true },
    label: { type: String, required: true },         // nombre legible del tipo de actividad
    description: { type: String, default: '' },      // detalle libre del usuario
    activityValue: { type: Number, required: true }, // cantidad de actividad
    unit: { type: String, required: true },
    emissionFactor: { type: Number, required: true }, // kgCO2e/unidad
    gwp: { type: Number, default: 1 },                // potencial de calentamiento global aplicado
    factorSource: { type: String },
    co2e: { type: Number, required: true }            // tCO2e = activityValue * emissionFactor * gwp / 1000
  },
  { timestamps: true }
)

module.exports = mongoose.model('EmissionSource', emissionSourceSchema)
