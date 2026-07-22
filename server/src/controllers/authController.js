const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Organization = require('../models/Organization')

const me = async (req, res) => {
  res.json(req.user)
}

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' })
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    )
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

// POST /api/auth/onboarding — primera vez que un usuario autenticado en
// AmbientApp entra a CarbonApp: crea su Organization + User locales.
// No usa `authenticate` (que devuelve 404 si el User local no existe todavía)
// — valida la cookie del hub directamente, igual que valorizApp.
const onboarding = async (req, res) => {
  const token = req.cookies?.ambient_token
  if (!token) {
    return res.status(401).json({ message: 'No autenticado', loginUrl: 'https://ambientapp.cl/login' })
  }

  let hubUser
  try {
    hubUser = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Sesión inválida o expirada', loginUrl: 'https://ambientapp.cl/login' })
  }

  try {
    const { name, orgName, taxId, industry } = req.body
    if (!name || !orgName) {
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    }

    const existente = await User.findOne({ email: hubUser.email })
    if (existente) {
      return res.status(409).json({ message: 'El usuario ya tiene onboarding realizado' })
    }

    const org = await Organization.create({ name: orgName, taxId, industry })

    const user = await User.create({
      name,
      email: hubUser.email,
      role: 'consultant',
      org: org._id
    })

    res.status(201).json({ user, organization: org })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Stateless logout: no hay token propio que invalidar; el logout real
// (borrar la cookie ambient_token) ocurre en el auth-hub central.
const logout = (_req, res) => {
  res.json({ message: 'Sesión cerrada' })
}

module.exports = { me, onboarding, logout, updateProfile }
