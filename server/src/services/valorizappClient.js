// Llama al endpoint interno de Valorizapp (autenticado con API key compartida,
// no JWT de usuario) para leer el resumen de residuos de una organización/año.
const getWasteSummary = async (organizationId, year) => {
  const baseUrl = process.env.VALORIZAPP_API_URL
  const apiKey = process.env.INTERNAL_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('VALORIZAPP_API_URL o INTERNAL_API_KEY no configurados')
  }

  const res = await fetch(`${baseUrl}/api/internal/waste-summary/${organizationId}/${year}`, {
    headers: { 'x-internal-api-key': apiKey }
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Valorizapp respondió ${res.status}`)
  }

  return res.json()
}

module.exports = { getWasteSummary }
