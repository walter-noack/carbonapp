const Organization = require('../models/Organization')

const getOrganizations = async (_req, res) => {
  try {
    const orgs = await Organization.find()
    res.json(orgs)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const createOrganization = async (req, res) => {
  try {
    const { name, taxId, industry, country } = req.body
    const org = await Organization.create({ name, taxId, industry, country })
    res.status(201).json(org)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

const updateOrganization = async (req, res) => {
  try {
    const allowed = ['name', 'taxId', 'industry', 'country', 'active', 'plan', 'trial_ends_at']
    const updates = {}
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    })

    const org = await Organization.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
    if (!org) return res.status(404).json({ message: 'Organización no encontrada' })
    res.json(org)
  } catch {
    res.status(500).json({ message: 'Error del servidor' })
  }
}

module.exports = { getOrganizations, createOrganization, updateOrganization }
