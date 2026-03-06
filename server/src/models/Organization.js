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
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Organization', organizationSchema)
