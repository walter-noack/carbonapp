const jwt = require('jsonwebtoken')
const User = require('../models/User')

const LOGIN_URL = 'https://ambientapp.cl/login'

// Valida la cookie ambient_token emitida por AmbientApp (SSO central) y
// resuelve el User local de CarbonApp por email, ya que el resto del código
// (requireRole, controllers, etc.) espera req.user como documento Mongo local,
// no como el payload del hub.
const authenticate = async (req, res, next) => {
  const token = req.cookies?.ambient_token

  if (!token) {
    return res.status(401).json({ message: 'No autenticado', loginUrl: LOGIN_URL })
  }

  let hubUser
  try {
    hubUser = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.clearCookie('ambient_token', { domain: '.ambientapp.cl' })
    return res.status(401).json({ message: 'Sesión inválida o expirada', loginUrl: LOGIN_URL })
  }

  if (!hubUser.apps?.includes('carbonapp')) {
    return res.status(403).json({
      message: 'Tu plan no incluye acceso a CarbonApp',
      upgradeUrl: 'https://ambientapp.cl/planes'
    })
  }

  const user = await User.findOne({ email: hubUser.email, active: true })
  if (!user) {
    return res.status(404).json({ message: 'onboarding_required', onboardingUrl: '/onboarding' })
  }

  req.hubUser = hubUser
  req.user = user
  next()
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acceso denegado' })
  }
  next()
}

module.exports = { authenticate, requireRole }
