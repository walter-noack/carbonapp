const mongoose = require('mongoose')
const createApp = require('./app')

const PORT = process.env.PORT || 4000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB conectado')
    const app = createApp()
    app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`))
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  })
