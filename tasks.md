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
- [x] Cat. 1 — Bienes y servicios comprados (simplificado)
  - Gasto total por categoría de compra, en millón CLP
  - Factor sectorial promedio por categoría (EEIO aproximado, 7 categorías — ver seed.js)
- [x] Cat. 2 — Bienes de capital (simplificado, mismo patrón que Cat. 1: gasto en millón CLP × factor EEIO, 5 categorías)
- [x] Cat. 3 — Upstream combustible y energía (factores WTT sobre el mismo consumo ya declarado en Scope 1/2: diesel, gasolina, gas natural, GLP, electricidad SEN)
- [x] Cat. 4 — Transporte upstream
  - Toneladas-km por modo (camión/barco/avión) *(peso × distancia se ingresa ya multiplicado, no hay proveedores principales individuales)*
- [x] Cat. 5 — Residuos (auto-importado desde Valorizapp, editable)
- [x] Cat. 6 — Viajes de negocios
  - Viajes aéreos: origen/destino o km totales por clase
  - Viajes terrestres: km por modo (auto, bus, tren)
  - Alojamiento: noches × factor hotel *(no cubierto — solo aéreo/terrestre)*
- [x] Cat. 7 — Commuting empleados
  - N° empleados por modo de transporte principal
  - Distancia promedio ida/vuelta diaria
  - Días trabajados en el período
- [x] Pantalla "categorías no evaluadas": lista de Cat. 8–15 con opción de justificar por qué no aplica

---

## Sprint 3 — Motor de cálculo + dashboard (2 semanas)

### Motor de cálculo
- [x] Servicio `calculationEngine.js`:
  - Suma emisiones por scope (S1, S2, S3)
  - Suma por categoría dentro de S3
  - Total general en tCO₂eq
  - Intensidades: tCO₂eq/empleado, tCO₂eq/millón CLP ingreso — requiere `Organization.employeeCount`/`annualRevenueMillionClp` (opcional, editable en admin)
- [x] Guardar resultado en colección `EmissionCalculation` con snapshot de factores usados — se crea automáticamente al completar un período (`createCalculationSnapshot`), cada re-completado genera un snapshot nuevo (historial, no sobrescribe). Endpoint `GET /api/inventory-periods/:id/calculations`.
- [x] Comparativo con período anterior (si existe `InventoryPeriod` previo) — se calcula al completar y queda en el snapshot (`previousPeriodComparison`)

### Dashboard
- [x] Tarjetas resumen: total tCO₂eq, Scope 1, Scope 2, Scope 3
- [x] Gráfico distribución por scope (pie o barras apiladas — Chart.js o Recharts)
- [x] Top 5 fuentes de emisión (tabla ordenada por tCO₂eq)
- [x] Intensidades de carbono
- [x] Comparativo año anterior (si hay histórico) — badge junto al título de resultados
- [x] Alerta visual para categorías Scope 3 no evaluadas
- [x] Botones de exportación: "Descargar PDF" y "Expediente HuellaChile" *(UI lista, backend en Sprint 4)*

### Integración Asistente IA (Eria — proyecto ambientappIA)
- [x] Hook: al finalizar cálculo, inyectar contexto del inventario a Eria
  - `POST` automático a `/api/internal/carbon-context` (Eria) al completar un período, desde `createCalculationSnapshot`
  - Cruce por email del consultor de la organización (DBs separadas, mismo hub SSO)
  - Total por scope, top 3 fuentes, categorías no evaluadas, intensidades y comparativo interanual
  - Eria inyecta un bloque `[HUELLA DE CARBONO]` en su prompt (`promptBuilder.js`) — el asistente puede responder "¿qué significa que mi Scope 3 sea el 70%?"
  - Fire-and-forget: si Eria no está disponible, no bloquea completar el período (try/catch + warning en logs)

---

## Sprint 4 — Outputs: PDF + HuellaChile (2 semanas)

### Reporte PDF interno
- [x] Setup Puppeteer en el backend (`server/src/services/reportService.js`, `renderPdf`)
- [x] Template HTML del reporte:
  - Portada: nombre organización, período, fecha generación *(logo white-label queda pendiente — no hay feature de upload de logo aún)*
  - Resumen ejecutivo: 1 página con totales por scope y gráfico de barras CSS
  - Inventario detallado: tabla por fuente (nombre, scope, categoría, dato actividad, factor, tCO₂eq)
  - Tabla de factores de emisión utilizados: factor, valor, unidad, fuente, año (año extraído del texto de la fuente, ej. "IPCC 2006")
  - Declaración de categorías no evaluadas con justificación ingresada por el usuario
  - Top 3 recomendaciones automáticas según perfil de emisiones (reglas por scope dominante)
- [x] Endpoint GET `/api/reports/:inventoryPeriodId/pdf` — genera y retorna PDF (requiere período `completed`, bloqueado por `checkTrial`)

### Expediente HuellaChile
- [x] Mapear campos del inventario al formato oficial MMA:
  - Formulario de inventario (razón social, RUT, rubro, período, totales por alcance)
  - Tabla de datos de actividad por categoría con unidades
  - Tabla de factores con referencias bibliográficas en formato APA (aproximado, pendiente validar formato exacto con MMA)
  - Declaración de límites organizacionales (enfoque control operacional, texto fijo)
  - Declaración de límites operacionales (scopes y categorías incluidas/no evaluadas)
- [x] Checklist de documentación complementaria (lista estática de documentos típicos del programa)
- [x] Exportación PDF formato MMA
- [x] Exportación Excel con tablas para subir al portal HuellaChile (4 hojas: resumen, datos de actividad, factores, no evaluadas)
- [x] Endpoints:
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

- [ ] Scope 3 Cat. 8–15 — Cadena aguas abajo (procesamiento/uso/fin de vida de productos, franquicias, inversiones — requieren perfiles por rubro, no factor genérico)
- [ ] Actualización automática factor SEN vía scraping CNE
- [ ] Plan Consultora: dashboard multi-empresa, white-label completo
- [ ] Comparativo sectorial (benchmarking por rubro CIIU)
- [ ] Plan de reducción personalizado con seguimiento de acciones
- [ ] Integración con ESG Report Builder (cuando esté disponible)
- [ ] API pública para integración con ERP/contabilidad
- [ ] Soporte multimoneda para empresas con sede en más de un país