// Datos de demostración: 3 organizaciones con perfiles distintos, usuarios
// consultores, períodos en distintos estados (draft/completed) y fuentes de
// emisión cubriendo Scope 1/2/3, para poder navegar la plataforma con
// contenido real. No reemplaza a seed.js (admin + catálogo de factores);
// se corre después de ese.
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Organization = require('./models/Organization')
const InventoryPeriod = require('./models/InventoryPeriod')
const EmissionSource = require('./models/EmissionSource')
const EmissionFactor = require('./models/EmissionFactor')
const { recalculateTotals, createCalculationSnapshot } = require('./controllers/inventoryPeriodController')

const round4 = (n) => Math.round(n * 10000) / 10000

// Crea una fuente buscando su factor real en la colección EmissionFactor,
// igual que hace el endpoint real, para que los números sean consistentes.
async function addSource(period, org, { scope, category, activityType, activityValue, description, importedFrom }) {
  const factor = await EmissionFactor.findOne({ scope, category, activityType, active: true })
  if (!factor) {
    console.warn(`  ⚠ factor no encontrado: scope${scope}/${category}/${activityType}, se omite`)
    return
  }
  const gwp = factor.gwp ?? 1
  const co2e = round4((activityValue * factor.factor * gwp) / 1000)
  await EmissionSource.create({
    inventoryPeriod: period._id,
    org: org._id,
    scope,
    category,
    activityType,
    label: factor.label,
    description: description || '',
    activityValue,
    unit: factor.unit,
    emissionFactor: factor.factor,
    gwp,
    factorSource: factor.source,
    co2e,
    importedFrom: importedFrom || null
  })
}

async function createOrgWithUser({ name, taxId, industry, employeeCount, annualRevenueMillionClp, userName, userEmail }) {
  const org = await Organization.create({
    name, taxId, industry, country: 'CL', active: true,
    plan: 'reporte',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    employeeCount, annualRevenueMillionClp
  })
  await User.deleteOne({ email: userEmail })
  const user = await User.create({ name: userName, email: userEmail, password: 'demo1234', role: 'consultant', org: org._id })
  console.log(`Organización creada: ${org.name} — login consultor: ${user.email} / demo1234`)
  return org
}

