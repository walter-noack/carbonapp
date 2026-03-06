const jwt = require('jsonwebtoken')
const User = require('../models/User')

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuario no autorizado' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acceso denegado' })
  }
  next()
}

module.exports = { authenticate, requireRole }
