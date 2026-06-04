# Plan — Rediseño UI "Nueva Cita" (vista única) + identidad teal

> Creado 3 Jun 2026 (modo-dev). Basado en el mockup de Stitch aprobado por Diego (iteración 3:
> app-shell 2 columnas + week-strip + footer sticky + auto-asignación, paleta teal/ámbar + Geist).
> Alcance: SOLO la página `/citas/nueva`. NO se copia el sidebar/top-bar del mockup; se mantiene
> `MainLayout`. Implementar este UI = implementar la unificación funcional ya acordada.

## Qué es el mockup (análisis técnico)

- **App-shell sin scroll de página:** `html,body { overflow:hidden }`. La página llena el viewport;
  SOLO scrollean internamente la lista de servicios y la zona de horarios (cajas de altura fija).
- **2 columnas:** izq = Paciente + Servicios; der = Fecha y hora.
- **Week-strip de 2 semanas** (14 días en grilla de 7) con flechas ‹ ›; día sin cupo tachado.
- **Slots agrupados Mañana/Tarde** en caja con scroll interno; slot seleccionado con ring.
- **Footer sticky:** "Cita programada para" (fecha/hora) · Total (N servicios · L) · Profesionales
  asignados (avatares apilados + badge AUTO + "Ver detalle") · botón "Agendar cita".
- **Identidad:** Material 3 teal (`#00685f`) + ámbar (`#fea619`), fuente Geist, íconos Material
  Symbols, cards blancas con borde-superior teal + sombra suave.

## Integración con el código real (verificado)

- **`MainLayout` NO se toca.** Es `h-dvh overflow-hidden` con un `<main className={mainClassName ?? "overflow-auto"}>`.
  Pasando `mainClassName="overflow-hidden flex flex-col"` desde NuevaCita logramos el app-shell. El
  footer va como hijo `shrink-0` del flex-col (NO `position:fixed` con `left-64`) → se alinea solo
  al área de contenido y respeta el sidebar real. En mobile, `<main>` ya trae `pt-16` por el header.
- **NO replicamos** el sidebar ni el top-bar del mockup (tabs Dashboard/Agenda/Reportes, search,
  "Crear Cita"). Eso es chrome de la app que ya existe en `MainLayout`. Solo rediseñamos el CONTENIDO.
- **Íconos:** seguimos con **lucide-react** (NO Material Symbols) — lucide funciona con cualquier
  color y evita churn de cambiar librería en toda la app. Mapeo 1:1 (calendar_month→Calendar, etc.).

## Implementar el UI = unificar el flujo (lo ya acordado)

El mockup ES la vista única (1+ servicios, sin toggle de modo). Construirlo implica:
- **Disponibilidad:** SIEMPRE `get-visit-slots` (maneja 1..N procedimientos, ya probado en Fase 5;
  devuelve inicios factibles + profesional sugerido + `freeDoctorIds` por procedimiento).
- **Insert ramifica por cantidad:** 1 servicio → `create-appointment` (sin `visit_id`, reagenda
  normal); 2+ → `create-visit` (con `visit_id`, atómico). Preserva el reagendar (no regresión).
- **Auto-asignación:** el profesional menos cargado por procedimiento (ya viene de get-visit-slots).
- **Cambio de profesional por procedimiento:** chips desde `freeDoctorIds` (ya existe en VisitBooking).
- **Degradación:** orgs SIN servicios → mantienen el flujo actual basado en DURACIÓN (fallback). El
  ICP siempre tiene servicios; los clientes actuales también (backfill Fase 1).

## Fases

### Fase 0 — Fundación visual — DESCARTADA (decisión Diego: "solo layout, sin teal")
- **NO** se cambia paleta ni fuente. Se reusan los tokens shadcn (slate) y componentes actuales.
- Solo cambia la **estructura/layout**, no la identidad visual. El teal queda **diferido**: si se
  quiere a futuro es un cambio centralizado en CSS vars (barato), sin re-tocar esta página.

### Fase 1 — Componente unificado (datos + lógica) — 4-6h
- NuevaCita pasa a ser la **vista única basada en servicios**, absorbiendo la maquinaria de
  `VisitBooking` (get-visit-slots, asignación por procedimiento).
- Cablear insert-split (create-appointment / create-visit) por cantidad de servicios.
- Reusar: `PatientSearch`, `listActiveServiceTypesForOrg`, `createPatient`, `pickLeastLoaded`,
  reminder3d, `getVisitSlots`/`createVisitAppointments` (api.supabase), `getQualifiedDoctors`.
- Branch de degradación (sin servicios → flujo duration-based actual).

### Fase 2 — UI nueva (layout + componentes visuales) — 5-7h
- Layout app-shell 2-col vía `mainClassName`. Columnas con cajas de scroll interno.
- **NUEVO** `WeekStrip` (2 semanas navegables, driven por `availableDaysMap`; días sin cupo tachados).
- **NUEVO** footer sticky (resumen + total + profesionales + Agendar) — hijo del flex-col del main.
- **NUEVO** panel "Ver detalle" (timeline de la visita + cambio de profesional por procedimiento).
- Cards estilo mockup (borde-superior teal, sombra). Slots Mañana/Tarde (split por hora <12).
- Reusar `SlotSelector` reestilizado o uno nuevo agrupado.
- Ubicar el toggle **reminder3d** (recomiendo: compacto dentro de la card de Paciente).

