const Organization = require('../models/Organization')

// Bloquea escritura/exportación cuando el trial venció y la organización
// sigue en plan 'trial' (no se suscribió a un plan pagado). Admin no tiene org
// asociada y queda exento.
const checkTrial = async (req, res, next) => {
  if (req.user.role === 'admin') return next()
  if (!req.user.org) return next()

  try {
    const org = await Organization.findById(req.user.org)
    if (!org) return next()

    const expired = org.plan === 'trial' && org.trial_ends_at && org.trial_ends_at < new Date()
    if (expired) {
      return res.status(402).json({ message: 'Tu período de prueba venció. Actualiza tu plan para editar o exportar.' })
    }
    next()
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { checkTrial }
