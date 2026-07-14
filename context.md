# CarbonApp — Contexto de Producto

> Documento de referencia para desarrollo. Mantener actualizado con cada decisión relevante.

---

## 1. Qué es CarbonApp

CarbonApp es el módulo de huella de carbono del ecosistema **AmbientApp**. Permite a PyMEs chilenas medir emisiones GEI en los tres alcances del GHG Protocol (Scope 1, 2 y 3), generar un reporte PDF interno y exportar el expediente en formato oficial del programa **HuellaChile del MMA**.

CarbonApp **no certifica** — prepara el expediente. El sello HuellaChile lo emite el MMA tras revisión. La verificación ISO 14064 es un servicio externo independiente.

---

## 2. Ecosistema AmbientApp

Todos los módulos comparten login, `organizationId`, MongoDB Atlas (multi-tenant) y stack MERN.

| Producto | Estado | Descripción |
|---|---|---|
| Valorizapp | Live — valorizapp.ambientapp.cl | Residuos y Ley REP para consultoras |
| CarbonApp | En desarrollo | Huella de carbono Scope 1, 2 y 3 |
| Asistente IA | En desarrollo | Chatbot cumplimiento normativo (Anthropic API + RAG) |
| HídricApp | Próximamente | Huella hídrica |

**Integración clave:** residuos de Valorizapp se auto-importan como Scope 3 Cat. 5 en CarbonApp.

---

## 3. Usuarios objetivo

**Tipo A — Usuario Valorizapp existente**
Accede desde AmbientApp. Datos de residuos ya disponibles. Scope 3 Cat. 5 pre-llenado automático.

**Tipo B — PyME nueva**
Registro directo. Ingreso manual completo vía wizard. Queda integrada al ecosistema.

Perfil: encargado ambiental, jefe de operaciones o dueño PyME, 10–200 empleados, sin formación técnica ambiental necesaria.

---

## 4. Diferenciación competitiva

**Beeok** (principal competidor chileno): IA, ISO 14064, alianza BCI, ~200 clientes en 6 países, ~USD 80–180/mes estimado. Requiere demo. Standalone, no integra residuos.

**Ventajas de CarbonApp:**
1. Integración ecosistémica: carbono + residuos + cumplimiento en un solo flujo
2. Factor SEN nativo, actualizado automáticamente por CNE, desagregado por subsistema
3. HuellaChile como output nativo (Beeok lo cobra como servicio aparte)
4. Self-service real, sin demo obligatoria
5. Precio en CLP, accesible para PyME chilena

---

## 5. Cobertura GHG Protocol

### Scope 1 (MVP completo)
- Combustión estacionaria: gas natural, petróleo, leña, carbón, biomasa, GLP
- Combustión móvil: flota propia (bencina, diesel, GLP)
- Emisiones fugitivas: refrigerantes (R-410A, R-22, R-134a, R-32)

### Scope 2 (MVP completo)
- Electricidad: kWh × factor SEN automático por región (location-based)
- Calor/vapor comprado: simplificado

### Scope 3 (MVP: 7 de 15 categorías)

| Cat. | Estado | Detalle |
|---|---|---|
| 1 — Bienes y servicios comprados | Simplificado | Gasto por categoría × factor sectorial |
| 2 — Bienes de capital | V2 | — |
| 3 — Upstream combustible/energía | V2 | — |
| 4 — Transporte upstream | Incluido | Flete + proveedores principales |
| 5 — Residuos en operaciones | Auto-importado | Desde Valorizapp vía API interna |
| 6 — Viajes de negocios | Incluido | Aéreo, terrestre, alojamiento |
| 7 — Commuting empleados | Incluido | Modo × distancia × N° empleados |
| 8–15 | V2 | Declaradas "no evaluadas" con justificación |

---

## 6. Fuentes de factores de emisión

