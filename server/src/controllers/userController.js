const User = require('../models/User')

const getUsers = async (req, res) => {
  try {
    const filter = {}
    if (req.query.org) filter.org = req.query.org
    const users = await User.find(filter).populate('org', 'name')
    res.json(users)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, org } = req.body
    const user = await User.create({ name, email, password, role, org })
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'El email ya está registrado' })
    }
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateUser = async (req, res) => {
  try {
    const allowed = ['name', 'role', 'org', 'active', 'temporary', 'expiresAt']
    const updates = {}
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    })

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('org', 'name')

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

// Soft delete: desactiva el usuario en lugar de eliminarlo
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    )
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json({ message: 'Usuario desactivado', user })
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser }
