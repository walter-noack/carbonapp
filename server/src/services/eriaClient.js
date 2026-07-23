// Empuja el resumen de un período completado a Eria (autenticado con API key
// compartida, no JWT de usuario) para que pueda responder preguntas sobre la
// huella de carbono de la organización. No debe romper el flujo de completar
// un período si Eria está caído — se llama en "fire and forget" desde el
// controller, con su propio try/catch.
const sendCarbonContext = async (payload) => {
  const baseUrl = process.env.ERIA_API_URL
  const apiKey = process.env.ERIA_INTERNAL_API_KEY
  if (!baseUrl || !apiKey) {
    console.warn('ERIA_API_URL o ERIA_INTERNAL_API_KEY no configurados — se omite el envío de contexto a Eria')
    return
  }

  const res = await fetch(`${baseUrl}/api/internal/carbon-context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': apiKey
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Eria respondió ${res.status}`)
  }
}

module.exports = { sendCarbonContext }
