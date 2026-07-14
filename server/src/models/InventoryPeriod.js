const mongoose = require('mongoose')

const inventoryPeriodSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    year: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    notes: { type: String, default: '' },
    totals: {
      scope1: { type: Number, default: 0 },
      scope2: { type: Number, default: 0 },
      scope3: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    // Declaración de categorías Scope 3 no evaluadas (Cat. 2, 3, 8–15) con
    // justificación del usuario, requerida para el expediente HuellaChile.
    nonEvaluatedCategories: [
      {
        category: { type: String, required: true }, // ej. 'cat_2', 'cat_8'
        justification: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
)

// Un solo período de reporte por organización y año
inventoryPeriodSchema.index({ org: 1, year: 1 }, { unique: true })

module.exports = mongoose.model('InventoryPeriod', inventoryPeriodSchema)