### Fase 3 — Estados, mobile, validación — 3-4h
- Estados: vacío (sin servicio → zona fecha bloqueada con hint), cargando, sin slots, error.
- Mobile: 1 columna (Paciente→Servicios→Fecha→Slots) + footer fijo abajo.
- Validación + create + toast + reset. Total = suma de precios de servicios.

### Fase 4 — Limpieza + QA — 2-3h
- Remover `VisitBooking` (absorbido) y código muerto del flujo viejo que ya no aplique.
- Verificar **reagendar intacto** (insert-split). `tsc --noEmit`. QA en vivo (Diego, org prueba).

**Total estimado: ~16-23h** (frontend pesado; backend ya existe — no hay EFs ni migraciones nuevas).

## Decisiones (resueltas)

1. **Theme scope — RESUELTO (Diego 3 Jun): "solo layout, sin teal".** Estructura nueva con el tema
   slate actual; identidad teal diferida. Fase 0 descartada.
2. **reminder3d:** default = toggle compacto en la card de Paciente (confirmar al implementar).
3. **"Categoría" de servicio:** NO se agrega al modelo. Se muestra solo precio + duración.
4. **Top-bar/tabs del mockup:** NO se copian; se mantiene el header de `MainLayout`.

## Refinamientos del review de código (4 Jun) — resuelven huecos plan↔código

Antes de implementar se revisó `NuevaCita.tsx`, `VisitBooking.tsx`, `combinedAvailability.ts`,
`MainLayout.tsx`, los wrappers `getVisitSlots`/`getAvailableDays`/`createVisitAppointments` y
`useSingleDoctor`. Cinco supuestos del plan no cuadraban con el código:

1. **Fuente de datos del week-strip (strike-through de días).** `get-visit-slots` es **per-fecha**;
   NO existe un "visit-days". El strip se alimenta de `getCombinedDays` (unión de profesionales
   calificados sobre los servicios elegidos; duración = **suma total** de la cadena como proxy de
   "¿cabe algo este día?"). Es una **PISTA optimista** en multi-servicio (un día marcado disponible
   puede no tener un inicio donde TODA la cadena quepa); `get-visit-slots` es la **autoridad** al
   hacer click y muestra "sin horarios" limpio. Para 1 servicio (90% de los casos) es exacto. NO se
   hacen 14 llamadas a `get-visit-slots` por navegación de semana.
2. **El strip de 2 semanas cruza meses; los days-EF son por-MES.** Helper nuevo que fetchea los 1-2
   meses que tocan la ventana visible y mergea los mapas (`getAvailableDays`/`getCombinedDays` se
   mantienen por-mes; se llaman 1-2 veces y se unen).
3. **"Una sola vista" = una sola UI, NO una sola fuente de datos.** `get-visit-slots` auto-asigna el
   menos cargado y NO acepta fijar profesional → no sirve para: (a) doctor logueado (queda él mismo),
   (b) org de 1 doctor (los 4 clientes reales), (c) org sin servicios (degradación por duración). El
   **layout es uno** (week-strip + lista de servicios + footer); la **fuente ramifica**:
   - **Path unificado (`get-visit-slots`):** solo ICP = `hasServices && !isDoctorView && !isSingleDoctorOrg`.
     Maneja 1..N servicios + auto-asignación.
   - **Path single-doctor (`get-available-slots` + `get-available-days`, doctor fijo):** doctor
     logueado / org 1-doctor. Si hay servicios, se pasa `serviceTypeId` (resource-aware + duración del
     servicio); profesional fijo, sin auto-asignación. Multi-servicio NO aplica aquí (1 servicio).
   - **Path degradado (duración):** org sin servicios. Selector de duración en vez de servicio.
   Esto **preserva byte-a-byte** el comportamiento actual de Guevara/Yeni/David y de doctores logueados.
4. **Simplificación:** en el path unificado `get-visit-slots` ya devuelve `suggestedDoctorId` +
   `freeDoctorIds` por procedimiento (menos-cargado server-side) → **NO** se usan
   `getDoctorLoadForDate`/`pickLeastLoaded` en cliente. Menos código y menos queries que hoy.
5. **Auto-scroll (`agendarRef`/`fechaRef` con `scrollIntoView`) se ELIMINA** — el app-shell no tiene
   scroll de página; portarlo rompería. El foco se maneja con el layout 2-col (todo a la vista).

**Consecuencia para las fases:** Fase 1 construye el "data hook" unificado con los 3 paths arriba;
Fase 2 monta el layout sobre ese hook. `getCombinedDays` queda como pista (no resource-aware, igual
que hoy el day-view) — limitación cosmética ya aceptada.
