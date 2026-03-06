const mongoose = require('mongoose')

const calculationSchema = new mongoose.Schema(
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
    }
  },
  { timestamps: true }
)

// Un solo cálculo por organización y año
calculationSchema.index({ org: 1, year: 1 }, { unique: true })

module.exports = mongoose.model('Calculation', calculationSchema)