async function completePeriod(period, adminId) {
  await recalculateTotals(period._id)
  period.status = 'completed'
  await period.save()
  await createCalculationSnapshot(period, adminId)
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB conectado\n')

  const admin = await User.findOne({ email: 'admin@carbonapp.cl' })
  if (!admin) throw new Error('Corre primero "npm run seed" para crear el usuario admin')

  // ── Org 1: Panadería (Alimentos, chica) ──────────────────────────────────
  const panaderia = await createOrgWithUser({
    name: 'Panadería Los Aromos SpA',
    taxId: '76.111.222-3',
    industry: 'Alimentos',
    employeeCount: 12,
    annualRevenueMillionClp: 180,
    userName: 'María Contreras',
    userEmail: 'maria@panaderialosaromos.cl'
  })

  const panaderia2024 = await InventoryPeriod.create({ org: panaderia._id, year: 2024, createdBy: (await User.findOne({ email: 'maria@panaderialosaromos.cl' }))._id, notes: 'Primer inventario, línea base.' })
  await addSource(panaderia2024, panaderia, { scope: 1, category: 'combustion_estacionaria', activityType: 'gas_natural', activityValue: 3200, description: 'Hornos de panadería' })
  await addSource(panaderia2024, panaderia, { scope: 1, category: 'combustion_movil', activityType: 'diesel', activityValue: 900, description: 'Camioneta de reparto' })
  await addSource(panaderia2024, panaderia, { scope: 2, category: 'electricidad', activityType: 'sen', activityValue: 18000, description: 'Local + hornos eléctricos' })
  await addSource(panaderia2024, panaderia, { scope: 3, category: 'bienes_servicios', activityType: 'alimentos_catering', activityValue: 65, description: 'Insumos (harina, materias primas)' })
  await addSource(panaderia2024, panaderia, { scope: 3, category: 'residuos', activityType: 'residuos_organicos', activityValue: 1200, description: 'Merma orgánica' })
  await completePeriod(panaderia2024, admin._id)

  const panaderia2025 = await InventoryPeriod.create({ org: panaderia._id, year: 2025, createdBy: (await User.findOne({ email: 'maria@panaderialosaromos.cl' }))._id, notes: 'Segundo año, se sumó reparto propio.' })
  await addSource(panaderia2025, panaderia, { scope: 1, category: 'combustion_estacionaria', activityType: 'gas_natural', activityValue: 3400, description: 'Hornos de panadería' })
  await addSource(panaderia2025, panaderia, { scope: 1, category: 'combustion_movil', activityType: 'diesel', activityValue: 1500, description: 'Camioneta de reparto (ruta ampliada)' })
  await addSource(panaderia2025, panaderia, { scope: 2, category: 'electricidad', activityType: 'sen', activityValue: 19500, description: 'Local + hornos eléctricos' })
  await addSource(panaderia2025, panaderia, { scope: 3, category: 'bienes_servicios', activityType: 'alimentos_catering', activityValue: 72, description: 'Insumos (harina, materias primas)' })
  await addSource(panaderia2025, panaderia, { scope: 3, category: 'residuos', activityType: 'rep_envases', activityValue: 340, description: 'Envases importados desde Valorizapp', importedFrom: 'valorizapp' })
  await addSource(panaderia2025, panaderia, { scope: 3, category: 'residuos', activityType: 'residuos_organicos', activityValue: 1350, description: 'Merma orgánica' })
  await addSource(panaderia2025, panaderia, { scope: 3, category: 'desplazamiento_empleados', activityType: 'transporte_publico', activityValue: 28000, description: '12 empleados, ida+vuelta, 220 días' })
  panaderia2025.nonEvaluatedCategories = [
    { category: 'cat_2', justification: 'No se adquirió maquinaria ni activos de capital relevantes este período.' },
    { category: 'cat_8', justification: 'La organización no arrienda activos a terceros.' }
  ]
  await panaderia2025.save()
  await completePeriod(panaderia2025, admin._id)

  // ── Org 2: Transportes (Logística, mediana, alto Scope 1/3) ──────────────
  const transportes = await createOrgWithUser({
    name: 'Transportes Andina Ltda',
    taxId: '77.333.444-5',
    industry: 'Transporte y logística',
    employeeCount: 45,
    annualRevenueMillionClp: 950,
    userName: 'Jorge Peña',
    userEmail: 'jorge@transandina.cl'
  })

  const transportes2024 = await InventoryPeriod.create({ org: transportes._id, year: 2024, createdBy: (await User.findOne({ email: 'jorge@transandina.cl' }))._id })
  await addSource(transportes2024, transportes, { scope: 1, category: 'combustion_movil', activityType: 'diesel', activityValue: 42000, description: 'Flota de camiones (18 unidades)' })
  await addSource(transportes2024, transportes, { scope: 1, category: 'fugitivas', activityType: 'r134a', activityValue: 8, description: 'Recarga A/C flota' })
  await addSource(transportes2024, transportes, { scope: 2, category: 'electricidad', activityType: 'sen', activityValue: 32000, description: 'Bodega y oficinas' })
  await addSource(transportes2024, transportes, { scope: 3, category: 'bienes_capital', activityType: 'vehiculos', activityValue: 180, description: 'Renovación de 2 camiones' })
  await addSource(transportes2024, transportes, { scope: 3, category: 'transporte_upstream', activityType: 'camion', activityValue: 85000, description: 'Subcontratos de flete' })
  await completePeriod(transportes2024, admin._id)

  const transportes2025 = await InventoryPeriod.create({ org: transportes._id, year: 2025, createdBy: (await User.findOne({ email: 'jorge@transandina.cl' }))._id, notes: 'Se incorporaron 3 camiones nuevos y se redujo subcontratación de flete.' })
  await addSource(transportes2025, transportes, { scope: 1, category: 'combustion_movil', activityType: 'diesel', activityValue: 46500, description: 'Flota de camiones (21 unidades)' })
  await addSource(transportes2025, transportes, { scope: 1, category: 'fugitivas', activityType: 'r134a', activityValue: 6, description: 'Recarga A/C flota' })
  await addSource(transportes2025, transportes, { scope: 2, category: 'electricidad', activityType: 'sen', activityValue: 33500, description: 'Bodega y oficinas' })
  await addSource(transportes2025, transportes, { scope: 3, category: 'upstream_combustible_energia', activityType: 'diesel', activityValue: 46500, description: 'WTT sobre el mismo consumo de flota' })
  await addSource(transportes2025, transportes, { scope: 3, category: 'bienes_capital', activityType: 'vehiculos', activityValue: 260, description: 'Renovación de 3 camiones' })
  await addSource(transportes2025, transportes, { scope: 3, category: 'transporte_upstream', activityType: 'camion', activityValue: 61000, description: 'Subcontratos de flete (reducido)' })
  await addSource(transportes2025, transportes, { scope: 3, category: 'viajes_negocio', activityType: 'avion_domestico', activityValue: 3200, description: 'Visitas a sucursales regionales' })
  await addSource(transportes2025, transportes, { scope: 3, category: 'desplazamiento_empleados', activityType: 'auto_particular', activityValue: 95000, description: '45 empleados, ida+vuelta, 220 días' })
  transportes2025.nonEvaluatedCategories = [
    { category: 'cat_9', justification: 'La distribución downstream la asume el cliente final, fuera del control operacional de la empresa.' },
    { category: 'cat_12', justification: 'No aplica: la empresa presta un servicio de transporte, no vende productos físicos.' }
  ]
  await transportes2025.save()
  await completePeriod(transportes2025, admin._id)

  // ── Org 3: Consultora (Servicios, chica, período en borrador) ────────────
  const consultora = await createOrgWithUser({
    name: 'Consultora Sustenta SpA',
    taxId: '78.555.666-7',
    industry: 'Servicios profesionales',
    employeeCount: 8,
    annualRevenueMillionClp: 120,
    userName: 'Valentina Rojas',
    userEmail: 'valentina@sustenta.cl'
  })

  const consultora2025 = await InventoryPeriod.create({ org: consultora._id, year: 2025, createdBy: (await User.findOne({ email: 'valentina@sustenta.cl' }))._id, notes: 'Primer inventario — en proceso de carga.' })
  await addSource(consultora2025, consultora, { scope: 2, category: 'electricidad', activityType: 'sen', activityValue: 5200, description: 'Oficina coworking' })
  await addSource(consultora2025, consultora, { scope: 3, category: 'bienes_servicios', activityType: 'ti_software', activityValue: 8.5, description: 'Licencias software y cloud' })
  await addSource(consultora2025, consultora, { scope: 3, category: 'viajes_negocio', activityType: 'avion_domestico', activityValue: 1800, description: 'Visitas a clientes' })
  await addSource(consultora2025, consultora, { scope: 3, category: 'desplazamiento_empleados', activityType: 'teletrabajo', activityValue: 3.1, description: '8 empleados, 3 días/semana teletrabajo' })
  await recalculateTotals(consultora2025._id) // queda en draft — sin snapshot, para mostrar ese estado en la UI

  console.log('\nListo. Resumen:')
  console.log('  Admin:      admin@carbonapp.cl / carbonapp2026 (ve todas las organizaciones)')
  console.log('  Consultor:  maria@panaderialosaromos.cl / demo1234 — Panadería Los Aromos (2 períodos completados)')
  console.log('  Consultor:  jorge@transandina.cl / demo1234 — Transportes Andina (2 períodos completados, alto Scope 1/3)')
  console.log('  Consultor:  valentina@sustenta.cl / demo1234 — Consultora Sustenta (1 período en borrador)')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
