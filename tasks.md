# CarbonApp — Backlog de Desarrollo MVP

> Estado: [ ] pendiente | [x] completado | [~] en progreso

---

## Sprint 1 — Data model + Scope 1 y 2 (2 semanas)

### Backend
- [x] Crear colecciones MongoDB: `Organization`, `InventoryPeriod`, `EmissionSource`, `EmissionFactor`, `EmissionCalculation`, `Report`, `Trial`
- [x] Agregar campo `trial_ends_at` al modelo `Organization`
- [x] Middleware de verificación de trial: si `trial_ends_at < now` y plan es `trial`, bloquear escritura/exportación
- [x] Poblar colección `emissionFactors` con fuentes iniciales:
  - IPCC AR6: combustión estacionaria (gas, petróleo, leña, carbón, biomasa, GLP)
  - IPCC AR6: combustión móvil (bencina, diesel, GLP)
  - IPCC AR6: refrigerantes (R-410A, R-22, R-134a, R-32) con GWP AR6
  - CNE: factor eléctrico SEN (hardcoded con año, actualizará después automáticamente)
- [x] Endpoint POST `/api/inventory-periods` — crear período de reporte
- [x] Endpoint POST `/api/inventory-periods/:id/emission-sources` — registrar fuente de emisión
- [x] Lógica de cálculo: `emisiones_tCO2eq = cantidad × factor × gwp`

### Frontend
- [ ] Ruta `/carbonapp` integrada en el menú principal de AmbientApp
- [x] Pantalla de inicio: selección de organización y período de reporte
- [x] Wizard Scope 1 — paso 1: combustión estacionaria
  - Tipo de combustible (selector)
  - Cantidad consumida + unidad (litros, m³, kg, toneladas)
  - Factor de emisión sugerido automáticamente según tipo
- [x] Wizard Scope 1 — paso 2: combustión móvil (flota propia)
  - N° vehículos por tipo de combustible
  - Km recorridos o litros consumidos en el período
- [x] Wizard Scope 1 — paso 3: emisiones fugitivas
  - Tipo de refrigerante
  - Cantidad recargada en el período (kg)
- [x] Wizard Scope 2: energía eléctrica
  - kWh consumidos por mes (o monto factura con conversión)
  - Región → factor SEN asignado automáticamente
  - Campo opcional: calor/vapor comprado

---

## Sprint 2 — Scope 3 + integración Valorizapp (2 semanas)

### Integración Valorizapp
- [x] Endpoint interno GET `/api/internal/waste-summary/:organizationId/:year` en valorizApp (API key compartida, no JWT de usuario) — leer datos de residuos del período
- [x] Mapper: corriente Ley REP de Valorizapp → factor IPCC/DEFRA Cat. 5 (`server/src/services/valorizappMapper.js`, CarbonApp)
- [x] Auto-importación: `POST /api/inventory-periods/:id/import-valorizapp` — trae y pre-llena Cat. 5, es idempotente (no duplica en reimportaciones)
- [x] UI: banner "Importar residuos desde Valorizapp" con conteo de importados/omitidos y badge en la tabla de fuentes

### Wizard Scope 3
- [ ] Cat. 1 — Bienes y servicios comprados (simplificado)
  - Gasto total por categoría de compra (CLP)
  - Factor sectorial promedio por categoría
- [ ] Cat. 4 — Transporte upstream
  - Compras con flete incluido: peso × distancia estimada × modo (camión/barco/avión)
  - Proveedores principales con distancia estimada
- [x] Cat. 5 — Residuos (auto-importado desde Valorizapp, editable)
- [x] Cat. 6 — Viajes de negocios
  - Viajes aéreos: origen/destino o km totales por clase
  - Viajes terrestres: km por modo (auto, bus, tren)
  - Alojamiento: noches × factor hotel *(no cubierto — solo aéreo/terrestre)*
- [x] Cat. 7 — Commuting empleados
  - N° empleados por modo de transporte principal
  - Distancia promedio ida/vuelta diaria
  - Días trabajados en el período
- [ ] Pantalla "categorías no evaluadas": lista de Cat. 2, 3, 8–15 con opción de justificar por qué no aplica

---

## Sprint 3 — Motor de cálculo + dashboard (2 semanas)

### Motor de cálculo
- [ ] Servicio `calculationEngine.js`:
  - Suma emisiones por scope (S1, S2, S3)
  - Suma por categoría dentro de S3
  - Total general en tCO₂eq
  - Intensidades: tCO₂eq/empleado, tCO₂eq/millón CLP ingreso
- [ ] Guardar resultado en colección `EmissionCalculation` con snapshot de factores usados
- [ ] Comparativo con período anterior (si existe `InventoryPeriod` previo)

