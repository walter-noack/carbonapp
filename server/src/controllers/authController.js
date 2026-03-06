const jwt = require('jsonwebtoken')
const User = require('../models/User')

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  })
  const refreshToken = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  })
  return { accessToken, refreshToken }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' })
    }

    const user = await User.findOne({ email })
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const { accessToken, refreshToken } = generateTokens(user._id)
    res.json({ accessToken, refreshToken, user })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token requerido' })
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' })
    }

    const user = await User.findById(payload.sub)
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuario no autorizado' })
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)
    res.json({ accessToken, refreshToken: newRefreshToken })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

// Stateless logout: el cliente elimina los tokens en su lado
const logout = (_req, res) => {
  res.json({ message: 'Sesión cerrada' })
}

module.exports = { login, refresh, logout }
