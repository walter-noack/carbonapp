require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

const ADMIN = {
  name: 'Admin',
  email: 'admin@carbonapp.cl',
  password: 'carbonapp2026',
  role: 'admin'
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB conectado')

  await User.deleteOne({ email: ADMIN.email })
  const user = await User.create(ADMIN)
  console.log('Admin creado:', user.email)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
