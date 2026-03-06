require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const EmissionFactor = require('./models/EmissionFactor')

const ADMIN = {
  name: 'Admin',
  email: 'admin@carbonapp.cl',
  password: 'carbonapp2026',
  role: 'admin'
}

// Fuentes: IPCC 2006, Ministerio de Energía Chile 2023, DEFRA 2023
// Distancias Alcance 3: ingresar km TOTALES ANUALES (incluir ida y vuelta si aplica)
const EMISSION_FACTORS = [
  // ── ALCANCE 1 · Combustión estacionaria ──────────────────────────────
  { scope: 1, category: 'combustion_estacionaria', activityType: 'diesel',      label: 'Diesel',         unit: 'L',   factor: 2.603, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_estacionaria', activityType: 'gasolina',    label: 'Gasolina',       unit: 'L',   factor: 2.313, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_estacionaria', activityType: 'gas_natural', label: 'Gas natural',    unit: 'm3',  factor: 2.204, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_estacionaria', activityType: 'glp',         label: 'GLP',            unit: 'L',   factor: 1.621, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_estacionaria', activityType: 'carbon',      label: 'Carbón',         unit: 'kg',  factor: 2.340, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_estacionaria', activityType: 'biomasa',     label: 'Biomasa / leña', unit: 'kg',  factor: 0.000, source: 'IPCC 2006 (carbono neutro)' },

  // ── ALCANCE 1 · Combustión móvil ─────────────────────────────────────
  { scope: 1, category: 'combustion_movil', activityType: 'diesel',      label: 'Diesel',      unit: 'L',  factor: 2.603, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_movil', activityType: 'gasolina',    label: 'Gasolina',    unit: 'L',  factor: 2.313, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_movil', activityType: 'gas_natural', label: 'Gas natural', unit: 'm3', factor: 2.204, source: 'IPCC 2006' },
  { scope: 1, category: 'combustion_movil', activityType: 'glp',         label: 'GLP',         unit: 'L',  factor: 1.621, source: 'IPCC 2006' },

  // ── ALCANCE 1 · Emisiones fugitivas ──────────────────────────────────
  { scope: 1, category: 'fugitivas', activityType: 'r410a', label: 'Refrigerante R-410A', unit: 'kg', factor: 2088, source: 'IPCC AR5' },
  { scope: 1, category: 'fugitivas', activityType: 'r22',   label: 'Refrigerante R-22',   unit: 'kg', factor: 1810, source: 'IPCC AR5' },
  { scope: 1, category: 'fugitivas', activityType: 'r134a', label: 'Refrigerante R-134a', unit: 'kg', factor: 1430, source: 'IPCC AR5' },
  { scope: 1, category: 'fugitivas', activityType: 'r404a', label: 'Refrigerante R-404A', unit: 'kg', factor: 3922, source: 'IPCC AR5' },

  // ── ALCANCE 2 · Electricidad comprada ────────────────────────────────
  // Solo el factor más reciente disponible. Actualizar cuando MINENERGIA publique nuevo valor.
  { scope: 2, category: 'electricidad', activityType: 'sen', label: 'Electricidad SEN', unit: 'kWh', factor: 0.2584, year: 2023, source: 'Ministerio de Energía Chile 2023' },

  // ── ALCANCE 3 · Cat 5 Residuos ───────────────────────────────────────
  { scope: 3, category: 'residuos', activityType: 'residuos_solidos',   label: 'Residuos sólidos a relleno sanitario', unit: 'kg', factor: 0.960, source: 'IPCC 2006' },
  { scope: 3, category: 'residuos', activityType: 'residuos_organicos', label: 'Residuos orgánicos compostados',       unit: 'kg', factor: 0.010, source: 'IPCC 2006' },
  { scope: 3, category: 'residuos', activityType: 'aguas_residuales',   label: 'Aguas residuales tratadas',           unit: 'm3', factor: 0.340, source: 'IPCC 2006' },

  // ── ALCANCE 3 · Cat 6 Viajes de negocios ─────────────────────────────
  // Ingresar km totales anuales (ida + vuelta si aplica)
  { scope: 3, category: 'viajes_negocio', activityType: 'avion_domestico',     label: 'Avión doméstico (km totales ida+vuelta)',     unit: 'km', factor: 0.2550, source: 'DEFRA 2023' },
  { scope: 3, category: 'viajes_negocio', activityType: 'avion_internacional', label: 'Avión internacional (km totales ida+vuelta)', unit: 'km', factor: 0.1950, source: 'DEFRA 2023' },
  { scope: 3, category: 'viajes_negocio', activityType: 'bus_interurbano',     label: 'Bus interurbano (km totales ida+vuelta)',     unit: 'km', factor: 0.0270, source: 'DEFRA 2023' },
  { scope: 3, category: 'viajes_negocio', activityType: 'tren',                label: 'Tren (km totales ida+vuelta)',                unit: 'km', factor: 0.0410, source: 'DEFRA 2023' },
  { scope: 3, category: 'viajes_negocio', activityType: 'taxi_auto',           label: 'Taxi / auto de alquiler (km totales)',        unit: 'km', factor: 0.1490, source: 'DEFRA 2023' },

  // ── ALCANCE 3 · Cat 7 Desplazamiento de empleados ────────────────────
  // Ingresar km totales anuales de todos los empleados (ida + vuelta cada jornada)
  { scope: 3, category: 'desplazamiento_empleados', activityType: 'auto_particular',    label: 'Auto particular (km totales anuales ida+vuelta)',          unit: 'km',     factor: 0.2100, source: 'DEFRA 2023' },
  { scope: 3, category: 'desplazamiento_empleados', activityType: 'moto',               label: 'Motocicleta (km totales anuales ida+vuelta)',              unit: 'km',     factor: 0.1160, source: 'DEFRA 2023' },
  { scope: 3, category: 'desplazamiento_empleados', activityType: 'transporte_publico', label: 'Transporte público (km totales anuales ida+vuelta)',       unit: 'km',     factor: 0.0400, source: 'DEFRA 2023' },
  { scope: 3, category: 'desplazamiento_empleados', activityType: 'bicicleta',          label: 'Bicicleta / caminata',                                    unit: 'km',     factor: 0.0000, source: 'Sin emisiones directas' },
  { scope: 3, category: 'desplazamiento_empleados', activityType: 'teletrabajo',        label: 'Teletrabajo — Consumo Diario (kWh/día)',                   unit: 'kWh/día', factor: 0.2584, source: 'Ministerio de Energía Chile 2023' }
]

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB conectado')

  // Admin
  await User.deleteOne({ email: ADMIN.email })
  const user = await User.create(ADMIN)
  console.log('Admin creado:', user.email)

  // Factores de emisión
  await EmissionFactor.deleteMany({})
  await EmissionFactor.insertMany(EMISSION_FACTORS)
  console.log(`Factores de emisión cargados: ${EMISSION_FACTORS.length}`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