### Dashboard
- [ ] Tarjetas resumen: total tCO₂eq, Scope 1, Scope 2, Scope 3
- [ ] Gráfico distribución por scope (pie o barras apiladas — Chart.js o Recharts)
- [ ] Top 5 fuentes de emisión (tabla ordenada por tCO₂eq)
- [ ] Intensidades de carbono
- [ ] Comparativo año anterior (si hay histórico)
- [ ] Alerta visual para categorías Scope 3 no evaluadas
- [ ] Botones de exportación: "Descargar PDF" y "Expediente HuellaChile"

### Integración Asistente IA
- [ ] Hook: al finalizar cálculo, inyectar contexto del inventario al Asistente IA
  - Total por scope, top 3 fuentes, categorías no evaluadas
  - El asistente puede responder: "¿qué significa que mi Scope 3 sea el 70%?"

---

## Sprint 4 — Outputs: PDF + HuellaChile (2 semanas)

### Reporte PDF interno
- [ ] Setup Puppeteer (o evaluar React-PDF) en el backend
- [ ] Template HTML del reporte:
  - Portada: logo empresa (white-label), nombre organización, período, fecha generación
  - Resumen ejecutivo: 1 página con totales por scope y gráfico
  - Inventario detallado: tabla por fuente (nombre, scope, categoría, dato actividad, factor, tCO₂eq)
  - Tabla de factores de emisión utilizados: factor, valor, unidad, fuente, año
  - Declaración de categorías no evaluadas con justificación ingresada por el usuario
  - Top 3 recomendaciones automáticas según perfil de emisiones (reglas por scope dominante)
- [ ] Endpoint GET `/api/reports/:inventoryPeriodId/pdf` — generar y retornar PDF

### Expediente HuellaChile
- [ ] Mapear campos del inventario al formato oficial MMA:
  - Formulario de inventario (campos específicos del programa HuellaChile)
  - Tabla de datos de actividad por categoría con unidades requeridas por MMA
  - Tabla de factores con referencias bibliográficas en formato APA
  - Declaración de límites organizacionales (enfoque control operacional/financiero)
  - Declaración de límites operacionales (qué scopes se incluyen y cuáles no)
- [ ] Checklist de documentación complementaria (lista de documentos que pide el MMA)
- [ ] Exportación PDF formato MMA
- [ ] Exportación Excel con tablas para subir al portal HuellaChile
- [ ] Endpoints:
  - GET `/api/reports/:inventoryPeriodId/huellachile/pdf`
  - GET `/api/reports/:inventoryPeriodId/huellachile/xlsx`

---

## Sprint 5 — QA, integración y lanzamiento (1 semana)

### Testing
- [ ] Testing con 2–3 empresas beta (preferir clientes actuales de Valorizapp)
- [ ] Validar que el expediente HuellaChile generado cumple el formato MMA (revisar con consultor externo o contactar directamente al MMA)
- [ ] Testing flujo Tipo A (usuario Valorizapp): verificar auto-importación correcta de residuos
- [ ] Testing flujo Tipo B (nueva PyME): wizard completo sin datos previos
- [ ] Testing del trial: verificar bloqueo correcto al día 30
- [ ] Testing modo lectura: datos visibles, exportación bloqueada

### Integración AmbientApp
- [ ] CarbonApp aparece en el menú principal de AmbientApp con estado (activo/trial/bloqueado)
- [ ] Datos de CarbonApp visibles en el dashboard central de AmbientApp (resumen)
- [ ] SSO: el JWT de AmbientApp funciona en CarbonApp sin re-login

### Deploy
- [ ] Deploy frontend en cPanel/Banahosting: `carbonapp.ambientapp.cl`
- [ ] Deploy backend en AWS (mismo servidor o instancia separada, según capacidad)
- [ ] Variables de entorno: `MONGO_URI`, `JWT_SECRET`, `CNE_API_KEY` (si aplica), `PUPPETEER_PATH`
- [ ] Configurar actualización anual del factor SEN (cron job o recordatorio manual)

### Onboarding
- [ ] Email de bienvenida al registrarse con instrucciones del trial
- [ ] Email de aviso 7 días antes de vencer el trial
- [ ] Email al vencer el trial con CTA a plan pagado
- [ ] Pantalla in-app de upgrade cuando se intenta exportar en modo trial vencido

---

## Backlog V2 (post-MVP)

- [ ] Scope 3 Cat. 2 — Bienes de capital
- [ ] Scope 3 Cat. 3 — Upstream combustible y energía
- [ ] Scope 3 Cat. 8–15 — Cadena aguas abajo
- [ ] Actualización automática factor SEN vía scraping CNE
- [ ] Plan Consultora: dashboard multi-empresa, white-label completo
- [ ] Comparativo sectorial (benchmarking por rubro CIIU)
- [ ] Plan de reducción personalizado con seguimiento de acciones
- [ ] Integración con ESG Report Builder (cuando esté disponible)
- [ ] API pública para integración con ERP/contabilidad
- [ ] Soporte multimoneda para empresas con sede en más de un país