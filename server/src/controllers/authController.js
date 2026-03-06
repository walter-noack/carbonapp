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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Contraseña actual y nueva requeridas' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' })
    }
    const user = await User.findById(req.user._id)
    const valid = await user.comparePassword(currentPassword)
    if (!valid) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' })
    }
    user.password = newPassword
    await user.save()
    res.json({ message: 'Contraseña actualizada' })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

// Stateless logout: el cliente elimina los tokens en su lado
const logout = (_req, res) => {
  res.json({ message: 'Sesión cerrada' })
}

module.exports = { login, refresh, logout, changePassword, updateProfile }
