const mongoose = require('mongoose')

const emissionFactorSchema = new mongoose.Schema({
  scope: { type: Number, enum: [1, 2, 3], required: true },
  category: { type: String, required: true },      // 'combustion_estacionaria', 'electricidad', etc.
  activityType: { type: String, required: true },   // 'diesel', 'gasolina', 'sen_2023', etc.
  label: { type: String, required: true },          // nombre legible para el usuario
  unit: { type: String, required: true },           // 'L', 'kWh', 'km', 'kg', 'm3'
  factor: { type: Number, required: true },         // kgCO2e por unidad
  gwp: { type: Number, default: 1 },                // GWP (IPCC AR6) aplicado sobre el factor base
  version: { type: String },                        // versión/edición de la fuente (ej. 'AR6', '2024')
  country: { type: String, default: 'CL' },
  year: { type: Number },
  source: { type: String },
  active: { type: Boolean, default: true }
})

module.exports = mongoose.model('EmissionFactor', emissionFactorSchema)
