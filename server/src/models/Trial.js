const mongoose = require('mongoose')

// Historial de trials por organización. La fuente de verdad para el bloqueo
// en caliente es Organization.trial_ends_at / Organization.plan; esta colección
// guarda el registro histórico (útil para emails de aviso y analítica de conversión).
const trialSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    trial_ends_at: { type: Date, required: true },
    plan: { type: String, default: 'trial' },
    convertedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Trial', trialSchema)
