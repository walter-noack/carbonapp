const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema(
  {
    inventoryPeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPeriod', required: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: ['pdf', 'huellachile'], required: true },
    fileUrl: { type: String },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Report', reportSchema)
