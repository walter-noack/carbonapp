const mongoose = require('mongoose')

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'CL'
    },
    active: {
      type: Boolean,
      default: true
    },
    plan: {
      type: String,
      enum: ['trial', 'reporte', 'huellachile_ready', 'consultora'],
      default: 'trial'
    },
    trial_ends_at: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Organization', organizationSchema)