| Fuente | Uso |
|---|---|
| CNE / Coordinador Eléctrico Nacional | Factor eléctrico SEN anual |
| IPCC AR6 (2021) | Combustión, refrigerantes, residuos |
| DEFRA UK (2024) | Viajes aéreos, transporte de carga |
| MMA Chile | Factores nacionales específicos |
| Factor leña propio | La Araucanía, Biobío, sur de Chile |

Colección MongoDB `emissionFactors`: `source`, `version`, `year`, `category`, `subcategory`, `value`, `unit`, `gwp`.

---

## 7. Colecciones MongoDB
Organization         Empresa (organizationId compartido con Valorizapp)
User                 Rol: admin | editor | viewer
InventoryPeriod      Período de reporte (año, límites)
EmissionSource       Fuente ingresada por el usuario
EmissionFactor       Catálogo de factores
EmissionCalculation  Resultado: dato actividad × factor × GWP
Report               Tipo: pdf | huellachile
Trial                trial_ends_at: Date, plan: String

---

## 8. Flujos de usuario

**Flujo A — Usuario Valorizapp**
Login → selecciona período → auto-import residuos (Scope 3 Cat.5) → wizard S1 → wizard S2 (factor SEN auto) → wizard S3 restante → revisión → dashboard + PDF + HuellaChile

**Flujo B — PyME nueva**
Registro (RUT, CIIU, empleados, región) → configuración → wizard S1 → S2 → S3 → revisión → dashboard + PDF + HuellaChile

---

## 9. Outputs

**Dashboard:** total tCO₂eq, distribución por scope, top 5 fuentes, intensidades (tCO₂eq/empleado, tCO₂eq/MM CLP), comparativo año anterior, alertas S3.

**Reporte PDF:** portada con logo (white-label), resumen ejecutivo, inventario por fuente, factores con fuente/año, declaración categorías no evaluadas, top 3 recomendaciones.

**Expediente HuellaChile:** formulario MMA pre-completado, tablas de actividad y factores con referencias, declaración de límites, checklist complementario, exportación PDF + Excel.

---

## 10. Arquitectura técnica
Frontend    React — cPanel/Banahosting
Backend     Node.js + Express — AWS
Base datos  MongoDB Atlas — shared DB, multi-tenant por organizationId
Auth        JWT compartido con AmbientApp
PDF         Puppeteer o React-PDF
API interna REST: Valorizapp ↔ CarbonApp (mismo backend)
Factor SEN  Scraping/API CNE — actualización anual automatizada

---

## 11. Modelo de precios

| Plan | Mensual | Anual |
|---|---|---|
| Trial (30 días) | Gratis | — |
| Reporte | $34.990 CLP | $29.990 CLP |
| HuellaChile Ready | $69.990 CLP | $58.990 CLP |
| Consultora (10 RUTs, white-label) | $119.990 CLP | $99.990 CLP |

Pago único por reporte: $149.990 CLP (descontable del primer mes HuellaChile Ready si se suscribe después).

Bundle (Valorizapp + CarbonApp + Asistente IA): $79.990/mes (~27% descuento).

**Trial:** 30 días acceso plan Reporte, sin tarjeta. Al vencer: modo lectura (datos visibles, no editables ni exportables). Campo: `trial_ends_at: Date` en `Organization`. Para desactivar globalmente: no asignar el campo en nuevos registros.

---

## 12. Lo que CarbonApp NO hace

- No emite sello HuellaChile (lo emite el MMA)
- No hace verificación ISO 14064 (requiere auditor externo)
- No tramita ante el MMA
- No compensa emisiones
- No da asesoría personalizada de reducción

---

## 13. Decisiones pendientes

- [ ] Validar formato expediente HuellaChile con MMA antes del lanzamiento
- [ ] Definir si factor leña se calcula propio o se usa IPCC directo
- [ ] Confirmar empresas beta (mínimo 2–3, idealmente clientes de Valorizapp)
- [ ] Revisar límite plan Consultora: ¿10 RUTs fijos o precio por volumen?
- [ ] Definir pricing HídricApp cuando comience desarrollo