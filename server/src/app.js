require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const organizationRoutes = require('./routes/organizations')
const inventoryPeriodRoutes = require('./routes/inventoryPeriods')
const emissionFactorRoutes = require('./routes/emissionFactors')
const reportRoutes = require('./routes/reports')

const app = express()

app.use(cors())
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

const PORT = process.env.PORT || 4000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB conectado')
    app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`))
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  })

module.exports = app
