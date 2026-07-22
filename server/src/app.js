require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const organizationRoutes = require('./routes/organizations')
const inventoryPeriodRoutes = require('./routes/inventoryPeriods')
const emissionFactorRoutes = require('./routes/emissionFactors')
const reportRoutes = require('./routes/reports')

function createApp() {
  const app = express()

  // credentials:true + origin explícito (no '*') son obligatorios para que el
  // navegador adjunte la cookie ambient_token compartida con AmbientApp.
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/organizations', organizationRoutes)
  app.use('/api/inventory-periods', inventoryPeriodRoutes)
  app.use('/api/emission-factors', emissionFactorRoutes)
  app.use('/api/reports', reportRoutes)

  app.use((_req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' })
  })

  return app
}

module.exports = createApp
