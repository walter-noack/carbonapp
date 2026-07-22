const serverless = require('serverless-http')
const mongoose = require('mongoose')
const createApp = require('./src/app')

let handlerPromise

async function buildHandler() {
  await mongoose.connect(process.env.MONGODB_URI)
  return serverless(createApp())
}

module.exports.handler = async (event, context) => {
  // Reutiliza la conexión a Mongo entre invocaciones cuando Lambda recicla el
  // contenedor — evita reconectar en cada request.
  context.callbackWaitsForEmptyEventLoop = false
  if (!handlerPromise) handlerPromise = buildHandler()
  const serverlessHandler = await handlerPromise
  return serverlessHandler(event, context)
}
