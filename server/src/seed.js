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
// emisiones_tCO2eq = cantidad × factor × gwp — gwp por defecto 1 (ya embebido en 'factor' para refrigerantes)
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

  // ── ALCANCE 3 · Cat 2 Bienes de capital (simplificado) ───────────────
  // Mismo enfoque EEIO que Cat 1, aplicado a compras de activos fijos.
  { scope: 3, category: 'bienes_capital', activityType: 'maquinaria_equipos',       label: 'Maquinaria y equipos',              unit: 'millón CLP', factor: 220, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_capital', activityType: 'vehiculos',                label: 'Vehículos',                        unit: 'millón CLP', factor: 280, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_capital', activityType: 'mobiliario',               label: 'Mobiliario y equipamiento oficina', unit: 'millón CLP', factor: 160, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_capital', activityType: 'infraestructura_obras',    label: 'Infraestructura y obras civiles',   unit: 'millón CLP', factor: 380, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_capital', activityType: 'hardware_tecnologia',      label: 'Hardware y equipamiento tecnológico', unit: 'millón CLP', factor: 190, source: 'DEFRA 2023 EEIO (aprox.)' },

  // ── ALCANCE 3 · Cat 3 Actividades relacionadas con combustible y energía (upstream) ──
  // Emisiones "well-to-tank": extracción, refinación y transporte del combustible/electricidad
  // antes de su combustión o consumo (complementa lo ya declarado en Scope 1 y 2).
  // Ingresar la misma cantidad consumida que en el formulario de Scope 1/2 correspondiente.
  { scope: 3, category: 'upstream_combustible_energia', activityType: 'diesel',            label: 'Diesel — upstream (WTT)',            unit: 'L',   factor: 0.620, source: 'DEFRA 2023 WTT (aprox.)' },
  { scope: 3, category: 'upstream_combustible_energia', activityType: 'gasolina',          label: 'Gasolina — upstream (WTT)',          unit: 'L',   factor: 0.540, source: 'DEFRA 2023 WTT (aprox.)' },
  { scope: 3, category: 'upstream_combustible_energia', activityType: 'gas_natural',       label: 'Gas natural — upstream (WTT)',       unit: 'm3',  factor: 0.330, source: 'DEFRA 2023 WTT (aprox.)' },
  { scope: 3, category: 'upstream_combustible_energia', activityType: 'glp',               label: 'GLP — upstream (WTT)',               unit: 'L',   factor: 0.330, source: 'DEFRA 2023 WTT (aprox.)' },
  { scope: 3, category: 'upstream_combustible_energia', activityType: 'electricidad_sen',  label: 'Electricidad SEN — pérdidas T&D',    unit: 'kWh', factor: 0.021, source: 'DEFRA 2023 WTT (aprox.)' },

  // ── ALCANCE 3 · Cat 1 Bienes y servicios comprados (simplificado) ────
  // Factor EEIO aproximado por categoría de gasto, en kgCO2e por millón de CLP.
  // Orden de magnitud referencial — pendiente afinar con base sectorial chilena.
  { scope: 3, category: 'bienes_servicios', activityType: 'servicios_profesionales', label: 'Servicios profesionales / consultoría', unit: 'millón CLP', factor: 80,  source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'ti_software',             label: 'TI, software y servicios cloud',        unit: 'millón CLP', factor: 60,  source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'marketing_publicidad',    label: 'Marketing y publicidad',                unit: 'millón CLP', factor: 100, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'oficina_insumos',         label: 'Insumos de oficina',                    unit: 'millón CLP', factor: 150, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'alimentos_catering',      label: 'Alimentos y catering',                  unit: 'millón CLP', factor: 250, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'construccion_materiales', label: 'Materiales de construcción',            unit: 'millón CLP', factor: 450, source: 'DEFRA 2023 EEIO (aprox.)' },
  { scope: 3, category: 'bienes_servicios', activityType: 'otros_generales',         label: 'Otros bienes y servicios generales',    unit: 'millón CLP', factor: 180, source: 'DEFRA 2023 EEIO (aprox.)' },

  // ── ALCANCE 3 · Cat 4 Transporte y distribución upstream ─────────────
  // Ingresar toneladas-kilómetro totales (peso en toneladas × distancia en km)
  { scope: 3, category: 'transporte_upstream', activityType: 'camion',       label: 'Flete terrestre — camión (t·km)', unit: 't·km', factor: 0.107, source: 'DEFRA 2023' },
  { scope: 3, category: 'transporte_upstream', activityType: 'barco',        label: 'Flete marítimo (t·km)',           unit: 't·km', factor: 0.012, source: 'DEFRA 2023' },
  { scope: 3, category: 'transporte_upstream', activityType: 'avion_carga',  label: 'Flete aéreo (t·km)',              unit: 't·km', factor: 0.980, source: 'DEFRA 2023' },

  // ── ALCANCE 3 · Cat 5 Residuos ───────────────────────────────────────
  { scope: 3, category: 'residuos', activityType: 'residuos_solidos',   label: 'Residuos sólidos a relleno sanitario', unit: 'kg', factor: 0.960, source: 'IPCC 2006' },
  { scope: 3, category: 'residuos', activityType: 'residuos_organicos', label: 'Residuos orgánicos compostados',       unit: 'kg', factor: 0.010, source: 'IPCC 2006' },
  { scope: 3, category: 'residuos', activityType: 'aguas_residuales',   label: 'Aguas residuales tratadas',           unit: 'm3', factor: 0.340, source: 'IPCC 2006' },

  // Corrientes Ley REP (valorización/reciclaje) — factores aproximados de reciclaje
  // cerrado. Se auto-importan desde Valorizapp; pendiente afinar por MMA (ver context.md §13).
  { scope: 3, category: 'residuos', activityType: 'rep_envases',    label: 'Envases y embalajes reciclados (Ley REP)', unit: 'kg', factor: 0.021, source: 'DEFRA 2023 (reciclaje aprox.)' },
  { scope: 3, category: 'residuos', activityType: 'rep_neumaticos', label: 'Neumáticos valorizados (Ley REP)',         unit: 'kg', factor: 0.030, source: 'DEFRA 2023 (reciclaje aprox.)' },
  { scope: 3, category: 'residuos', activityType: 'rep_aceites',    label: 'Aceites usados re-refinados (Ley REP)',    unit: 'kg', factor: 0.050, source: 'DEFRA 2023 (reciclaje aprox.)' },
  { scope: 3, category: 'residuos', activityType: 'rep_raee',       label: 'RAEE (residuos eléctricos) reciclados (Ley REP)', unit: 'kg', factor: 0.0198, source: 'DEFRA 2023 (reciclaje aprox.)' },
  { scope: 3, category: 'residuos', activityType: 'rep_pilas',      label: 'Pilas y baterías recicladas (Ley REP)',    unit: 'kg', factor: 0.150, source: 'DEFRA 2023 (reciclaje aprox.)' },

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
