# Estado Desarrollo — OrionCare

> Ultima actualizacion: 23 Jul 2026 (**Fix de UX v7: hueco vertical en modo día completo (mobile)** — Diego reportó, tras el v6, que en modo "día completo" quedaba demasiado espacio entre el calendario y la fila "Bloqueo de N días / Limpiar", solo en mobile. Causa: la raíz de `StepPicker` tenía `flex-1` pensado para el modo "por horas" (repartir espacio entre calendario+horarios); en día completo no hay columna de horarios con quien compartir ese espacio, así que el `flex-1` estiraba el calendario para llenar el alto disponible del Drawer (`h-[100dvh]`, alto fijo real) dejando el hueco antes de la fila resumen. En desktop no se notaba porque el padre (`DialogContent`) usa `display:grid`, donde `flex-1` no tiene efecto (no hay "espacio sobrante" que reciba flex-grow). Fix: `flex-1` ahora condicional a `!fullDayMode` (`cn('flex flex-col lg:flex-row gap-6', !fullDayMode && 'flex-1')`) — modo por horas intacto. Verificado forzando `isMobile=true` temporalmente (mismo método que v6, revertido): hueco desaparecido en día completo, por horas sin regresión. Ver checkpoint ▼ "23 Jul 2026 — Fix hueco vertical v7".)
> Update previo: 23 Jul 2026 (**Fix de UX v6: mockup de Stitch portado (header, toggle segmentado, fila resumen)** — Diego pidió mejorar la UI mobile del modal, escribí un prompt para Google Stitch (adjuntando captura), Diego aprobó el mockup con 4 ajustes puntuales. Implementado en `NewScheduleExceptionModal.tsx`: (1) header del Drawer mobile reducido a solo título + botón X (se quitó la flecha atrás y el texto de descripción debajo del título — también se quitó `DialogDescription` en desktop, que ya tenía su propia X nativa); (2) el `Switch`+`Label` del toggle día-completo/por-horas se reemplazó por un `ToggleGroup` segmentado ("Por horas" | "Día completo", `@/components/ui/toggle-group` ya en el repo); (3) nueva fila compartida "ícono + Bloqueo de N días/horas ... Limpiar" en una sola línea después del picker, en AMBOS modos (antes "Bloqueo de N días" vivía arriba del calendario y "Borrar selección" solo existía en modo día completo, sin equivalente en por horas) — nuevo helper `formatDuration()` para el texto en modo por horas; "Limpiar" en por horas borra solo la hora (mantiene el día elegido), en día completo borra todo el rango. Nota técnica de la sesión: `resize_window` de la herramienta de browser automation NO tomaba efecto en este entorno (viewport seguía en 1920px pese a reportar éxito) — para probar el Drawer mobile real se forzó temporalmente `isMobile=true` en el código (revertido antes de cerrar), confirmando visualmente el header, toggle, fila resumen y el reset de "Limpiar" en por horas. Probado también en desktop real. Ver checkpoint ▼ "23 Jul 2026 — Fix mockup Stitch v6".)
> Update previo: 23 Jul 2026 (**Fix de UX v5: modo "por horas" en una sola vista, confinado a 1 día** — Diego pidió volver a Fase 0: con el modo día completo ya resuelto, el modo "por horas" ya no tenía sentido permitiendo un bloqueo que cruzara medianoche (día de inicio distinto al de fin, heredado del viejo flujo de 2 pasos). Pidió imitar el patrón del modo día completo: un solo día seleccionable, y dentro de ese día elegir hora de inicio/fin en una sola pantalla — si se quiere bloquear "la tarde de hoy y la mañana de mañana", son 2 bloqueos separados. Decisión de Fase 0: el límite "mismo día" queda como convención de UI, no un constraint nuevo de BD (la tabla no distingue tipo de bloqueo). Hallazgo de arquitectura: `StepPicker` ya renderizaba calendario+horarios juntos en una sola vista — el "paso 1/2" vivía en que el modal montaba 2 instancias alternadas, no en el layout; al sacar eso, se eliminó el estado `step` de TODO el componente (ambos modos), simplificando bastante el código. Nuevo `handleTimeRangeClick` reusa el mismo patrón de 2 clicks del rango de días completos (v2) aplicado a horarios (1er click=inicio, 2do posterior=fin, 2do anterior=invierte, con rango completo el siguiente click arranca uno nuevo) — un solo horario no alcanza para un bloqueo válido, a diferencia de un día calendario completo. `handleConfirm` no se tocó: como ahora `endDate` siempre es igual a `startDate` en modo por horas, el resultado cae automáticamente en un rango de 1 solo día. Probado en vivo: rango de horas en una pantalla, inversión, reset con rango completo, cambio de día reinicia hora, bloqueo real verificado en BD (mismo día calendario Honduras), regresión de modo día completo — todo OK. Ver checkpoint ▼ "23 Jul 2026 — Fix por horas v5".)
> Update previo: 23 Jul 2026 (**Fix de UX v4: no mostrar seleccionables los días con citas** — Diego pidió volver a Fase 0 para esto: en modo día completo, un día con citas reales no debería ni aparecer seleccionable (ni como extremo ni "de paso" al extender un rango) — hoy el usuario recién se enteraba del conflicto al confirmar. Decisión de Fase 0 (confirmada con Diego vía pregunta): un día NO laborable pero SIN citas SÍ queda seleccionable (permite armar un rango de vacaciones que cruce un fin de semana libre) — criterio distinto al de `getAvailableDays` (que sí tacha no-laborables, usado solo por el modo "por horas"). Implementado: nueva función `getDaysWithAppointments` en `doctorScheduleExceptionsApi.ts` (mismo criterio de "cita activa" que `checkConflicts`, agregado por mes); `StepPicker` en modo día completo arma su propio `daysMap` sintético con ese criterio (acumulado por cada mes visitado, para que el chequeo funcione aunque el rango cruce meses); `handleRangeDayClick` ahora rechaza (con toast nombrando el día conflictivo) cualquier extensión que "salte" por encima de un día con citas — el dato (`doctor_schedule_exceptions`) es un rango continuo, no se puede excluir un día del medio. Probado en vivo con una cita de prueba insertada y borrada después: día con cita queda tachado, extensión que lo salta se rechaza con el toast correcto, rango válido sin cruzar funciona, modo "por horas" sin regresión. Ver checkpoint ▼ "23 Jul 2026 — Fix día completo v4".)
> Update previo: 23 Jul 2026 (**Fix de UX v3: un solo click bloquea el día** — Diego probó el v2 y señaló que elegir un ÚNICO día requería clickearlo dos veces (1er click=inicio sin fin, 2do click en el mismo día=cierra el rango), "no me parece tan atractivo". Nuevo modelo en `handleRangeDayClick`: sin selección previa, un solo click ya deja `startDate=endDate=ese día` (bloqueo de 1 día YA completo, botón habilitado de inmediato); con selección activa, click antes del inicio extiende hacia atrás, click después del fin extiende hacia adelante, y click DENTRO del rango actual (incluidos los bordes) colapsa a un bloqueo de 1 solo día en ese punto. Se agregó indicador "Bloqueo de N días" bajo la barra DESDE/HASTA (pedido explícito: "indicando que es solo 1 día"). Probado en vivo: single-click, extensión hacia atrás/adelante, colapso a 1 día, cruce de mes, conflicto real — todo OK, verificado en BD. Ver checkpoint ▼ "23 Jul 2026 — Fix día completo v3".)
> Update previo: 23 Jul 2026 (**Fix de UX v2: selector de rango en una sola vista para "día(s) completo(s)"** — Diego probó el fix anterior y encontró que el flujo de 2 pasos heredado del modo "por horas" tenía un bug (apagar el toggle en el paso "fin" dejaba la UI a medias) y no cumplía la UX pedida (quería un date-range picker tipo Airbnb: un solo calendario, click inicio + click fin, resaltado en vivo, sin botón "Seleccionar fecha de fin"). Implementado: `MonthGrid` con nuevo prop `rangeEnd` (resalta inicio/fin/días intermedios, retrocompatible), un solo `StepPicker` en modo día completo con click-to-select-range (inicio→fin, invierte si el 2do click es anterior, reinicia si ya había un rango completo — mismo patrón Airbnb), y reinicio total del flujo cada vez que se cambia el toggle día-completo/por-horas (resuelve el bug de raíz). Probado en vivo: rango simple, inversión, reinicio de rango completo, cruce de mes, conflicto real, reset al togglear, regresión del modo "por horas" — todo OK, verificado en BD. Ver checkpoint ▼ "23 Jul 2026 — Fix día completo v2".)
> Update previo: 23 Jul 2026 (**Fase 4 del "bloqueador de horario" VERIFICADA — feature COMPLETO (Fases 1-4)**. RLS probada en vivo vs prod real: happy path, conflicto, aislamiento doctor-vs-doctor, secretary/admin org-wide, aislamiento cross-org e inmutabilidad — todos OK. Hallazgo documentado, no bug: en orgs hub tipo Hanoy (tenants `admin+doctor_id`, no `role='doctor'`) el aislamiento entre doctores NO aplica — mismo comportamiento ya existente en `appointments`, no una regresion de este feature. Ver checkpoint ▼ "23 Jul 2026 — Fase 4" para el detalle completo y los pendientes que quedan abiertos.)
> Update previo: 22 Jul 2026 (MIERCOLES NOCHE — Fases 1-3 del "bloqueador de horario" ENTREGADAS, COMMITEADAS Y PUSHEADAS (commit `be28561` en `feat/pwa-minimo`). Fase 3 completa: UI desktop (Stitch adaptado a tokens reales, sin editar/sin recurrente/sin resumen del mes) + UI mobile (Drawer fullscreen, calendario colapsable reusando `MonthGrid`, header duplicado eliminado a favor del de `MainLayout` con `backTo`) + fixes de UX en vivo con Diego (toast con pausa-hover+gracia 2s+duracion configurable, bug de `flex-1` que dejaba un hueco en mobile, calendario que no recordaba el mes de la fecha de inicio). Server local (`npm run dev`, puerto 8080) quedo corriendo en background de esta sesion — puede que ya no siga vivo en la proxima.)
> Update previo: 4 Jun 2026 (EN CURSO = **Rediseño UI "Nueva Cita" (vista única)**. **FASES 0-3 ENTREGADAS** (Fases 0-3 commiteadas + **rediseño mobile completo basado en mockups de Stitch, en prod 4 Jun** — último commit 76baaa0): Fase 0 `get-visit-days` (calendario resource-aware, desplegada) + resolver compartido en get-visit-slots; Fase 1 hook `useAppointmentComposer` (3 paths visit-engine/single-doctor/duration + insert-split + ventana de mes); Fase 2 UI app-shell 2-col + `MonthGrid` (calendario mensual con tachado) + footer Auto + overlay de carga + horarios sin scroll; **Fase 3 (4 Jun): footer responsive + hint del siguiente paso + spinner. SEGUIDO de un rediseño mobile extenso iterado con Diego sobre mockups de Stitch (todo en prod, `tsc` OK): bottom-sheet `Drawer` fullscreen para fecha/hora; `MonthGrid` colapsable (mes↔semana, "Expandir"); patrón "todo a la vista" por pasos con badges "Paso N"; paciente que colapsa a tarjeta-avatar (recordatorio integrado, sin chrome en mobile); `ServicePicker` estilo carrito (buscador + chips solo-nombre + cards en 1 línea + est. al lado del título); footer compacto (solo botón hasta elegir fecha/hora; profesional en 1 línea según 1 vs 2+; sin total estimado); Paso 3 unificado en una sola tarjeta tappable. Diego: "me gusta como está, quedan ajustes menores para más tarde".** Plan: `.claude/plans/rediseno-nueva-cita-ui.md` + ajustes en `.claude/plans/ok-mejor-ajustemos-2-dazzling-hare.md`. **Fase 4 — limpieza de código CERRADA 5 Jun** (removidos `VisitBooking.tsx` + `combinedAvailability.ts` huérfanos; reagendar verificado intacto por el insert-split; `tsc` OK). **PENDIENTE solo QA en vivo** de los 3 paths (visit-engine ICP, `single-doctor` con cliente real, `duration` sin servicios) + OK visual desktop — lo hace Diego (requiere app logueada). Verificación técnica pendiente: smoke formal de agendar visita (get-visit-slots tuvo refactor behavior-preserving del resolver). **DIFERIDO (no implementar por ahora):** optimización de performance de disponibilidad (paralelizar queries secuenciales en `_shared/availability.ts` con Promise.all → 2-3x + caché React Query en el hook) y la identidad teal/Geist ("solo layout"). El MOTOR (Fases 0-6 del motor multi-recurso) sigue COMPLETO y en prod; ese rediseño es la capa UI de la Nueva Cita. MCP Supabase disponible. Ver [[motor-agendamiento-es-producto]].)
> Historico sprints + bugs resueltos en `estado-dev-historial.md`
> Plan motor multi-recurso: `.claude/plans/motor-agendamiento-multirecurso.md`
> Plan Coexistence (entregado): `.claude/plans/trabajemos-en-el-coexistence-jaunty-toast.md`
> **EN CURSO (15 Jun): E2E = ENSAYO DEL PLAYBOOK DE ONBOARDING COMPLETO** (con numero de repuesto via Coexistence). Ver seccion ▼ "CHECKPOINT 15 Jun" abajo. NO arrancado — quedo en research del plan de desconexion del numero.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix hueco vertical v7 (modo día completo, mobile)

**Contexto:** apenas cerrado el v6, Diego notó que en modo "día completo" quedaba un hueco vertical grande entre el calendario y la fila "Bloqueo de N días / Limpiar" — solo en mobile, no en desktop.

**Diagnóstico:** la raíz de `StepPicker` (`<div className="flex-1 flex flex-col lg:flex-row gap-6">`) tenía `flex-1` agregado pensando en el modo "por horas" (repartir el espacio entre la columna del calendario y la de horarios). En modo día completo no existe la columna de horarios (`{!fullDayMode && (...)}`), así que ese `flex-1` no tenía con qué compartir el espacio — sencillamente estiraba el bloque del calendario para ocupar todo el alto disponible. Por qué solo en mobile: el body del Drawer vive dentro de `DrawerContent` con `h-[100dvh]` (alto fijo real de pantalla completa) → sí hay espacio sobrante real para que `flex-1` lo consuma. En desktop, el mismo body es hijo de `DialogContent`, que usa `display:grid` — `flex-grow` no tiene ningún efecto en un item de grid (no hay "espacio sobrante" en el sentido flex), así que el mismo código ya se comportaba bien ahí "por accidente" del layout padre.

**Fix (1 línea, `NewScheduleExceptionModal.tsx`):** `flex-1` ahora condicional — `cn('flex flex-col lg:flex-row gap-6', !fullDayMode && 'flex-1')`. Sin cambios para el modo "por horas" (Diego no reportó problema ahí, y ahí el `flex-1` sigue cumpliendo su propósito original).

**Verificado** (mismo método del v6 — `resize_window` sigue sin funcionar en este entorno, se forzó `isMobile=true` temporalmente y se revirtió antes de cerrar, `tsc` limpio + `grep` confirmó cero rastros): hueco desaparecido en modo día completo, modo por horas visualmente idéntico a antes (sin regresión).

**Bloqueador de horario: feature completo + pulido visual**, con los 7 ajustes de esta sesión incorporados y probados.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix mockup Stitch v6: header, toggle segmentado, fila resumen

**Contexto:** Diego pidió mejorar la UI mobile del modal ("no sé cómo, dejémoselo a Stitch"). Le escribí un prompt para Google Stitch describiendo la funcionalidad real (para que no invente campos) y pidiendo mejorar: el toggle día-completo/por-horas, el indicador de días/horas a bloquear, "Borrar selección", y el campo Motivo — todo para que quepa en una sola pantalla en mobile. Diego adjuntó la captura del mockup resultante y pidió 4 ajustes puntuales sobre ese mockup (no una copia literal).

**Los 4 cambios pedidos, implementados en `NewScheduleExceptionModal.tsx`:**
1. Header: solo "Nuevo bloqueo" + botón X. Se eliminó la flecha atrás (y su comportamiento de "volver de paso" — ya redundante desde el fix v5, que sacó los pasos) y el texto de descripción debajo del título, para ganar espacio vertical. En desktop, `DialogContent` ya trae su propia X nativa (`ui/dialog.tsx`) — solo hubo que quitar `<DialogDescription>`. La variable `modalDescription` quedó eliminada por completo (sin uso).
2. Toggle segmentado "Por horas" / "Día completo" con `ToggleGroup`/`ToggleGroupItem` (`@/components/ui/toggle-group`, ya existía en el repo sin usar) en vez de `Switch`+`Label` — track gris con el item activo en fondo blanco + sombra (`data-[state=on]:bg-background data-[state=on]:shadow-sm`).
3 y 4. Fila compartida "ícono + Bloqueo de N días/horas ... Limpiar" en una sola línea (`justify-between`) después del picker (`StepPicker`), en **ambos** modos — antes el indicador de días vivía arriba (junto al DESDE/HASTA) y "Borrar selección" solo existía en modo día completo. Nuevo helper `formatDuration(start, end)` para el texto en modo por horas ("N min" / "N horas" / "Nh Mmin"). "Limpiar" en por horas borra solo `startTime`/`endTime` (el día elegido se mantiene, coherente con que cambiar de día ya reinicia la hora); en día completo borra el rango entero (mismo comportamiento que ya tenía "Borrar selección").

**Nota técnica de la sesión — `resize_window` no funcionó:** la herramienta de automatización de browser reportaba éxito al redimensionar a 390x844 pero `window.innerWidth` seguía en 1920 (verificado con `javascript_tool`) — probablemente la ventana de Chrome está maximizada/gestionada por el OS y CDP no puede forzar el resize. Como el modo mobile de este modal depende de `useIsMobile()` (hook JS, breakpoint 1024px) y no solo de CSS, se forzó temporalmente `const isMobile = true` en el código para renderizar el Drawer real, se verificó visualmente (header limpio, toggle, fila resumen con "Limpiar" borrando solo la hora, calendario colapsable, toast de conflicto intacto, bloqueo real creado y verificado en BD), y se revirtió el cambio antes de cerrar (`tsc` limpio, `grep` confirmó cero rastros del hack). Si hace falta QA visual real de mobile en el futuro, `resize_window` puede no ser confiable en este entorno — mejor pedirle a Diego que pruebe en su celular o achicar la ventana manualmente.

**Bloqueador de horario: feature completo + pulido visual**, con los 6 ajustes de esta sesión (toggle día completo → rango en 1 vista → single-click → no mostrar días con citas → por horas en 1 vista → mockup de Stitch portado) incorporados y probados en vivo (desktop real + Drawer forzado).

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix por horas v5: una sola vista, confinado a 1 día

**Contexto (Diego pidió "volvamos a Fase 0"):** con el modo día completo ya resuelto (v1-v4), Diego notó que el modo "por horas" seguía permitiendo un bloqueo cruzando medianoche (día de inicio ≠ día de fin, heredado del viejo flujo de 2 pasos) — y ya no tenía sentido: si alguien quiere bloquear "la tarde de hoy y la mañana de mañana", ahora hay una herramienta mejor (2 bloqueos, o un rango de día completo).

**Fase 0 (recorrida en conversación, sin tabla nueva):** el día de inicio y fin son siempre el mismo en este modo — un solo calendario. El límite "mismo día" queda como **convención de UI**, no un constraint de BD (`doctor_schedule_exceptions` no distingue "tipo" de bloqueo; agregar eso sería sobre-ingeniería). Dentro del día, el rango de horas usa el mismo patrón de 2 clicks del rango de días (v2) — un solo horario no alcanza para un bloqueo válido, a diferencia de un día calendario completo (que sí es un bloqueo válido por sí solo, de ahí el modelo "1 click" de v3 no aplicaba acá). Cambiar de día reinicia la hora elegida.

**Hallazgo de arquitectura que simplificó todo:** `StepPicker` ya renderizaba calendario+horarios juntos en una sola vista (layout `flex-col lg:flex-row`) — el "paso 1/paso 2" nunca vivió ahí, vivía en que el modal montaba DOS instancias de `StepPicker` alternadas. Al sacar ese alternado, el layout de una sola pantalla que pedía Diego ya existía tal cual. Consecuencia: el estado `step` (`'start'|'end'`) se eliminó de TODO el componente (no solo del modo por horas) — simplificación grande de código (header/footer/body ya no bifurcan por paso en ningún modo).

**Implementación (`NewScheduleExceptionModal.tsx` únicamente):**
- `handleHourDayClick`: elegir un día setea `startDate=endDate=ese día` y limpia `startTime`/`endTime`.
- `handleTimeRangeClick`: mismo patrón de `handleRangeDayClick` v2 (1er click=inicio; 2do posterior=fin; 2do anterior=invierte; con rango completo, el siguiente click arranca uno nuevo) aplicado a horarios en vez de días.
- `StepPicker`: `selectedTime` reemplazado por `startTime`/`endTime` (resalta inicio/fin sólido + horarios intermedios en gris, mismo criterio visual que el calendario); se quitaron `minDate`/`excludeTimesAtOrBefore` (dead code sin el 2do paso).
- `handleConfirm` intacto — como `endDate` siempre es igual a `startDate` en este modo, el cálculo ya existente produce un rango de 1 solo día automáticamente.
- Footer/header simplificados para ambos modos por igual (un solo botón "Crear bloqueo", flecha atrás siempre cierra el modal).

**Verificado en vivo:** rango de horas 14:00-16:00 en una sola pantalla (sin botón de paso); inversión (click en 08:00 con inicio=09:00 sin fin → invierte a 08:00-09:00); con rango completo, click en otro horario arranca selección nueva; cambiar de día reinicia la hora; bloqueo real creado (27 jul 14:00-16:00) → verificado en BD exacto mismo día calendario Honduras, borrado después; regresión del modo día completo confirmada sin cambios. `tsc` limpio, BD sin residuos de prueba.

**Bloqueador de horario: feature completo**, con los 5 fixes de UX de esta sesión (toggle día completo → rango en 1 vista → single-click → no mostrar días con citas → por horas en 1 vista confinado a 1 día) incorporados y probados en vivo.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix día completo v4: no mostrar seleccionables los días con citas

**Contexto (Diego pidió explícitamente "regresa a Fase 0"):** con v1-v3 ya funcionando, Diego notó que en modo día completo se podían seleccionar días que YA tenían citas reales — el único aviso llegaba al confirmar (toast de conflicto del backend), obligando al usuario a "adivinar". Pidió que esos días ni se puedan seleccionar, y que se tenga en cuenta también cuando un RANGO de varios días tiene un día bloqueado de por medio.

**Fase 0 recorrida en conversación** (una oración, actores/permisos, entidades, ciclo de vida, reglas de negocio, casos límite, anti-scope-creep) — sin entidades nuevas, es un criterio de disponibilidad de UI distinto al que ya usa `getAvailableDays`. Única pregunta real cerrada con `AskUserQuestion`: **un día no laborable pero SIN citas queda seleccionable** en modo día completo (no hay conflicto real; permite armar un rango de vacaciones que cruce un fin de semana libre) — decisión de Diego, recomendada.

**Implementación:**
- `getDaysWithAppointments(doctorId, monthStart, monthEnd)` nueva en `doctorScheduleExceptionsApi.ts` — mismo filtro de "cita activa" que `checkConflicts`, agregado por mes completo, devuelve un `Set<string>` de días (`yyyy-MM-dd`, Honduras) con ≥1 cita. Sin `date-fns-tz` (no está en el repo) — conversión manual con offset fijo -06:00 (`hondurasDateStr`), mismo principio que `naiveMsFromInstant()` del backend.
- `StepPicker` (modo día completo): nuevo efecto que llama esa función por cada mes visitado y **acumula** (no reemplaza) el resultado en un Set — necesario para que el chequeo de "rango cruza un día bloqueado" funcione aunque el rango abarque varios meses ya navegados. Arma un `daysMap` sintético (`working:true, canFit:!tieneCita`) en vez de usar `getAvailableDays` (que es el criterio del modo "por horas", no aplica acá).
- `handleRangeDayClick`: al extender el rango (click antes del inicio o después del fin), recorre los días estrictamente entre el límite viejo y el nuevo — si alguno tiene cita, rechaza el click (toast: *"El {día} ya tiene citas agendadas — creá un bloqueo separado para los demás días."*) sin tocar la selección actual.

**Verificado en vivo:** insertada una cita de prueba real en un día de agosto (sin citas demo ese mes) vía SQL directo (bypass de triggers con `session_replication_role=replica`, mismo patrón ya usado para sembrar datos demo) — ese día quedó tachado/no seleccionable; extender un rango que lo cruzaba (18→22) fue rechazado con el toast correcto nombrando el día exacto; un rango válido sin cruzarlo (18-19) funcionó normal; modo "por horas" sin regresión (24 y 28 jul, con citas demo reales, siguen mostrándose disponibles ahí, correcto para ese modo). Cita de prueba borrada al terminar, BD limpia. `tsc` limpio.

**Bloqueador de horario: feature completo**, con los 4 fixes de UX de esta sesión (toggle día completo → rango en 1 vista → single-click → no mostrar días con citas) incorporados y probados en vivo.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix día completo v3: un solo click bloquea el día

**Contexto:** con el v2 ya funcionando (rango en una sola vista), Diego probó y señaló que elegir un ÚNICO día seguía obligando a un doble-click sobre el mismo día (1er click marcaba el inicio sin fin; para cerrar en el mismo día había que volver a clickearlo) — "no me parece tan atractivo". Pidió que un solo click ya deje el día listo para bloquear (indicando visualmente que es de 1 día), y que clickear otro día extienda el rango visualmente sin pasos extra.

**Cambio de modelo (`handleRangeDayClick`, único cambio de lógica):**
- Sin selección previa: 1 click → `startDate = endDate = ese día` (bloqueo de 1 día ya completo, "Crear bloqueo" habilitado de inmediato, sin 2do click).
- Con selección activa: click ANTES del inicio actual → extiende el inicio hacia atrás; click DESPUÉS del fin actual → extiende el fin hacia adelante; click DENTRO del rango actual (incluidos ambos bordes) → colapsa a un bloqueo de 1 solo día en ese punto (forma rápida de achicar/reiniciar sin ir a "Borrar selección").
- Nuevo indicador "Bloqueo de N días" (singular/plural) bajo la barra DESDE/HASTA, calculado con `differenceInCalendarDays` — refuerza visualmente el pedido explícito de Diego ("indicando que es solo 1 día").

**Verificado en vivo (cuenta smoke-test, org demo):**
- 1 click en un día suelto (30 jul) → "Bloqueo de 1 día", botón ya habilitado.
- Click en día anterior (27 jul) → extendió correctamente a "Bloqueo de 4 días" (27-30).
- Click en día intermedio del rango (28 jul) → colapsó correctamente a "Bloqueo de 1 día" en 28.
- Click en día posterior lejano (20 ago) estando en 24 jul → extendió correctamente a "Bloqueo de 28 días" (24 jul-20 ago), cruzando de mes sin perder la selección.
- Bloqueo real de 1 solo día creado (20 ago, sin conflicto) → verificado en BD: `start_at`/`end_at` exactos `2026-08-20 00:00` → `2026-08-21 00:00` Honduras. Borrado después, sin dejar basura.
- Conflicto real (24 jul, 28 jul — ambos con citas demo de julio) → mismo toast de siempre, sin cambios.
- `npx tsc --noEmit` limpio.

**Bloqueador de horario: feature completo**, con los 3 fixes de UX de esta sesión (toggle día completo → selector de rango en 1 vista → single-click) todos incorporados y probados en vivo. Nota: durante las pruebas de v2/v3 se confirmó que Diego seguía usando la misma org/doctor en paralelo para sus propias pruebas manuales (los bloqueos reales que iba dejando cambiaban de sesión a sesión) — nunca se tocaron sus bloqueos, solo los de prueba con reason `test ... QA` creados y borrados en esta sesión.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix día completo v2: selector de rango en una vista

**Contexto:** Diego probó el fix v1 (toggle + flujo de 2 pasos heredado) y reportó dos cosas reales:
1. **Bug de flujo:** con el toggle de día completo prendido y ya en el paso "fin", se podía apagar el toggle — no corrompía datos (el botón de confirmar quedaba deshabilitado porque de golpe exigía una hora nunca pedida) pero dejaba la UI en un estado confuso, a medias.
2. **Pedido explícito de UX** (con ejemplo visual de Airbnb): en modo día completo no debería existir el paso/botón "Seleccionar fecha de fin" — quería un selector de RANGO en una sola vista: click en el día de inicio, click en el día de fin, con el calendario resaltando inicio/fin/días intermedios sin cambiar de pantalla. Y pidió que cualquier cambio del toggle reinicie todo el proceso al paso 1, para nunca quedar "en el aire".

Diego mismo señaló "creo que debemos ir a Fase 0 para esto" — se evaluó como refinamiento de UI (sin schema/RLS nuevos), así que se resolvió con `AskUserQuestion` (layout: un mes + flechas vs. varios meses apilados estilo Airbnb — eligió un mes + flechas, mismo resultado funcional con mucho menor esfuerzo) + plan mode antes de tocar código, sin necesitar la conversación completa de Fase 0 (no hay entidades/roles nuevos).

**Implementación (`MonthGrid.tsx` + `NewScheduleExceptionModal.tsx`, sin tocar Fase 1/2):**
- `MonthGrid`: nuevo prop opcional `rangeEnd?: Date` — retrocompatible (sin él, comportamiento idéntico a hoy; lo siguen usando sin cambios `NuevaCita.tsx` y el modo "por horas"). Con `rangeEnd`, los días estrictamente entre `selectedDate` (inicio) y `rangeEnd` (fin) se resaltan con fondo claro (`bg-primary/15`); inicio/fin mantienen el estilo "seleccionado" ya existente.
- `StepPicker` (ya tenía `fullDayMode` del fix v1): ahora se renderiza **una sola vez** en modo día completo (no una instancia por paso), reenviando `rangeEnd` a `MonthGrid`.
- Nuevo `handleRangeDayClick`: 1er click = inicio; 2do click posterior = fin (rango completo); 2do click anterior al inicio = invierte (el click pasa a ser el nuevo inicio); con un rango ya completo, el siguiente click arranca uno nuevo desde cero — mismo patrón que el date-range picker de Airbnb.
- Nuevo `handleToggleFullDay`: cualquier cambio del toggle (en cualquier dirección, en cualquier momento) reinicia `step`/`startDate`/`startTime`/`endDate`/`endTime` a cero — resuelve el bug de raíz, no con un parche puntual.
- Botón "Borrar selección" (espejo del "Borra las fechas" de Airbnb) para limpiar el rango sin cerrar el modal.
- Footer: un solo botón "Crear bloqueo" en modo día completo (sin paso intermedio); el modo "por horas" sigue exactamente igual (2 pasos, sigue necesitando elegir hora además de día).

**Verificado en vivo (cuenta smoke-test, org demo — no toca clientes reales):**
- Rango simple (27→30 jul): resaltado correcto de inicio/fin/intermedios en una sola vista, sin botón de paso.
- Rango completo + click en otro día → arranca selección nueva (no extiende), igual que Airbnb.
- Click anterior al inicio (sin fin aún) → invierte correctamente (nuevo inicio = el día clickeado).
- **Reproducido el bug original y confirmado resuelto:** con rango elegido, apagar el toggle → reinicio total y limpio (probado explícitamente con cierre por X, ida y vuelta).
- Rango cruzando de mes (30 jul → 10 ago): la selección de inicio persiste al navegar de mes, resaltado correcto en el mes siguiente.
- Conflicto real (30 jul-10 ago con citas existentes) → mismo toast de conflicto de siempre.
- Bloqueo real creado (12-15 ago, sin conflicto) → verificado en BD: `start_at`/`end_at` exactos en `2026-08-12 00:00` → `2026-08-15 00:00` hora Honduras (cubre 12-14 completos). Borrado después, sin dejar basura.
- Regresión: modo "por horas" sigue funcionando exactamente igual (2 pasos, última hora ofrecida 16:30).
- `npx tsc --noEmit` limpio.

**Bloqueador de horario: feature completo, con este fix de UX incluido.** Nota: durante las pruebas se vio que Diego mismo ya había creado un bloqueo real de prueba (27-28 ago) en esta sesión — se dejó intacto, no se tocó.

---

## ▼ CHECKPOINT 23 Jul 2026 — Fix día completo (post-Fase 4)

**Contexto:** apenas cerrada la Fase 4, Diego reportó un problema de uso real (vía Wilmer): con horario 8am-5pm, bloquear el día ENTERO obligaba a elegir como hora de fin las 8am del día SIGUIENTE — "humanamente no tiene sentido".

**Causa raíz confirmada leyendo `NewScheduleExceptionModal.tsx`:** el selector de "hora de fin" reusa `getAvailableSlots` (horarios de INICIO de una cita de 30 min, la misma función del motor de agendamiento). Si el horario cierra a las 5pm, la última hora de inicio válida es las 4:30pm — las 5pm nunca aparecen como opción de fin. La única hora "posterior a todo el día" que ofrece la lista es la primera del día siguiente.

**Fix (solo `src/components/NewScheduleExceptionModal.tsx`, sin tocar Fase 1/2):** nuevo toggle "Bloquear día(s) completo(s)" (`Switch`, patrón ya usado en `NuevaCita.tsx`). Activado: se omite la columna de horarios y `getAvailableSlots` (guard en el `useEffect`); el usuario solo elige día de inicio y día de fin (inclusive); `handleConfirm` calcula `start_at` = medianoche del día de inicio y `end_at` = medianoche del día siguiente al de fin — cubre el/los día(s) completo(s) sin depender de leer el horario real del médico (decisión con Diego: no hacen falta citas fuera de horario de todos modos, [[bot-sin-slots-noche]]). El modo "por horas" queda intacto (mismo código, solo se saltea cuando el toggle está encendido).

**Verificado:**
- `npx tsc --noEmit` limpio.
- QA en browser (`npm run dev`, cuenta smoke-test `dican19+smoketest05@gmail.com`, org demo OrionCare — no toca datos de clientes reales): toggle activado → calendario a ancho completo sin horarios; elegido un rango real (10-14 ago) → creado con éxito; SQL confirmó `start_at`/`end_at` exactos en `2026-08-10 00:00` → `2026-08-15 00:00` hora Honduras (cubre los 5 días completos, medianoche a medianoche). Bloqueo de prueba borrado después, sin dejar basura.
- Conflicto real: intentar día completo que se solapaba con una cita real (Carlos Roberto Fuentes, 25 jul 08:00) → mismo toast de conflicto de siempre (`checkConflicts` sin cambios).
- Regresión: con el toggle apagado, el flujo "por horas" se comporta exactamente igual que antes (última hora ofrecida sigue siendo 16:30 — confirma la causa raíz).

**Pendiente (cosmético, no bloquea, no es de este fix):** la tarjeta de la lista de bloqueos (`DoctorScheduleExceptionsPage.tsx`, `formatRange`) muestra el rango de un bloqueo de día completo como "10 ago 2026 – 15 ago 2026" (usa el `end_at` exclusivo tal cual, un día después del último día real bloqueado) — funcionalmente correcto pero podría confundir visualmente. No se tocó (fuera del alcance de este fix, día completo es nuevo así que no había prioridad previa).

---

## ▼ CHECKPOINT 23 Jul 2026 — Bloqueador de horario, Fase 4 (verificación) CERRADA — feature COMPLETO

**Contexto:** verificación final del bloqueador de horario (origen Wilmer). Sin cambios de código — solo pruebas contra prod real vía SQL MCP (Supabase MCP ya autentica de nuevo, a diferencia del blocker anotado 21 Jul). Todas las pruebas corrieron en transacciones `BEGIN...ROLLBACK` simulando roles reales (`SET LOCAL request.jwt.claims`); tabla confirmada en 0 filas de basura al cierre.

**Hallazgo clave (no es bug, se documenta):** la RLS de `doctor_schedule_exceptions` es un espejo exacto de la de `appointments` (verificado con `pg_policy` en prod) — admin/secretary acceden org-wide a cualquier doctor de su organización, doctor solo a `doctor_id = current_doctor_id()`. Pero `current_doctor_id()` solo resuelve si la fila de `org_members` tiene `role='doctor'` — los tenants tipo hub (Hanoy y su patrón `admin+doctor_id`, [[admin-doctor-role-pattern]]) tienen `role='admin'`, no `role='doctor'`, así que **cada admin+doctor de un mismo hub cae en la rama org-wide y puede ver/crear/borrar los bloqueos del otro**. Confirmado en vivo: Hanoy (`role=admin`) insertó y borró un bloqueo del doctor_id de "Dican" (mismo org hub) sin problema. Es el mismo tipo de gap ya conocido de `whatsapp_line_doctors` (21 Jul) — aislamiento por organización no es aislamiento por doctor en el modelo hub. **No se corrige ahora** (cambiar el modelo de datos del patrón hub es un rediseño mayor, fuera de alcance de este feature); queda documentado para cuando se construya el gate `messaging_enabled` por doctor u otro trabajo que toque aislamiento hub.

**8 casos probados contra datos reales de prod (orgs UNIMED demo `2edd8692...`, Wilmer `c7234d61...`, Hanoy `50149cbe...`):**
1. ✅ Doctor propio (INSERT sin conflicto → SELECT lo ve → DELETE lo borra).
2. ✅ Rechazo por conflicto real con cita `confirmada` — trigger `DOCTOR_SCHEDULE_CONFLICT` dispara con RLS real puesta (no solo en aislamiento como en Fase 1).
3. ✅ Doctor A NO ve/inserta/borra bloqueos de doctor B de la MISMA org (clínica con doctores empleados, `role='doctor'` real, ej. UNIMED demo) — SELECT 0 filas, DELETE 0 filas, INSERT rechazado por RLS (`42501`).
4. ✅ Secretary de UNIMED gestiona bloqueos de doctor A Y doctor B (org-wide, ambos doctores).
5. ✅ Admin de UNIMED — mismo resultado que secretary.
6. ✅ Aislamiento cross-ORGANIZACIÓN: secretary de UNIMED no ve/borra/inserta bloqueos del doctor de Wilmer (otra org) — SELECT/DELETE 0 filas, INSERT rechazado por RLS.
7. ✅ Inmutabilidad: admin de UNIMED intenta UPDATE sobre un bloqueo existente → 0 filas afectadas (sin policy de UPDATE, deny-by-default incluso para admin).
8. ⚠️ Caso hub (Hanoy vs "Dican", ambos `admin+doctor_id` del mismo org) → acceso cruzado exitoso — comportamiento esperado dado el hallazgo de arriba, no un fallo de esta verificación.

**UI/rutas (lectura de código, ya confirmado sin ejecutar navegador):**
- Ruta `/admin/doctors/:doctorId/bloqueos` permite `admin/doctor/secretary` (`App.tsx:317`) — correcto.
- **Reconfirmado: no existe entry point de UI** para que admin/secretary gestionen el bloqueo de OTRO doctor — `ConfiguracionMedico.tsx` solo linkea al propio `user.doctorId`. Ya estaba anotado como backlog deliberado desde Fase 2/3; se cierra Fase 4 sin construirlo (se agrega cuando un caso real lo pida, ej. cuando Hanoy tenga inquilinos activos que necesiten que ella gestione bloqueos de otros).

**Bloqueador de horario: feature CERRADO (Fases 1-4).** Pendientes que quedan en el backlog general (no bloquean el cierre):
- [ ] Entry point UI admin/secretary para gestionar bloqueo de otro doctor (diferido, sin caso real aún).
- [ ] Verificación de campo de `get-visit-slots`/`get-visit-days` (motor multi-recurso) con una org multi-recurso real — heredado de Fase 2, sigue pendiente.
- [ ] Gap de aislamiento hub (admin+doctor comparte acceso org-wide) — mismo gap que `whatsapp_line_doctors`; no se ataca aislado, se revisa si/cuando se construya el gate `messaging_enabled` por doctor u otro trabajo de aislamiento hub más amplio.

---

## ▼ CHECKPOINT 22 Jul 2026 (NOCHE) — Bloqueador de horario, Fase 3 (UI desktop + mobile) ENTREGADA, COMMITEADA Y PUSHEADA

**Contexto:** continuacion de Fase 2 (mismo dia). Diego genero mockups en Stitch (desktop y mobile) y pidio portarlos, con la regla ya establecida: Stitch es referencia de layout, no literal — se adapta a los tokens reales de la app y a las decisiones ya tomadas en Fase 0 (sin editar, sin recurrencia, sin campo "tipo").

**Desktop — `DoctorScheduleExceptionsPage.tsx` + `NewScheduleExceptionModal.tsx` (nuevo):**
- Pagina: bento-grid (lista + nota inline con el titulo, sin "Resumen del mes" — se quito a pedido de Diego tras una iteracion).
- Modal de 2 pasos (elegir inicio → elegir fin) en un `Dialog` centrado, reusando `MonthGrid` (calendario, ya existia del rediseño Nueva Cita) + `getAvailableDays`/`getAvailableSlots` (ya existian) para mostrar SOLO horarios realmente libres. Conflictos con citas reales se muestran en un toast (no bloquean con alert inline).
- Bug real encontrado y corregido en vivo: cada paso del wizard remonta su propio `MonthGrid`, pero el paso "fin" arrancaba siempre en el mes actual en vez del mes de la fecha de inicio ya elegida — se agrego `initialAnchor` + `key` por paso para forzar remount con el mes correcto.

**Mobile — mismo modal, misma pagina, sin duplicar logica:**
- `useIsMobile()` (`src/hooks/use-mobile.tsx`, ya existia, breakpoint 1024px) decide el cascaron: `Dialog` en desktop, `Drawer` a pantalla completa en mobile — mismo patron ya usado en `NuevaCita.tsx`/`MobileDateTime`.
- Calendario colapsable en mobile: se reuso tal cual la prop `collapsible` de `MonthGrid` (ya construida para el rediseño mobile de Nueva Cita) — al elegir el dia se colapsa a la tira de la semana; el paso "fin" siempre remonta con `selectedDate` vacio, asi que "vuelve a mostrarse completo" salio gratis sin logica nueva.
- Bug de UX encontrado en vivo: las 2 columnas del picker (calendario/horarios) usaban `flex-1` sin prefijo — en desktop reparte ANCHO (correcto), pero en mobile (`flex-col`) forzaba a cada bloque a estirarse a la mitad del ALTO disponible del Drawer, dejando un hueco enorme entre el calendario colapsado y los horarios. Fix: `lg:flex-1` (sin flex-grow en mobile).
- Header duplicado quitado en mobile: `MainLayout` ya renderiza su propio header con flecha atras + titulo cuando se le pasa `backTo` (patron ya usado en otras paginas) — se le agrego `backTo="/configuracion"` y el bloque propio de la pagina (Volver + H1 + subtitulo) quedo oculto por debajo de `md` (antes duplicaba todo en mobile).

**Toasts (`src/components/ui/toast.tsx`) — reescritos con timer manual, afecta TODA la app:**
- Duracion base 10s, con pausa mientras el mouse esta encima (nunca desaparece en hover, incluso pasado el tiempo) y gracia de 2s desde que el mouse sale SI el tiempo ya se habia cumplido en pausa — Radix nativo no da esa gracia fija, por eso el timer se armo a mano (el `duration` que se le pasa a Radix ahora es un respaldo enorme que nunca deberia disparar).
- `duration` configurable por llamada (`toast({..., duration: 5000})`) — el toast de "Bloqueo creado" quedo en 5s, el resto en el default de 10s.
- Boton de cerrar (X) paso de "solo visible en :hover" a "siempre visible, mas opaco al hacer hover/focus" — en touch/mobile el hover no se dispara de forma confiable y quedaba invisible hasta el primer tap.

**Commit y push:** `be28561` en `feat/pwa-minimo`, pusheado a origin. Se escogieron a mano los 16 archivos de esta feature (schema Fase 1, motor Fase 2, UI Fase 3, memoria, CLAUDE.md) — se dejaron afuera deliberadamente archivos sueltos sin trackear de otras sesiones de Diego (facturas, docs de ventas, leads, etc.) para no mezclarlos en este commit.

**Tareas activas (post Fase 3):**
- [ ] **Fase 4** (proxima sesion): verificar como admin/secretary/doctor + aislamiento cruzado entre doctores de una misma org (caso hub, ej. Hanoy)
- [ ] Verificacion de campo pendiente (heredada de Fase 2): `get-visit-slots`/`get-visit-days` (motor multi-recurso) con una org real
- [ ] Entry point para que admin/secretary gestionen el bloqueo de OTRO doctor — deliberadamente no construido (no existe pantalla "lista de doctores" en el admin), se agrega cuando un caso real lo pida
- [ ] Vista mensual (Hanoy + UNIMED + Wilmer probable) sigue en el backlog de modo-estrategia, aparte de este feature

---

## ▼ CHECKPOINT 22 Jul 2026 — Bloqueador de horario, Fase 2 (motor + capa de datos) ENTREGADA Y VERIFICADA

**Contexto:** continuacion de Fase 1 (mismo dia). Objetivo: hacer que `doctor_schedule_exceptions` realmente excluya slots del motor de disponibilidad, y construir el hook de datos para la UI de Fase 3.

**Hallazgo que cambio el alcance:** al mapear donde se arman los "intervalos ocupados", aparecieron 4 puntos (no 3): `getAvailableSlotsForDate`, `loadVisitDayState`, `loadVisitRangeState` (los 3 en `_shared/availability.ts`) y **`get-available-days/index.ts`**, que NO delegaba al shared (solo importaba `enumerateSlots`) — tenia su propia copia inline de carga de horarios y de intervalos ocupados. Es la funcion que sirve el tachado del calendario mensual para orgs simples, **la de Wilmer incluida** (el caso que origino el feature). Se le pregunto a Diego si parchear la 4ta copia o refactorizarla para que delegue como las otras 3 — eligio el refactor completo.

**Backend — `_shared/availability.ts`:**
- Nuevo helper `loadScheduleExceptions(supabase, doctorIds, rangeStartDate, rangeEndDate)` — trae bloqueos de `doctor_schedule_exceptions` que se solapan con el rango (ambos extremos inclusivos), agrupados por doctor.
- **Detalle critico de correctitud:** `start_at`/`end_at` son `timestamptz` reales, pero TODO el resto del motor construye tiempos "naive" (sin zona, via `buildDateTime(date, time)` interpretados bajo la zona del proceso Deno). Comparar ms de un timestamptz real contra ms naive se habria desalineado silenciosamente por el offset Honduras↔proceso. Se agrego `naiveMsFromInstant()`: reinterpreta el instante real en hora Honduras y lo re-construye via `buildDateTime` para caer en el mismo espacio numerico que el resto del archivo. Sin este paso el feature habria "funcionado" en dev sin errores pero bloqueado las horas equivocadas en produccion — bug silencioso exactamente del tipo que el flujo de Fase 0 (BD→hook→UI) busca prevenir.
- Las excepciones son **personales**: se cargan solo para el doctorId cuyo slot se calcula, nunca para sus co-workers (a diferencia de las citas, que si ocupan el recurso/cubiculo compartido) — importante para el caso hub (Hanoy).
- Integrado en los 3 puntos existentes + `get-available-days` (ver abajo). `loadSchedulesAllDows` gano un parametro opcional `calendarId` (ya lo tenia `loadSchedules`) para que el refactor de `get-available-days` pudiera reusarlo sin perder la variante "calendario especifico".

**Backend — refactor `get-available-days/index.ts`:** reemplazadas sus 2 copias inline (carga de horarios, resolucion de co-working) por `loadSchedulesAllDows`/`loadCoworkDoctorIds` del shared. Antes de tocar nada se verifico en BD si el edge case de comportamiento distinto (doctor con `calendar_doctors` pero cero `calendar_schedules`) existe en produccion: **si existe (2 filas)**, pero ambos son doctores de PRUEBA en una org de prueba ("OrionCareEditado") y ambos tienen tambien 0 `doctor_schedules` — se probo matematicamente que la divergencia es inerte (el dia ya se marca `working:false` antes de que la resolucion de co-working importe). Refactor confirmado seguro para todos los casos reales.

**Frontend:** `src/lib/doctorScheduleExceptionsApi.ts` (listExceptions, checkConflicts, createException, deleteException — patron real de `promotionsApi.ts`) + `src/hooks/useDoctorScheduleExceptions.ts` (patron real de `usePromotions.ts`, useState+useCallback+useEffect). `createException` corre `checkConflicts` ANTES del insert (camino principal de UX con lista legible de citas); el trigger de Fase 1 queda como red de seguridad atomica para condiciones de carrera genuinas.

**Deploy:** 5 funciones via CLI (`npx supabase functions deploy <fn> --project-ref soxrlxvivuplezssgssq`, con `--no-verify-jwt` donde correspondia): `get-available-slots` (verify_jwt=true, sin cambio), `get-visit-slots` (true, sin cambio), `get-visit-days` (false, preservado), `get-available-days` (false, preservado), `bot-handler` (false, preservado — redeploy necesario porque bundlea `_shared/availability.ts`). Verificado con `list_edge_functions` que ningun flag `verify_jwt` cambio sin querer (leccion del outage de 17 Jun).

**Verificacion en vivo (datos reales de Wilmer, sin dejar basura):**
1. `get-available-days` para agosto 2026 → `2026-08-03` (lunes, sin citas): `working:true, canFit:true`.
2. INSERT real de un bloqueo cubriendo todo el 3 de agosto (zona Honduras) → mismo dia ahora `working:true, canFit:false`.
3. DELETE del bloqueo → dia vuelve exactamente a `canFit:true`. Tabla confirmada en 0 filas al cierre.
4. `get-visit-slots`/`get-visit-days` (motor multi-recurso) NO se probaron end-to-end en esta sesion (requieren JWT de usuario real / payload de servicios mas complejo) — su logica comparte el mismo helper `loadScheduleExceptions` ya probado y fue revisada linea por linea, pero queda como verificacion pendiente de campo cuando se pruebe con una org multi-recurso real (ej. Hanoy).

**Tareas activas (post Fase 2):**
- [ ] Fase 3: UI para crear/ver/borrar bloqueos (Diego pidio cuidar la UX del rango — "desde una hora especifica hasta semanas", experiencia smooth)
- [ ] Fase 4: verificar como admin/secretary/doctor + aislamiento cruzado entre doctores de una misma org (caso hub)
- [ ] Verificacion de campo pendiente: `get-visit-slots`/`get-visit-days` con una org multi-recurso real
- [ ] Commit pendiente — Diego pidio commitear todo junto al cerrar el feature completo, no por fase
- [ ] Al final: levantar server local para QA de Diego (pedido explicito de la sesion)

---

## ▼ CHECKPOINT 22 Jul 2026 — Bloqueador de horario, Fase 1 (schema+RLS+trigger) ENTREGADA

**Contexto:** Wilmer (cliente ancla) reportó que pacientes agendan en horas donde tiene compromisos personales, sin forma de bloquearlas. Primer feature nuevo desde que se cerró el feature freeze — y primero en seguir el flujo de desarrollo formalizado hoy en `CLAUDE.md` (Fase 0 Define → Fase 1 Schema/RLS → Fase 2 Datos → Fase 3 UI → Fase 4 Verificación), adaptado del framework de Aurora PMS (otro proyecto propio) a los patrones reales de este repo.

**Fase 0 (definición, cerrada en conversación con Diego):** el bloqueo es un rango continuo `start_at`/`end_at` (de horas a semanas), NO recurrente. Doctor gestiona el suyo; admin/secretary gestionan cualquiera de su org; un doctor nunca toca el de otro doctor de la misma org (aislamiento — relevante para hubs tipo Hanoy). Si hay citas `agendada`/`confirmada` solapadas, la creación se RECHAZA (no se cancela nada automático). Sin edición (se borra y se crea de nuevo). Fuera de alcance: recurrencia, notificación automática al paciente, y la integración con el motor de disponibilidad (Fase 2).

**Verificado antes de diseñar:** Wilmer NO usa el motor multi-recurso (0 recursos, 1 calendario, org simple) — el bloqueador debe funcionar igual para orgs multi-recurso (Hanoy) pero no toca el trigger de capacidad de recursos (eje independiente). Confirmado que `bot-handler` ya NO duplica el algoritmo de slots — su `getAvailableSlotsForDate` local es un wrapper que delega 100% a `computeAvailableSlots` de `_shared/availability.ts` (import aliased línea 21, delegación línea 3934) — un solo punto de integración en Fase 2, no dos.

**Fase 1 — entregada y verificada en prod:**
- Migración `supabase/migrations/20260722120000_add_doctor_schedule_exceptions.sql`, aplicada vía MCP.
- Tabla `doctor_schedule_exceptions`: `doctor_id`, `start_at`/`end_at` (timestamptz), `reason` opcional, `created_by` (solo auditoría), `created_at`. `CHECK (end_at > start_at)`. Sin `organization_id` propia (resuelve vía `doctor_id → doctors.organization_id`, igual que `doctor_schedules`). Sin `updated_at`/UPDATE policy — inmutabilidad real a nivel DB (se borra y se crea, no se edita).
- RLS (SELECT/INSERT/DELETE): mirror del patrón real de `appointments` (admin/secretary org-wide vía `get_user_organizations`, doctor restringido a `doctor_id = current_doctor_id()`) — **NO** el patrón más restrictivo de `doctor_schedules` (que solo permite gestionar a `admin`). Decisión explícita de Diego, documentada para que no se lea como inconsistencia accidental.
- Trigger `BEFORE INSERT` (`validate_doctor_schedule_exception_conflicts`, mismo estilo que `validate_appointment_resource_capacity` del motor): rechaza con `RAISE EXCEPTION 'DOCTOR_SCHEDULE_CONFLICT: ...'` si hay citas activas solapadas. Probado en transacciones con ROLLBACK sobre datos reales de Wilmer: caso con solape → rechazado correctamente; caso sin solape → insertado correctamente. Tabla queda en 0 filas (sin basura de test).
- Defensa doble documentada para Fase 2: el trigger es la red de seguridad atómica; el hook debe hacer un pre-chequeo de lectura (join a `patients`) ANTES del insert para mostrarle al usuario la lista legible de citas en conflicto (el trigger solo devuelve UUIDs).
- Advisors de seguridad: 0 ERRORs nuevos. Sí aparece un WARN nuevo (`validate_doctor_schedule_exception_conflicts` ejecutable por `anon`/`authenticated` vía RPC) — **mismo WARN preexistente que ya tiene** `validate_appointment_resource_capacity` (funciones-trigger de este estilo siempre lo generan; llamarlas fuera de un trigger real falla porque referencian `NEW`, es inofensivo). No es una regresión nueva, es la clase de warning ya aceptada para este patrón.
- Types regenerados (`generate_typescript_types` vía MCP) y escritos a `src/integrations/supabase/types.ts`. `npx tsc --noEmit` limpio.
- Plan completo (contexto, verificación contra código real, DDL, justificación de cada decisión no trivial) en `C:\Users\dican\.claude\plans\happy-weaving-puffin.md`.

**Pendiente (próxima sesión):**
- Fase 2: hook + pre-chequeo de conflictos legible + wiring del filtro de exclusión en `_shared/availability.ts` (los puntos reales a tocar: `getAvailableSlotsForDate`, `loadVisitDayState`, `loadVisitRangeState`, `loadSchedulesAllDows` — todos consumen `loadSchedules()`/ventanas por día, ahí es donde restar las excepciones).
- Fase 3: UI para crear/ver/borrar bloqueos (Diego pidió explícitamente cuidar la UX — "que sea una experiencia smooth" para elegir desde una hora específica hasta semanas).
- Fase 4: verificar como admin y como `secretary`/`doctor`; probar aislamiento cruzado entre doctores de una misma org (caso hub).
- Después/en paralelo: vista mensual (Hanoy + UNIMED + Wilmer probable) — reutiliza `MonthGrid` (`src/components/MonthGrid.tsx`), agenda principal vive en `AgendaSemanal.tsx` + `useWeeklyAgenda.ts`.

---

## ▼ CHECKPOINT 21 Jul 2026 (NOCHE) — Instalación Hanoy: specialties, admin+doctor, MCP Supabase roto

**Specialties:** tabla `specialties` ya tenía "Cirujano Dentista" (cubre odontología general — Hanoy queda resuelta sin cambios). Faltan subespecialidades dentales (Ortodoncia, Endodoncia, Periodoncia, Odontopediatría, Cirugía Oral y Maxilofacial, Prostodoncia, Implantología, Odontología Estética) — SQL con `WHERE NOT EXISTS` preparado y entregado a Diego, no urgente, no corrido aún.

**Usuario admin+doctor de Hanoy creado:** `hanoymedina@orioncare.app`, siguiendo el patrón documentado en `[[admin-doctor-role-pattern]]` — creado como doctor desde la UI (dispara `create-user-with-role`), luego upgrade a admin vía `UPDATE org_members`/`UPDATE user_roles` (nunca 2 filas separadas).

**Blocker nuevo: Supabase MCP no autentica.** `mcp__plugin_supabase_supabase__authenticate` devuelve una URL de OAuth que Meta... digo Supabase rechaza con `{"message":"Unrecognized client_id"}` — problema de configuración del client_id del plugin contra el OAuth server de Supabase, no algo que se arregle reintentando ni desde este lado. Mientras tanto, todo el trabajo de DB de la sesión se hizo dándole el SQL a Diego para correr directo en Supabase Studio (funciona bien, solo más manual). Revisar la config del plugin en otra sesión si se quiere acceso directo a futuro.

---

## ▼ CHECKPOINT 21 Jul 2026 — Scoping de mensajería por doctor: gap CONFIRMADO, fallback solo-Hanoy hoy

**Contexto:** verificación urgente pre-instalación Hanoy (hoy 21 Jul tarde/noche, org con 4 médicos: ella + 3 inquilinos Free).

**Hallazgo (confirmado leyendo código, no solo memoria):** ni `send-reminders`, ni `send-reminder-followup`, ni `auto-cancel-unconfirmed` filtran por doctor — los 3 solo gatean a nivel `organization_id` (`messaging_enabled` / `auto_cancel_enabled` son columnas de `organizations`, no de `doctors`). `messaging-gateway.getActiveLine()` (línea 99-123) resuelve la línea de WhatsApp únicamente por `organization_id` — toma "la línea activa de la org", sin noción de doctor. `whatsapp_line_doctors` existe pero solo la usa `bot-handler` para el menú del bot y `calendar_id`, nunca los crons de salida. **No existe ningún flag de mensajería a nivel doctor en el schema.** Conclusión: si hoy se cargan los 3 inquilinos con pacientes/citas reales, mañana el cron de recordatorios dispara mensajes por el número de Hanoy para sus citas — el riesgo exacto que se quería evitar.

**Decisión tomada:** instalar HOY solo la cuenta de Hanoy (sin los 3 inquilinos). Cero código bajo presión de reloj.

**Arquitectura evaluada para el fix (Diego preguntó explícitamente):**
- ❌ **Org separada por médico + calendario compartido entre orgs** — INCORRECTA. El cubículo compartido de Hanoy solo funciona porque el motor multi-recurso reserva DENTRO de una org (mismo patrón Orthos/Skin Medic). Separar en orgs obligaría a inventar "reserva de recurso compartido entre orgs" = reconstruir el problema de TimeTree dentro del propio producto. Descartada.
- 🔜 **Línea de WhatsApp separada por doctor dentro de la MISMA org** — dirección correcta a futuro (el schema ya lo insinúa: `whatsapp_line_doctors` dice "una línea sirve N doctores"), pero es de más alcance que lo que hace falta ahora (implica número propio del inquilino + extender `getActiveLine()` para resolver por doctor + Coexistence por línea). Se construye SOLO si algún inquilino sube a Pro con línea propia (test de precio a 60 días, aún N=0) — no antes.
- ✅ **Fix correcto para AHORA: gate `messaging_enabled` por doctor** (Free = false, Pro/single-doctor legacy = true por default). Resuelve el 100% del riesgo de los 3 inquilinos sin tocar arquitectura de líneas.

### Backlog — Tarea pendiente (próxima sesión de dev, NO urgente, no bloquea nada)

**Gate `messaging_enabled` por doctor — estimado ~1.5-2h:**
1. Migración: columna `messaging_enabled BOOLEAN DEFAULT true` en `doctors` (default true preserva comportamiento de clientes actuales — Wilmer, Yeni, etc.) — ~15 min
2. Gate en los 3 crons: filtrar `appointments` por `doctors.messaging_enabled = true` (embedded filter vía PostgREST, mismo patrón repetido 3 veces) — ~45-60 min
3. Defensa doble en `messaging-gateway`: mismo patrón que el kill switch de `organizations.messaging_enabled` que ya existe (línea ~281-317), ahora a nivel doctor — ~15-20 min
4. Deploy 4 functions (`--no-verify-jwt`) + QA: verificar que Wilmer/Yeni siguen recibiendo recordatorios normal (regresión) y que un doctor de prueba con el flag en `false` no recibe nada — ~20-30 min

**Relacionado:** mismo hueco que la tarea pendiente **#16 `doctor_subscriptions`** (anotada desde 21 May) — este caso (Hanoy) es la razón real para construirlo. Al construir el gate, cargar los 3 inquilinos con `messaging_enabled = false` explícito.

**Trigger para retomar:** cuando Diego quiera activar el Free multi-médico completo para los inquilinos de Hanoy (no antes del gate).

---

## ▼ CHECKPOINT 18 Jul 2026 — PWA mínimo ENTREGADO (PR #74) + pendientes críticos del lunes para instalación Hanoy

**Contexto:** Hanoy Medina cerrada en modo-estrategia ($15, instalación MARTES 21 Jul PM); pidió "que fuera un app" → se reactivó el PWA (estaba en diferidos) con alcance mínimo.

**PWA mínimo HECHO (rama `feat/pwa-minimo`, commit `dc17d9b`, PR #74 abierto a main):**
- Hallazgo: `vite-plugin-pwa` YA estaba activo (commit `eae0514`, perf/cache, `autoUpdate`) — solo faltaba la capa instalable.
- Cambios: `manifest` completo en el bloque `VitePWA` (standalone, es, theme #6366f1/bg #f9fafb, 3 íconos) + íconos generados del `Logo OrionCare.png` 1024px (192/512 any, 512 maskable con logo al 80% sobre blanco, apple-touch-icon 180 — script System.Drawing en scratchpad, cero deps nuevas) + `index.html` (theme-color, apple-touch-icon, lang es).
- Verificado: `tsc` OK, build OK, `dist/manifest.webmanifest` correcto con íconos + link inyectado + registerSW; SW precachea los PNG solos (globPatterns ya incluía png).
- ✅ **PR #74 MERGEADO el mismo 18 Jul (20:17 UTC) → prod Vercel. QA APROBADO por Diego en AMBOS dispositivos (Android + iPhone) el mismo día** — se instala como app con logo y abre standalone. CERRADO; el martes solo queda instalar el ícono en el celular de Hanoy.
- FUERA de alcance (deliberado): push notifications (= "avisar al médico de cita nueva", libro de demanda junio), offline custom.

**⚠️ Deuda nueva anotada:** con SW activo, TODO diagnóstico de P0 frontend (tipo 29 Jun bundle viejo) debe incluir "desregistrar SW / hard reload" — el SW puede servir bundle cacheado post-redeploy; `autoUpdate` mitiga, no elimina.

**PENDIENTES CRÍTICOS LUNES 20 (pre-instalación Hanoy, ver estado-estrategia Sesión 18 Jul):**
1. **Scoping de mensajes por doctor** — la org Hanoy tendrá 4 médicos (ella + 3 inquilinos Free con app completa: sus pacientes/citas reales) pero SOLO las citas de Hanoy pueden disparar mensajes por su línea. Verificar cómo gatean `whatsapp_line_doctors` los crons (send-reminders, auto-cancel, followup) y el bot. **Sin esto verificado NO se activa el Free multi-médico el martes** (fallback: instalar solo-Hanoy, inquilinos después).
2. **Visibilidad entre médicos independientes** — qué ve un user doctor-role de pacientes/citas ajenos (pacientes pertenecen a la org; son negocios independientes).
3. **Org Hanoy en DB** — patrón Orthos: 1 recurso (cubículo compartido por TODOS) + 4 calendarios profesionales (1 por médico, [[calendario-por-profesional-multirecurso]]) + admin+doctora 1 fila + super-admin custodio.
4. **Landing de Hanoy** (no tiene sitio web) — **EN ESPERA de que mande nombre/logo (listado ya enviado 18 Jul)**; apenas llegue: armar + deploy subdominio orioncare.app + URL a su Business Info (reloj de Meta corriendo — si manda domingo, se arma domingo).

**Nota de repo al cierre:** working tree quedo parado en `feat/pwa-minimo` (ya mergeada a main). Proxima sesion: `git checkout main && git pull` antes de trabajar.

---

## ▼ CHECKPOINT 14 Jul 2026 — Fix iPad + barrido de pendientes (casi todo se auto-resolvió)

**Fix del día — diálogo "Crear nuevo paciente" tapado por teclado del iPad (commit `a6ceaae`, mergeado a main en PR #73):** en iPadOS el teclado virtual NO encoge el layout viewport, solo el visual → el `DialogContent` centrado (`top-[50%] translate-y-[-50%]`) queda detrás del teclado en landscape. Fix local en `NuevaCita.tsx`: `className="top-8 translate-y-0"` (anclado arriba). NO se tocó `ui/dialog.tsx` (habría movido todos los modales). QA visual en iPad pendiente; mientras, Diego presenta en vertical. Si reaparece en otro diálogo con inputs, mismo patrón.

**Barrido de pendientes viejos (verificado por SQL/git 14 Jul):**
- ✅ **Demo Bot (línea `79bff173`) ACTIVO y funcionando** — `is_active=true, bot_enabled=true`, respondió mensaje real hoy 6:07am TGU (status `read`). GOTCHA #1 del 1 Jul cerrado. La otra línea de la org test (`dd2cff9d`, +504 9529-1151) quedó inactiva — sin conflicto de inbox.
- ✅ **Drift rama vs main RESUELTO** — PR #73 mergeado 14 Jul 8:03am; `origin/main` == rama (incluye fix PageTracker `a37e043` + fix iPad `a6ceaae`). La referencia "#85" que circulaba en memoria estaba desactualizada (los PRs reales fueron #67-73).
- ✅ **Cron jobid 7 (11am) NO es bug** — el comando SÍ tiene el literal `'<ANON_KEY>'`, pero `message_logs` muestra reminder_24h saliendo a las 11am TGU a diario (verificado 23 Jun-13 Jul). Funciona porque `send-reminders` está `verify_jwt=false` (el header basura se ignora). NO tocar. Caveat: si esa función se redeployara sin `--no-verify-jwt`, este job muere.
- ✅ **Datos demo julio inertes confirmados** — 106 citas (87 conf + 19 cancel) hasta 31 Jul; las 63 futuras tienen `reminder_3d_enabled=false` (aunque `reminder_3d_sent=false`, el enabled las protege) y 0 mensajes enviados jamás a esas citas. SE QUEDAN — la presentación de Diego al médico sigue pendiente (14 Jul).
- **Decisión Diego 14 Jul: org E2E-TEST (`33e6cad8`) SE MANTIENE** (residuo mínimo: 8 citas, 1 paciente, 3 profesionales + config motor ICP sembrada). Se reusa cuando se retome el ensayo del playbook de onboarding. Script de cleanup sigue listo en el plan (Apéndice A).

**Cierre de sesión — backlog revisado completo y DIFERIDO deliberadamente (decisión Diego):** con 1 solo cliente pagando y feliz, no vale la pena invertir en el backlog ahora (seguridad advisories, PWA, SuperAdminRoute, limpiezas). Se retoma en otra sesión cuando el negocio lo justifique. No insistir ([[no-insistir-pendientes-diferidos]]). Sin cambios en el orden del backlog — sigue como está listado abajo.

---

## ▼ CHECKPOINT 6 Jul 2026 — Bug encontrado en análisis de bot (Wilmer): hora libre en `booking_select_hour` no coincide con confirmación

**Contexto:** análisis de bot_conversation_logs de Wilmer (modo-estrategia, no modo-dev — no se investigó el código, solo se detectó vía datos). **NO se toca hasta después del feature freeze / cuando encaje con otro trabajo del motor**, solo queda documentado.

**Caso real (sesión `825312d1`, 30 Mar 17:03):** paciente en flujo de reagendar, en el paso `booking_select_hour` escribe **texto libre "9 am"** en vez de elegir el número de la lista de horarios. El resumen de confirmación que el bot muestra a continuación dice **12:00 PM** (no 9am). El paciente lo notó, volvió atrás, y esta vez usó el número de opción (`4`) → 9:30 AM correcto → confirmó bien. **Riesgo:** si el paciente no revisa el resumen con cuidado, puede terminar confirmando una cita a una hora que nunca pidió. Pendiente: leer el parsing de texto libre en el estado `booking_select_hour` (probablemente en `bot-handler` o el shared del motor) para confirmar causa exacta antes de decidir fix.

---

## ▼ CHECKPOINT 1 Jul 2026 — E2E Coexistence (link/unlink/relink) + GAP: importación de historial nunca funcionó

**Contexto:** Diego hizo un E2E manual de Coexistence sobre su número de repuesto (línea **"Clinica Pinares" +504 9787-0752**, `meta_phone_number_id=1189949607527923`, en la org de PRUEBA OrionCare `c8b1c83b`) para de-risquear la instalación de Grecia (mañana 2 Jul). Desconectó desde WA Business App **y** desde el botón OC (`disconnect-whatsapp-line`), luego re-vinculó. Se verificó todo por SQL/logs vía MCP.

### ✅ Lo que PASA (de-risquea el onboarding de Grecia)
- **NO hay cooldown de 1-2 meses** para el ciclo corto de Coexistence: link→unlink→relink en minutos, sin bloqueo (refuta el claim de whautomate; ese cooldown, si existe, es del `/deregister` destructivo viejo, no de Coexistence).
- **Re-link idempotente y limpio:** el hard-delete de `disconnect-whatsapp-line` borró la fila vieja (`f2c4d59d`) y el re-link creó UNA fila nueva (`15e3b11f`), mismo `phone_number_id`/WABA, sin duplicados. (`meta-embedded-signup` upsert por `(org, meta_phone_number_id)`; si la fila existe hace UPDATE, si no INSERT — ver §8 de la función.)
- **Watchdog de sync OK:** `coexistence-sync-watchdog` (pg_cron jobid 12, cada 2 min, SQL puro) apagó `sync_in_progress` a los ~6 min (`UPDATE 1` a las 20:46). El banner "Sincronizando historial" es normal y se limpia solo en 5-7 min.
- **Bot OK en la línea re-vinculada:** una vez `bot_enabled=true` + sync off, contestó el menú completo, `delivered` (20:48:43). Durante `sync_in_progress` el bot se suprime a propósito para mensajes >5 min viejos (gate en meta-webhook líneas ~465-471), pero un mensaje FRESCO sí se procesa.

### ⚠️ GOTCHA #1 — `meta-embedded-signup` §8b desactiva TODAS las demás líneas de la org
Al re-vincular Pinares (org `c8b1c83b`), el paso "deactivate all OTHER lines in this org" **apagó el Demo Bot** (`79bff173`, misma org test) → `is_active=false`. **El Demo Bot (línea verified de ventas, [[oncare-verified-demo]]) quedó CAÍDO.**
- ~~**ACCIÓN PENDIENTE:** reactivar~~ ✅ RESUELTO — verificado 14 Jul: Demo Bot activo y respondiendo (ver checkpoint 14 Jul).
- **Lección:** NUNCA experimentar vinculación bajo una org compartida. Grecia mañana es segura porque va en **su propia org** (deactivate-others = no-op). El riesgo real del onboarding no es el cooldown, es correr el experimento bajo la org equivocada.

### 🔴 GOTCHA #2 (el grande) — La importación de historial de Coexistence NUNCA funcionó
Diego confirmó: el número test **tiene 6 chats** y marcó **"compartir historial"** en el QR. **NO entró ninguno.** Los logs de `meta-webhook` muestran **CERO POST** en la ventana de sync (20:41-20:46) — solo los mensajes de prueba manuales de Diego. → **Meta no envió el historial a nuestro webhook.**

**Causa raíz (verificado contra doc Meta/360Dialog):** el historial de Coexistence NO llega como `messages` con timestamp viejo (suposición ORIGINAL del sprint, INCORRECTA). Llega por un **webhook `history` dedicado**, chunked. Dos gates apilados, ambos rotos:
1. **Upstream:** la Meta App probablemente **no está suscrita al campo `history`** (chequear Dashboard → Webhooks → `whatsapp_business_account` → campo `history`). Opt-in de compartir historial estaba OK.
2. **Código:** `meta-webhook` **no tiene handler para `history`** — `MetaChangeValue` (líneas 52-66) no declara el campo y el ruteo (líneas 1287-1328) solo procesa `messages`/`message_echoes`/`statuses`/`calls`. Aunque Meta lo mandara, se tira (200 OK, nadie persiste).

**Lo que se "validó" en el sprint Coexistence fueron los echoes (salientes nuevos), NO el historial.** El import de historial es un gap latente que Diego destapó empíricamente.

**Esquema del payload `history` (doc 360Dialog, para el build):** `changes[].field="history"`, `value.history[]` = array de objetos con `metadata{phase, chunk_order, progress}` + `threads[]`; cada thread = `{id: <telefono_usuario>, messages[]}`; cada message = `{from, to, id, timestamp, type, <type>:{...}, history_context:{status}}`. Chunked (varios webhooks; usar `progress`/`chunk_order` para orden y completitud). Confirmar formato RAW de Meta en developers.facebook.com antes de codear (360Dialog envuelve en su formato `event:history`).

**NUEVA TAREA (2-4h, deliberada — NO hotfix):** construir handler `history` en meta-webhook → parsear threads/chunks, dedup por `message.id`, persistir a `conversations` + `message_logs` (marcar como históricos, sin disparar bot/notif). + verificar/activar suscripción al campo `history`. Legítimo bajo freeze (habilita playbook de onboarding + dataset de entrenamiento del bot). **Para Grecia mañana: el historial NO va a importar — NO prometerlo.** El onboarding en sí (bot + mensajes hacia adelante) funciona.

### UPDATE 1 Jul (cont. noche) — handler construido + desplegado + investigación fase 0 del gap

**Handler `history` CONSTRUIDO + EN PROD.** `meta-webhook/index.ts`: `handleHistorySync` (parsea `value.history[]` → threads → mensajes, direccion por `from`==numero-negocio, dedup por `provider_message_id`, persiste a `message_logs`/`conversations` reusando `getOrCreateConversation`/`persistInbound|OutboundMessage`, **preserva cronología real** post-patcheando `created_at`=`msg.timestamp`, NO dispara bot, refresca watchdog). Tipo `MetaChangeValue.history` declarado + ruteo wired. Loguea payload crudo (`HISTORY webhook raw value:`). Desplegado con `--no-verify-jwt`. E2E del link/relink validado (bot responde, watchdog apaga sync, sin cooldown, 1 fila limpia).

**PERO el gap persiste: Meta NO entrega el webhook `history`** (0 POSTs tras múltiples re-links con share-history ON). Investigación fase 0 (plan `si-ya-se-hizo-tranquil-hopper.md`):
- **Bump `meta-embedded-signup` v21→v24** (BUILD `@2026-07-01_v17_graphv24`) desplegado — alinea con meta-enable-calling. **NO confirmado como el fix** (evidencia débil: echoes de coexistence llegaban en v21).
- **`GET /{waba}/subscribed_apps` NO expone `subscribed_fields`** (ni con `?fields=subscribed_fields` — verificado en vivo). Solo confirma el link app↔WABA. Los campos suscritos solo se leen a nivel APP (`GET /{app_id}/subscriptions`, requiere app-token) o en el Dashboard. **BUG LATENTE detectado: `meta-enable-calling` (~166-215) asume `app.subscribed_fields` → su chequeo de `calls` es un no-op silencioso** (siempre false). En `meta-embedded-signup` la verificación se limpió a un log crudo.
- **Suspects vivos:** (a) `history` = trigger de una-vez por onboarding fresco; número test sobre-ciclado no re-dispara; (b) campo no entregando a nivel app; (c) opt-in share-history no registra en re-link. La versión (v21) quedó como suspect DÉBIL.
- **Diagnósticos definitivos pendientes (sin más curls):** (1) **botón "Test" del campo `history`** en App Dashboard → aísla suscripción+routing del trigger; (2) **número FRESCO** (Grecia mañana = primer onboarding real).
- **App id** = `1202458085291818`. **Para Grecia:** el onboarding funciona; el historial NO está garantizado — validar con su número fresco. El handler está listo para capturarlo apenas Meta lo mande.

**✅ RESUELTO (1 Jul noche) — el webhook `history` SÍ entrega.** Diego puso el webhook en v24 + tildó el campo `history` + usó el botón "Test" del Dashboard. **El payload de muestra LLEGÓ al `meta-webhook`: POST 200 a las 16:28:51 (2 seg tras el envío de Meta).** → suscripción + routing + función confirmados en verde. NO persistió en DB porque el Test usa datos de muestra (número falso → no matchea línea real → gate del handler no dispara); es lo esperado. **Conclusión: el pipeline está listo.** La causa del gap era config upstream (v21 + campo sin togglear), ya corregida. **Validación final pendiente = onboarding FRESCO con share-history (Grecia mañana)** → el flood real debe caer y el handler persistir. Deuda menor: alinear resto de funciones v21→v24; endurecer/limpiar el chequeo `subscribed_fields` no-op de meta-enable-calling.

### Notas menores
- `bot_enabled=false` es el default de toda línea nueva (inbox-only). Para demo en vivo hay que prenderlo a mano.
- **Inbox NO es multi-línea** — muestra solo una línea de la org; por eso no se ven los chats de otra línea desde la UI (limitación conocida, no bug).
- ~~**VERIFICAR (baja prio):** cron jobid 7~~ ✅ VERIFICADO 14 Jul: el placeholder es literal pero INOFENSIVO — los envíos de 11am funcionan a diario (ver checkpoint 14 Jul). No tocar.
- **Nota de negocio:** líneas de Ecoclinicas y Medilaser siguen `is_active=true` con bot en DB pese a estar marcados "perdido" 22 Jun — no confirmado que cancelaran.

---

## ▼ CHECKPOINT 29 Jun 2026 — P0 RESUELTO: acceso a la plataforma roto (PageTracker `.catch`)

**Síntoma (Diego):** "no puedo entrar a la plataforma". Consola: `TypeError: w.from(...).insert(...).catch is not a function` (x2 por StrictMode), `Uncaught`. La app no montaba.

**Causa raíz:** `src/components/PageTracker.tsx` (introducido en `81f3612`, rama `feat/page-tracking-navegacion`) llamaba `.catch(() => {})` **directo sobre el builder** de `supabase.from('page_views').insert(...)`. El builder de supabase-js v2 es un *thenable*: tiene `.then()` pero **NO `.catch()`/`.finally()`**. Como `PageTracker` está montado global y corre en cada cambio de ruta, la excepción no atrapada tumbaba el render → bloqueo total de acceso.

**Fix (commit `a37e043`, pusheado a la rama):** cambiar `.catch(() => {})` por `.then(undefined, () => {})` (el thenable sí soporta el 2º arg de `.then`). Comentario agregado para que no reincida. `tsc --noEmit` OK. Revisados los demás `.catch` del frontend: `useAppointmentComposer.ts:186` (`.then().catch()` → válido, `.then` devuelve Promise real) y `CallContext.tsx:646` (`res.json().catch()` → Promise real) NO son bugs. Tabla `page_views` existe en prod. **Para recuperar acceso hay que recompilar/redeploy** (el bundle viejo `index-BL-UPK4q.js` trae el código roto).

**⚠️ Lección / deuda:** patrón peligroso = `.catch()` colgado de un PostgREST builder sin un `.then()` previo. Si vuelve a aparecer un insert/update/delete "fire-and-forget", usar `.then(undefined, onErr)` o `await` con try/catch, NUNCA `.catch()` solo.

**Tarea paralela (no-dev, datos demo):** sembradas **106 citas demo + 30 pacientes** en julio 2026 en la org demo **OrionCare** (`c8b1c83b…`) para una presentación a un médico ("movimiento" todo el mes, ~4-5/día, 2 profesionales). Insertadas con `SET LOCAL session_replication_role = replica` (bypass del trigger webhook Make.com + capacidad). Todas `confirmada`/`cancelada` (NUNCA `agendada`: la org tiene `auto_cancel_enabled=true` → el cron las cancelaría y enviaría WhatsApp a números demo) + flags de recordatorio en `true` → ningún cron las toca, cero envíos. Tag de limpieza: `patients.notes='DEMO-JULIO-2026'`. Script de borrado en scratchpad (`cleanup-demo-julio.sql`): DELETE appointments→patients por el tag. **Pendiente: borrar después de la presentación.**

---

## ▼ CHECKPOINT 17 Jun 2026 — P0 RESUELTO: outage de envíos salientes (Conflicting API keys)

**Síntoma (Diego):** "envié un mensaje al bot de prueba pero no contesta". **Diagnóstico:** el bot RECIBÍA y procesaba (escribía `bot_conversation_logs`, bot-handler 200) pero NINGÚN saliente salía. Último saliente OK fue **10 Jun 18:08** — 7 días de outage TOTAL (bot, recordatorios 24h, confirmaciones de Guevara/Yeni — en silencio).

**Causa raíz:** el proyecto migró a **JWT Signing Keys** (nuevo esquema de API keys). En runtime `SUPABASE_ANON_KEY`→`sb_publishable...`, `SUPABASE_SERVICE_ROLE_KEY`→`sb_secret...` (los legacy salen `DEPRECATED` en dashboard). Las edge functions se llamaban entre sí mandando `apikey: <anon>` **+** `Authorization: Bearer <service>` → el gateway nuevo rechaza con **401 "Conflicting API keys"** (llaves distintas) ANTES de correr la función (`function_id:null`, `exec 0` en logs). Por eso meta-webhook→bot-handler funcionaba (solo manda `x-internal-secret`, sin conflicto) pero meta-webhook→messaging-gateway moría.

**Confirmación:** función diagnóstica temporal (`diag-auth`, ya borrada) replicó las llamadas con env reales: probe "full" (apikey+Authorization)→401 Conflicting; "solo Authorization"→400 OK; "solo x-internal-secret"→400 OK. Env confirmado: `SUPABASE_SERVICE_ROLE_KEY` empieza con `sb_secret`.

**Fix:** quitado el header `apikey` de 13 call sites en 10 funciones (dejando `Authorization: Bearer ${serviceKey}` + `x-internal-secret`): meta-webhook (x4), send-reminders, send-reminder-followup, auto-cancel-unconfirmed, create-appointment, create-visit, inbox-send, process-media-async, send-whatsapp-message, bot-handler (handoff). Redeploy CLI de las 10.

**⚠️ Lección:** el `supabase functions deploy` por CLI **voltea `verify_jwt` a `true`** si no se pasa `--no-verify-jwt` (config.toml no tiene `[functions.*]`). El primer batch dejó meta-webhook/bot-handler/crons en `true` (meta-webhook en true = Meta no puede llamarla → bot deja de recibir). Corregido: redeploy con `--no-verify-jwt` de las 8 que deben ser false. Verificado por curl. `create-appointment`/`create-visit` quedan en `true` (frontend con JWT).

**VERIFICADO EN VIVO 17 Jun:** Diego mandó "Hola" → inbound received + **outbound bot_response `delivered`** (16:51). Cambios solo en prod (deploy), working tree con los edits SIN commitear aún.

**PENDIENTE:** (1) commitear los cambios de las 10 funciones; (2) revisar si hay citas 10-17 Jun de Guevara/Yeni que quedaron sin recordatorio (impacto de negocio del outage).

---

## ▼ CHECKPOINT 16 Jun 2026 — E2E en curso + 2 fixes del motor

E2E del playbook arrancado sobre org limpia **E2E-TEST** (`org_id 33e6cad8-2ceb-408b-a215-6ce72f0c70f3`, creada via wizard + activada). Motor sembrado por MCP (escenario ICP estetica: Dra + 2 tecnicas sin login, Cabina cap 2, Equipo Laser cap 1, 3 servicios con recetas + skill matrix). Plan: `.claude/plans/quiero-que-generes-un-enchanted-treehouse.md`. **Snapshot base: 814 citas reales** (el "776" estaba viejo). Cleanup script verificado en vivo (orden FK real, guarda = conteo citas ≠E2E). Supabase MCP **re-autenticado** (OAuth se vence cada sesion).

**FIX #1 — Calendario por profesional (siembra).** Trap de config, NO bug de codigo. `calendar_doctors` = co-working: profesionales en el MISMO calendario comparten agenda y se bloquean entre si (`loadCoworkDoctorIds` + merge en `loadVisitDayState`). Para ICP multi-profesional cada uno necesita SU calendario; el paralelismo lo limitan los recursos, no la agenda. Memoria [[calendario-por-profesional-multirecurso]]. Implicacion playbook: al onboardear multi-profesional, 1 calendario por profesional (el wizard solo crea "Agenda principal").

**FIX #2 — Bug de capacidad de recursos (DESPLEGADO A PROD 16 Jun).** Correctitud. Tanto `_shared/availability.ts` como el **trigger** `validate_appointment_resource_capacity` **SUMABAN** los consumidores que tocan la ventana en vez del **PICO concurrente** → sobre-contaban citas SECUENCIALES del mismo recurso (ej. limpieza 09-10 + laser 10-10:45 misma cabina) como simultaneas → escondian slots validos + rechazaban inserts validos (= fuga de oferta en clinica de alto volumen, lo contrario del value-prop). Fix: sweep-line de concurrencia maxima.
- TS: nuevo helper `peakResourceUsage` reemplaza las 2 sumas (`getAvailableSlotsForDate` resourceOk + `isResourceCapacityOk`). Cubre get-visit-slots, get-visit-days, get-available-slots/days, bot-handler.
- DB: migracion `20260616120000_motor_09_capacity_trigger_peak_concurrency.sql` (peak via puntos de evaluacion = inicio de ventana + inicios de citas internas). Aplicada via MCP.
- **No-op para los 3 clientes reales** (0 recetas → rama nunca corre; output byte-identico). Solo cambia orgs multi-recurso.
- Verificado: trigger A/B transaccional (09:00 cabina llena → bloquea OK; 09:30 secuencial → pasa OK, antes bloqueada); EF en prod (`get-visit-slots@2026-06-16_peakcap`) ahora ofrece 09:00. Deploy CLI de las 5 EFs OK.
- **QA visual ACEPTADO por Diego** (16 Jun). Commit + push: rama `fix/motor-capacity-peak-concurrency` (`899f4d9`) en GitHub, PR sin abrir aun.

**FASE 3 BLOQUEADA — el numero de repuesto de Diego YA esta vinculado a la plataforma** (ya es linea Cloud API, NO un numero limpio viviendo en WA Business App). Para ensayar Coexistence hay que **desconectarlo primero** (cooldown de reconexion 1-2 meses, Meta-side — ver research del 16 Jun arriba) o conseguir otro numero limpio. **Decision pendiente de Diego.** El resto del E2E (org limpia + motor + booking) quedo validado; solo falta la conexion real del numero + round-trip + bot service-first.

**Cleanup E2E (Fase 4) PENDIENTE:** la org `33e6cad8...` sigue en prod con datos de prueba. Script de borrado listo en el plan (Apendice A, orden FK verificado + guarda de citas reales). Correr cuando se cierre el E2E. NO desconectar/borrar nada de clientes reales.

---

## ▼ CHECKPOINT 15 Jun 2026 — E2E onboarding playbook (RETOMAR AQUI)

**Que pidio Diego:** un E2E "desde cero" = crear org + integrar numero + probar bot + agendar. Aclaro que quiere el **playbook de onboarding COMPLETO**, no solo el motor. = tareas estrategia #38/#39 (test Coexistence end-to-end con numero de repuesto ANTES de cliente real). Tiene **numero de repuesto fisico**.

**Preocupacion raiz de Diego (el porque de toda la conversacion):** no llenar la BD de prod de basura con datos de prueba. Preocupacion valida — el E2E escribe en prod real (`soxrlxvivuplezssgssq`, misma BD con 776 citas de clientes reales).

### Decisiones / hallazgos de la sesion

**1. La "basura" tiene 3 capas, no 1:**
| Capa | Que deja | Limpieza |
|---|---|---|
| BD (org, citas, logs) | Filas en prod | ✅ `DELETE` cascada por `organization_id` (yo lo armo, con guarda que verifique 776 citas reales intactas) |
| **Numero en Meta (WABA)** | Numero registrado a Cloud API de OC | ⚠️ requiere desconexion explicita — ver hallazgo #3 |
| Elegibilidad del numero | Nada, pero si no cumple → flujo destructivo | 🚧 gate previo |

**2. GATE DE ELEGIBILIDAD: PASADO.** Diego confirmo que su numero de repuesto cumple las **4 condiciones** de Coexistence (corre en WA Business App, v2.24.17+, activo 7+ dias, pagina FB + Business Info completa). → el QR de Coexistence DEBERIA aparecer, no el flujo viejo destructivo. Ver [[coexistence-prerrequisitos-numero]].

**3. PLAN DE DESCONEXION (lo que Diego pidio ayuda) — hallazgo de web research (PARCIAL, interrumpido):**
- **La desconexion es LIMPIA y se hace DESDE la WA Business App**, NO desde nuestro lado: en el cel → WhatsApp Business App → Configuracion → Cuenta → Plataforma empresarial (Business Platform) → **Desconectar**. La app sigue 100% funcional despues (Coexistence es no-destructivo).
- ⚠️ **NO desinstalar la app** (eso si desconecta y pierde datos). Solo el boton Desconectar dentro de Configuracion.
- 🔴 **HALLAZGO CRITICO — COOLDOWN DE RECONEXION ~1-2 MESES:** una vez desconectado, el numero NO se puede reconectar a la API por **1-2 meses** (y debe estar activo en uso). Fuente: whautomate.com/whatsapp-coexistence. **Implicacion:** la limpieza Meta-side ES limpia (no deja basura pegada, la app sigue), PERO el numero queda "consumido" 1-2 meses si se desconecta. → DECISION PENDIENTE: ¿desconectar y perder el numero 1-2 meses, o dejarlo conectado como **2da linea de prueba semi-permanente**?
- **PENDIENTE VERIFICAR (research quedo a medias, Diego interrumpio):** confirmar el cooldown exacto + requisitos de reconexion con fuente autoritativa. Iba a fetchear `support.wati.io/.../troubleshooting-whatsapp-coexistence-signup-process`. Fuentes ya vistas: whautomate (cooldown 1-2 meses + pasos desconexion), gohighlevel (boton desconectar, sin detalle), 360dialog docs.

**4. Recomendacion del arquitecto (dada, no ejecutada):** secuenciar el E2E para que lo REVERSIBLE se valide primero (crear org + config + agendar en plataforma) y la conexion del numero (lo casi-irreversible por el cooldown) sea el ULTIMO paso, con el plan de desconexion ya cerrado. NO conectar el numero hasta decidir el punto #3.

### Estado de herramientas
- **Supabase MCP: OAuth INICIADO pero NO completado.** Diego no pego el callback URL. Para snapshot + cleanup hay que: llamar `mcp__plugin_supabase_supabase__authenticate` de nuevo (genera URL nueva), Diego autoriza, pega callback → `complete_authentication`. Alternativa: deploy/SQL via CLI `npx supabase` (auth cacheada de Diego) como en sesiones previas.

### PROXIMOS PASOS (orden de ejecucion al retomar /modo-dev)

1. **Cerrar decision del numero (#3):** ¿desconectar post-test (pierde 1-2 meses) o dejar como 2da linea de prueba? + terminar de verificar el cooldown exacto (fetch Wati interrumpido).
2. **Autenticar Supabase MCP** (o usar CLI).
3. **Snapshot pre-test:** contar filas por tabla en la org nueva ANTES de empezar + anotar `created_at` de inicio. Todo lo posterior = test borrable.
4. **Armar script de cleanup:** `DELETE` cascada por `organization_id` de la org E2E, orden correcto de FKs (hijos primero: message_logs, bot_conversation_logs, appointments/visits, patients, whatsapp_lines, calendars/schedules, doctors, org_members, clinics, org), con **guarda de seguridad** (contar citas de orgs reales antes/despues → abortar si cambia). Mapear FKs reales primero (no asumir).
5. **Ejecutar el playbook E2E** (ver [[onboarding-playbook]]):
   - Pre-visita checklist: numero elegible ✓; FALTA confirmar sitio web en Business Portfolio + quien maneja el Meta Business del numero.
   - Crear org "E2E-TEST" + Diego super-admin custodio (`admin@orioncare.app`) + admin-por-org.
   - Cargar motor: servicios, profesionales, skills, **cabinas/equipos** — aprovechar para pensar el hueco #46 (cabina fija-vs-movil; aqui es config sintetica de Diego, no clinica real).
   - **Bot OFF + transcription OFF** antes de escanear el QR (protege del history flood 5-15 min).
   - Embedded Signup flavor Coexistence → escanear QR desde la WA Business App del numero de repuesto.
   - Verificar **round-trip:** echo saliente (`smb_message_echoes`) + entrante de paciente aparecen en inbox OC.
   - Probar bot service-first + agendar (valida motor end-to-end con org limpia, no la `c8b1c83b` sobada).
   - **Cleanup:** correr script BD + ejecutar decision del numero (#1).

### Contexto estrategico que enmarca esto (de sesion estrategia 15 Jun, cerrada hoy)
- Build del motor CONGELADO hasta validar con clinica ICP real (#46 cabina/equipo). Este E2E NO es construir motor — es **validar el playbook de onboarding** + QA del motor sobre org limpia. Legitimo bajo el freeze.
- El hueco #46 (cabina-vs-equipo: el motor modela 3 contadores independientes, solo valido si el equipo es portatil; si es fijo sobreestima disponibilidad) sigue ABIERTO y se resuelve en campo, no en codigo. Anotarlo si surge durante la carga del motor en el E2E.

---

## ✅ Optimización tiempos de carga (calendario/horarios) — CASO #1 ENTREGADO + EN PROD 5 Jun

**Plan:** `.claude/plans/optimizacion-tiempos-carga-disponibilidad.md`

**Decisión de método (Diego 5 Jun): "medir primero".** Antes de tocar código se midió wall-clock
(cold vs warm) de las 4 EFs sobre prod (fechas futuras, anon key). Hallazgo: las llamadas
**calientes** ya eran lentísimas (get-visit-days 2430ms, get-visit-slots 1871ms warm) → **NO es
cold-start, es trabajo DB serial**. Esto validó el #1 y volvió **redundante el Caso #2** (logs
timingMs): el wall-clock warm ya aísla el server-side (la red es constante, se cancela en el A/B).

**Caso #1 — paralelización del motor con `Promise.all` (behavior-preserving) — HECHO.** Los 6
puntos del plan, en `_shared/availability.ts` (+`get-visit-slots/index.ts`):
1. `loadCandidateRecipe` — 2 queries (buffer + receta) en paralelo.
2. `get-visit-slots/index.ts` — `loadVisitDayState` + query `doctorLoad` en paralelo.
3. `getAvailableSlotsForDate` — `loadSchedules` primero (early-return intacto), luego 2 cadenas
   independientes (receta→consumers / cowork→appts) en `Promise.all`.
4. `loadVisitDayState` — 2 niveles de `Promise.all` (doctores map + servicios map; luego appts +
   consumers). Reducciones de Sets/Maps iteran el array de **input** (no orden de resolución).
5. `loadVisitRangeState` — mismo patrón a nivel rango; guards `allCoworkIds`/`recipeResourceIds`
   preservados con `Promise.resolve({data:[]})`.
6. `resolveVisitContext` — 3 queries (svc/doctores/skills) en paralelo + early-returns replicados
   en orden `svcErr→org-check→docErr` (trabajo DB extra solo en paths de error raros).

**Deploy:** vía **CLI `npx supabase functions deploy`** (auth de Diego **cacheada** → el CLI corre
con `npx -y supabase@latest`, NO hace falta deno ni access-token; el CLI auto-bundlea `_shared`).
Desplegadas las 4: get-available-slots, get-available-days, get-visit-slots, get-visit-days. BUILD
bumpeado (`@2026-06-05_par1` / `v1.3.0_par1`).

**Verificación A/B byte-idéntico (lo no-negociable): PASÓ.** 7 casos con fechas futuras (neutraliza
`now()`), JSON antes/después idéntico (normalizando solo el campo `build`): visit-slots 1proc +
2proc (resource-aware, receta Consulta general→Cabina 1), visit-days rango 14d, available-slots base
+ resource-aware, available-days mes, y path fatal 400 (servicio de otra org). Output del motor
preservado exactamente.

**Resultado (wall-clock warm, org prueba OrionCare 2 doctores skilled):**
| Función | antes | después | mejora |
|---|---|---|---|
| get-visit-days (calendario ICP) | 2430ms | **820ms** | **~3x** |
| get-visit-slots (horarios ICP) | 1871ms | **804ms** | **~2.3x** |
| get-available-days (single-doctor) | 949ms | 844ms | ~−11% |
| get-available-slots (single-doctor) | 949ms | 873ms | ~−8% |

El path ICP de "Nueva Cita" (get-visit-*) es el que mejora fuerte (era la queja de Diego). El floor
~800ms warm incluye ~130ms de RTT de red del medidor → server-side ~670ms (de ~2300ms). Las
available-* mejoran poco: en modo base la cadena de receta es no-op (poco que paralelizar).

**PENDIENTE / follow-ups:**
- **QA visual de Diego (logueado):** abrir "Nueva Cita" multi-recurso y confirmar que se siente más
  rápido + calendario/horarios correctos. El A/B prueba output idéntico en el read path; agendar
  (create-appointment/create-visit) NO se tocó.
- **bot-handler REDESPLEGADO 5 Jun** (Diego pidió esta opción): ya corre con la `getAvailableSlotsForDate`
  paralela. Bundle OK (7 _shared incluyendo availability.ts). Smoke de boot: POST `{}` → 401 estructurado
  propio (`UNAUTHORIZED_NO_AUTH_HEADER`) en 135ms = módulo carga y ejecuta; logs sin 500/boot-error.
  PENDIENTE: smoke conversacional real del bot (un mensaje al Demo Bot +50493133496) — bajo riesgo,
  el output del motor es byte-idéntico.
- **Confirmación server-side (logs `execution_time_ms`, excluye red del medidor):** get-visit-days
  v1→v2 `~2100ms → ~680ms` (~3x); get-visit-slots v3→v4 `~1800ms → ~700ms` (~2.5x).
- **Caso #3 (caché React Query en `useAppointmentComposer`)** — OPCIONAL, decidir con estos números.
  Atacaría la re-navegación (volver a un mes/fecha ya visto = instantáneo), no el primer fetch. El
  409 de `create-appointment` evita doble-reserva → caché seguro. infra ya existe (QueryClient en
  App.tsx, nadie usa `useQuery` aún).
- **Fuera de alcance #1 (deferido):** loops propios de `bot-handler` (getCombinedSlotsForDate etc.,
  requieren E2E del bot) + queries inline seriales de `get-available-days/index.ts` (no usa
  getAvailableSlotsForDate; su ~840ms es su propio código — refactor aparte) + dedupe de get-available-days.

---

## Sesión 5 Jun — cerrado
- **Fase 4 rediseño Nueva Cita:** limpieza de código (removidos `VisitBooking.tsx` +
  `combinedAvailability.ts` huérfanos), reagendar verificado intacto, `tsc` OK. Commit `2d38c58`.
- **Bug badge Auto/Manual:** `ProfesionalSummary` ahora muestra "Manual" cuando hay override
  del profesional (expone `suggestedDoctorId` en el chain). Commit `52fc666`.
- **Badge tipo Equipo/Cabina** en editor de receta (`MotorConfigPanel`) — los equipos YA
  estaban soportados end-to-end (resource_type + receta M2M); solo faltaba el badge. Commit `1024f13`.
- **Reporte de navegación + prompt Stitch** (`docs/reporte-navegacion-plataforma.md` +
  `docs/stitch-prompt-navegacion.md`): inventario de toda la plataforma para rediseñar la
  navegación (sin commitear aún, decisión Diego). Hallazgo: **rutas huérfanas** — 4 stubs
  muertos (`/admin/specialties`, `/admin/reports`, `/admin/files`, `/admin/settings` = solo
  `<NotFound/>`), `/agenda-medico` (componente real sin link) y `/admin`→`AdminDashboard`
  (sin link, posible reuso como hub de Administración). `/internal/activations` y
  `/debug-whatsapp` son URL-only intencionales. Limpieza pendiente decisión Diego.
- **Multi-servicio en el bot:** confirmado que el bot solo agenda 1 servicio (por diseño,
  Fase 6 anti-scope-creep). El backend (get-visit-slots + create-visit) YA existe; falta solo
  el flujo conversacional. DIFERIDO junto con NLP del bot (espera tener conversaciones a mano).

---

## PRIORIDAD #1 — Motor de Agendamiento Multi-Recurso (arranca 2 Jun)

**Plan completo:** `.claude/plans/motor-agendamiento-multirecurso.md`

Decision estrategica 2 Jun: el motor de agendamiento multi-recurso es el PRODUCTO REAL de OrionCare (retencion/foso/$150), no el inbox/bot. Coexistence = adquisicion; motor = retencion. Ver [[motor-agendamiento-es-producto]].

**Hallazgo del mapeo de schema (2 Jun):** el sistema es 100% doctor-centrico, NO existe concepto de recurso finito (equipo/cabina/maquina) — cero tablas/columnas. `appointments.service_type` es string libre (ni FK). El motor es construccion nueva sobre cimientos buenos (service_types, doctors con user_id nullable = tecnicas sin login, calendar_schedules, algoritmo de slots de bot-handler reutilizable).

**Decisiones de diseno ratificadas por Diego:**
1. Receta = M2M `service_resources` (NO un FK unico — laser necesita cabina Y maquina).
2. Secuenciador = `visit_id` + una cita por procedimiento (algoritmo de slots consecutivos, no rediseno de datos).
3. Consumo de recursos derivado en query-time (sin tabla materializada).
4. Tecnicas = filas en `doctors` (reuso) + label "Doctor"→"Profesional" (#24).
5. **Config interna white-glove:** Diego hace cada instalacion. UI de config en area superadmin (power tool, no consumidor). Tablas+RLS genericas para self-service futuro.
6. Degradacion elegante: org sin recursos configurados → booking doctor-first como hoy (no rompe clientes actuales, sin flag).
7. NLP del bot diferido hasta primer cliente real (Fase 4 = bot service-first estructurado, opciones numeradas).

**Fases (~26-36h total Claude+QA):**
| Fase | Que | Horas | Estado |
|---|---|---|---|
| 0 | Schema (resources, service_resources, professional_services + cols + trigger capacidad) | 3-4h | ✅ **APLICADO+VERIFICADO 2 Jun** (prod via MCP) |
| 1 | Consolidar service_types como fuente unica (bot lee tabla + escribe service_type_id + UI edita tabla + backfill) | 4-6h | ✅ **ENTREGADA+VERIFICADA 2 Jun** |
| 2 | Motor disponibilidad `_shared/availability.ts` (2A unificar + 2B resource-aware + 2C unificar days). Skill diferido a Fase 6 | 6-8h | ✅ **ENTREGADA+VERIFICADA 2 Jun** (prod, A/B + QA sintetica) |
| 3 | UI config interna (recursos/recetas/skills) | 5-7h | ✅ **ENTREGADA 3 Jun** (`/admin/motor`, org-scoped via admin-por-org) |
| 4 | Vista combinada + booking service-first para Dulce + label Profesional | 6-8h | ✅ **CERRADA 3 Jun** (service-first + servicios fuente unica + vista combinada con auto-asignacion QA-aprobados + relabel #24 global "Profesional" aplicado; day-view resource-aware deferido cosmetico) |
| 5 | Secuenciador multi-procedimiento (greedy, `visit_id`) — RIESGO #1 acotado | 4-6h | ✅ **ENTREGADA + E2E QA-APROBADO 3 Jun** (verificado en DB real; 2 fixes post-QA: get-visit-slots 401 + reagendar visita-aware) |
| 6 | Bot service-first estructurado (sin NLP) | 4-6h | ✅ **ENTREGADA + E2E QA-APROBADO 3 Jun** (2 citas reales: misma hora 10:00, profesionales distintos auto-asignados; precio visible antes de confirmar ✓). Pendiente solo confirmacion visual de consulta-previa |

> NOTA: la numeracion ahora coincide con `.claude/plans/motor-agendamiento-multirecurso.md` (la tabla anterior aqui estaba desfasada). Fase 2+ = corazon del valor (sin doble-booking + muere el "engorroso" de Dulce). Secuenciador = variable de riesgo, "done" estricto. Bot service-first = el diferenciador.

**Anti-scope-creep (NO se hace):** niveles de proficiencia, optimizacion global del dia, cooldown de maquina, UI self-config de clinica, excepciones de horario/feriados.

### Fase 0 — CERRADA 2 Jun (aplicada + verificada en prod)
- Aplicada via **Supabase MCP** (OAuth de Diego) como migration atomica `motor_agendamiento_multirecurso_fase0`. 6 archivos en repo `supabase/migrations/20260602120000..120005_motor_*.sql`.
- Tablas `resources` / `service_resources` / `professional_services` creadas con RLS org-scoped (patron `get_user_organizations`). Cols `service_types.{buffer_minutes,price,requires_prior_consult}` + `appointments.{service_type_id,visit_id}`. Trigger `validate_appointment_resource_capacity` (BEFORE INSERT/UPDATE, degradacion elegante si no hay service_type_id/receta).
- **QA 14/14 PASADO** (suite transaccional auto-rollback en org de prueba `c8b1c83b`): boundary capacidad, no-sobre-bloqueo (sin solape), capacidad cabina=2 con conteo cruzado entre servicios, multi-recurso (cabina llena bloquea servicio de laser), buffer (30+15min), degradacion elegante (service_type_id NULL entra), cancelada-libera-recurso, reagenda-no-se-cuenta-a-si-misma + reagenda-a-slot-lleno-rechazada. 0 filas residuales, 776 citas de prod intactas.
- **Seguridad:** advisor confirma las 3 tablas con RLS+policies OK. Trigger fn con `search_path` fijo + `REVOKE EXECUTE FROM anon, authenticated` (no es RPC). No introdujo ningun ERROR nuevo (los ERROR de `bot_analytics_summary`/`_debug_calls_payloads` son deuda pre-existente).
- **MCP Supabase disponible esta sesion** (apply_migration, execute_sql, deploy_edge_function, generate_typescript_types). Ya NO hace falta el dashboard manual mientras dure la sesion.
- **Pendiente Fase 1:** regenerar `types.ts` (las cols/tablas nuevas aun no estan en el tipo TS — no rompe build actual porque nada las referencia todavia).

### Fase 1 — ENTREGADA 2 Jun (service_types = fuente unica)
**Decision de alcance (Diego):** redirigir la UI de edicion a la tabla (opcion recomendada), NO solo leer. Evita pudricion silenciosa: si solo el bot leyera la tabla pero la UI siguiera editando el JSONB, una edicion de servicios no se reflejaria en el bot.

**Hallazgo de diagnostico:** habia split-brain. UI (`WhatsAppLinesList`) editaba JSONB `whatsapp_lines.bot_service_types`; bot lo leia; tabla `service_types` solo se poblo 1 vez el 18 May (la leian solo Promociones). Para los 4 clientes reales JSONB==tabla en contenido (1 linea=1 org, sin colisiones). El org de prueba `c8b1c83b` (3 lineas en 1 org) tenia atribucion por-linea arbitraria por la colision `UNIQUE(org,name)` del migrate con `ON CONFLICT DO NOTHING`.

**Cambios:**
- `types.ts` regenerado via MCP (tablas/cols del motor presentes).
- **NUEVO** `src/lib/serviceTypesApi.ts`: `listServiceTypesByLine` + `saveServiceTypesForLine` (upsert por `organization_id,name` → preserva id + columnas no enviadas como buffer/price/recetas futuras; baja logica `is_active=false` de los removidos, nunca DELETE para no romper FKs). Normaliza name→lower, display_name→original.
- `WhatsAppLinesList.tsx`: `openEditDialog` carga de la tabla; `handleSave` persiste via API. Quitado `botServiceTypes` del `updateWhatsAppLine`. (El JSONB queda como dato muerto; columna dropeable en limpieza futura. `api.supabase.ts` aun expone `botServiceTypes` opcional pero ya nadie lo invoca.)
- `bot-handler` (desplegado prod via CLI, **2 deploys**): linea ~200 lee `service_types` **a nivel ORG** (`organization_id` + `is_active`, ordenado por `display_order`), mapea a `{id, name:display_name, duration_minutes}` (antes leia JSONB por linea). **Decision Diego 2 Jun: catalogo global org-level**, no por linea — promos/quick_replies/recetas/skills ya referencian `service_type_id` a nivel org; el line-coupling era herencia del JSONB. Para clientes reales (1 linea/org) es identico. Propaga `selectedServiceTypeId` en `maybeShowServiceTypeStep` (auto-select 1) + `handleBookingSelectService` + ambos flujos de reschedule (`handleDirectReschedule` + multi-cita; agregado `service_type_id` a los 3 selects). INSERT en `createAppointmentWithPatient` ahora con `service_type_id` (+ `service_type` nombre por compat). Cleanup en `startBookingFlow`.
- **Migracion** `20260602130000_motor_fase1_backfill_service_type_id.sql` (aplicada prod via MCP): match best-effort `LOWER(TRIM(service_type))` = `service_types.name` misma org. **52 citas** pobladas; 16 NULL esperados (15 test org formato viejo "Consulta general (30 mins)" + 1 "Microdermoabrasion" historica de Medilaser ya no configurada). El UPDATE dispara el trigger de capacidad pero degrada (0 service_resources).
- **Fix data Demo Bot:** reasignada "consulta general" a la linea Demo Bot (estaba en Pinares Clinic por la colision). Demo Bot vuelve a mostrar sus 2 servicios.

**Typecheck `tsc --noEmit` OK.** Sesiones en curso no se rompen (cachean lineServiceTypes viejo sin id → selectedServiceTypeId null, degrada limpio).

**VERIFICADO 2 Jun (Diego, Demo Bot +50493133496):** cita agendada eligiendo "Consulta general" → quedo con `service_type` ("Consulta general") + `service_type_id` (b97277cb…) poblados y el FK resuelve a la fila correcta. Tambien validada la degradacion: la linea Clinica Pinares (0 servicios) agenda directo sin paso de servicio. (Nota: el Demo Bot es +50493133496, NO confundir con la linea verified +50433899824 de demos en vivo.)

**Deuda / pendiente Fase 3 (UI config):**
- El bot ya lee org-level, pero el EDITOR (`WhatsAppLinesList` → `serviceTypesApi.listServiceTypesByLine`/`saveServiceTypesForLine`) sigue **line-scoped** (lee/guarda/soft-delete por `whatsapp_line_id`). Para clientes reales (1 linea/org) coincide con org-level → consistente. Fase 3: mover la config a una **pagina org-level dedicada ('Servicios')** y hacer el soft-delete org-scoped. La columna `whatsapp_line_id` en service_types queda como atributo opcional (sin uso para el read del bot).
- Si vuelve el modelo **edificio multi-linea** (org con N lineas, menus distintos por linea — diferido Jun-Jul con doctor_subscriptions), agregar un M2M `line_service_types`. Hoy el ICP es clinica multi-recurso = 1 linea/org, asi que org-global es correcto.
- `display_order` se seteo por-linea; en un org multi-linea podrian colisionar al leer org-level (cosmetico, solo afecta orden). Real clients no afectados.
- Columna JSONB `whatsapp_lines.bot_service_types` quedo muerta → dropear en limpieza.

### Fase 2 — ENTREGADA 2 Jun (motor de disponibilidad unico + resource-aware)
**NUEVO** `supabase/functions/_shared/availability.ts` = fuente unica del algoritmo de slots. Antes habia 2-3 copias divergentes (bot-handler getAvailableSlotsForDate, get-available-slots EF, get-available-days EF con un algoritmo gap-based DISTINTO = divergencia latente).

- **2A — extraccion pura:** `getAvailableSlotsForDate(supabase, query)` con la logica canonica (superset de get-available-slots: agrega calendar_schedules de los calendarios del doctor, fallback doctor_schedules; co-working por calendar_doctors; overlap en ms; filtro de pasados). `bot-handler` (wrapper posicional) y `get-available-slots` delegan. Versiones supabase-js alineadas a 2.39.0. **Verificado A/B en prod:** output identico antes/despues (3 fechas + granularidad). Seguro para el bot porque TODOS los line-doctors tienen calendar_id (el delta del camino sin-calendarId nunca se dispara).
- **2B — resource-aware:** si se pasa `serviceTypeId` + `organizationId`, el motor excluye slots sin capacidad de recurso (receta `service_resources`) y aplica `buffer_minutes` al footprint (profesional + recurso), replicando la logica del trigger Fase 0. Consumo derivado en query-time, org-wide. **Degradacion garantizada:** receta vacia + buffer 0 → identico a 2A (todos los clientes hoy). Threading de `serviceTypeId`/`organizationId` por la cadena del bot (week→day→hour→slots + ambos reschedule + createAppointment); `session.context.organizationId` seteado por mensaje. `get-available-slots` acepta `serviceTypeId` opcional (deriva org). **QA sintetica en prod (transaccional, limpiada):** cabina cap=1 consumida por 2do doctor fuera del calendario → slot 11:00 libre para el profesional pero EXCLUIDO por capacidad de cabina. 0 filas residuales.
- **2C — unificar get-available-days:** `canFit` ahora usa `enumerateSlots` (funcion pura extraida, loop unico con predicado opcional de recursos) en vez del gap-based. Datos del mes ya batcheados → enumeracion en memoria por dia, **sin queries extra** (perf preservada). Intervalos NAIVE para consistencia con el motor. Removidos `mergeIntervals`/`calculateGaps`/`timeToMinutes`. **Verificado:** canFit NEW == OLD (sin regresion) + cross-check canFit == (get-available-slots no vacio) en 3 dias. Day-view y hour-view ahora 100% consistentes.

**Skill-aware (professional_services) DIFERIDO a Fase 6** (booking service-first): hoy el booking es professional-first, skill-matching seria prematuro.

**Pendiente operativo Fase 2:** ningun cliente tiene recursos configurados aun (0 resources/recetas) → el resource-aware es no-op hasta el primer cliente multi-recurso. La UI para configurar recursos/recetas es **Fase 3** (ya entregada, abajo).

### Fase 3 — ENTREGADA 3 Jun (UI config interna del motor)

**Decision de arquitectura (Diego 3 Jun):** en vez de edge function service_role gateada por superadmin, **modelo de admin-por-org**. Se crea UN usuario admin por cada org cliente al hacer onboarding; mantenemos esa lista de credenciales de nuestro lado. Diego se loguea como el admin de la org del cliente y configura. Asi el CRUD usa **supabase-js directo org-scoped** (mismo camino que `serviceTypesApi.ts`) — el RLS `get_user_organizations` pasa porque el usuario ES miembro. **NO se construyo edge function.** (Verificado en DB: los superadmins actuales NO son miembros de las orgs cliente reales → supabase-js directo desde un panel superadmin habria chocado con RLS; de ahi la decision.)

**Alcance quirurgico:** la creacion de servicios (nombre/duracion) **se queda** en `WhatsAppLinesList` (lo lee el bot, ya funciona). Fase 3 solo agrega encima: atributos nuevos del servicio + recetas + skills + recursos. Sin migracion nueva (tablas/cols de Fase 0).

**Archivos:**
- **NUEVO** `src/lib/motorConfigApi.ts` — CRUD tipado org-scoped: `loadMotorBootstrap` (recursos+servicios+doctores+recetas+skills en 5 queries paralelas), `saveResource`/`setResourceActive` (recursos: baja logica, nunca DELETE — preserva recetas FK), `setServiceRecipe`/`setProfessionalSkills` (estrategia **reemplazo completo**: delete del set + insert), `updateServiceTypeAttrs` (buffer/price/requires_prior_consult).
- **NUEVO** `src/pages/MotorConfigPanel.tsx` — ruta `/admin/motor` (admin-only). Sin selector de org (opera sobre `useCurrentUser().organizationId`). 3 tabs: **Recursos** (tabla + dialog CRUD, switch activo), **Servicios** (card por servicio: buffer/precio/consulta-previa + receta de recursos con cantidad), **Profesionales** (skill matrix: checkboxes de servicios por profesional, badge "Tecnica" si `user_id` NULL).
- `src/App.tsx` — ruta `/admin/motor` lazy + RoleBasedRoute `['admin']`.
- `src/components/MainLayout.tsx` — entrada "Motor" (icono Cog) en el submenu colapsable Administrador (admin-gated).

**Verificacion:** `tsc --noEmit` OK. **Smoke test RLS transaccional en prod** simulando el usuario admin-miembro (set_config request.jwt.claims, NO service_role): insert recurso → receta → skill → delete (set-replace) → soft-delete recurso → update attrs de servicio, todo PASA bajo las policies reales; rollback limpio (0 residuos, attrs revertidos). Confirma que el camino real del frontend funciona end-to-end.

**Login de prueba para Diego:** `dican19+smoketest05@gmail.com` es admin-miembro de la org de prueba **OrionCare** (`c8b1c83b`, 3 servicios). Sirve para probar la UI ya mismo. Para clientes reales: crear su admin-por-org primero.

**Deuda detectada (Fase 0, baja):** las policies DELETE de `service_resources`/`professional_services`/`resources` usan solo `has_role(uid,'admin')` SIN scope de org (un admin de org A podria, conociendo ids, borrar filas de org B). Riesgo bajo con el modelo admin-por-org (cada admin solo opera su org). Anotado para endurecer si se abre self-service.

**Pendiente operativo:** sigue sin clientes con recursos configurados (resource-aware no-op) hasta primer cliente multi-recurso real. La UI ya existe para cargarlos.

### Fase 4 — PARCIAL 3 Jun (booking service-first en la plataforma)

**Origen:** QA de Diego encontro que el bot respetaba la capacidad de cabinas pero **el agendamiento de la plataforma (`NuevaCita`) mostraba todos los slots del medico Y permitia agendar ignorando las cabinas**. Diagnostico: el camino manual era doctor+duracion, service-agnostico → (1) pedia disponibilidad sin `serviceTypeId` (no resource-aware) y (2) insertaba con `service_type_id` NULL → **el trigger de capacidad de Fase 0 degradaba** (no protegia las citas manuales, solo las del bot). Dos huecos, misma raiz.

**Fix (service-first manual):**
- `create-appointment` (desplegado prod via CLI): acepta `serviceTypeId` opcional; valida que el servicio pertenezca al org; inserta `service_type_id` + `service_type` (nombre) → el trigger vuelve a validar. Traduce el error del trigger (`check_violation` / `RESOURCE_CAPACITY_EXCEEDED`) a 409 amigable ("No hay capacidad de {recurso} en ese horario").
- `get-available-slots` ya era resource-aware (Fase 2B) → solo se le pasa `serviceTypeId`. Sin cambios en la EF.
- `serviceTypesApi.ts`: nuevo `listActiveServiceTypesForOrg(orgId)` (read org-level: id+displayName+duration).
- `api.ts` + `api.supabase.ts`: `getAvailableSlots` y `createAppointment` aceptan `serviceTypeId` opcional.
- `NuevaCita.tsx`: si la org tiene servicios → **service-first** (selector de servicio reemplaza el de duracion; el servicio fija la duracion + habilita resource-aware en slots e insert; calendario gateado hasta elegir servicio). Si la org NO tiene servicios → **degrada** al selector de duracion de siempre (clientes actuales sin cambios).

**Verificado:** `tsc --noEmit` OK. Deploy create-appointment OK. **Smoke test transaccional en prod** (org OrionCare): insert manual con `service_type_id` sobre cabina cap=1 ya ocupada → trigger rechaza con `RESOURCE_CAPACITY_EXCEEDED` (antes pasaba). 0 residuo. (Bonus: el test revelo que la org de prueba ya tiene receta `Consulta general → Cabina 1 cap 1` del QA de Diego.)

**Servicios = fuente unica en Motor → Servicios (3 Jun, decision Diego):** se elimino la seccion "Tipos de servicio" del editor de linea (`WhatsAppLinesList`) y la administracion completa de servicios (crear/editar nombre+duracion + buffer/precio/consulta + receta + baja logica) vive ahora en el tab **Servicios** del panel `/admin/motor`, org-level. Motiva el bug que Diego cazo: "Consulta general" tenia `duration_minutes=NULL` (opcion "Predeterminada" del editor viejo) → bot y plataforma defaultean distinto (bot: line default/60; plataforma: 30) → slots distintos. El editor nuevo **exige duracion** (sin opcion "Predeterminada") para que no se pueda volver a guardar un servicio sin duracion. `serviceTypesApi`: nuevos `saveServiceType` (upsert org,name) + `deactivateServiceType`; removidas las funciones line-scoped muertas (`listServiceTypesByLine`/`saveServiceTypesForLine`) + `ServiceTypeItem`. El bot no se toca (ya lee `service_types` org-level desde Fase 1). NOTA: la columna `service_types.whatsapp_line_id` queda vestigial (los servicios nuevos no la setean; el bot lee por org).

### Fase 4 — vista combinada + auto-asignacion ENTREGADA 3 Jun

**Decisiones Diego:** service-first + override opcional (elegir profesional especifico); auto-asigna al **menos cargado** con opcion de cambiar.

**Implementacion (combinacion client-side, v1):** reusa las EFs ya probadas (`get-available-slots`/`get-available-days`) en fan-out + union, sin backend nuevo. Para el ICP (1 doctor + unas tecnicas) son pocas llamadas paralelas. Si escala, mover a una EF unica `get-combined-slots` (reusable tambien por el bot Fase 6).
- **NUEVO** `src/lib/combinedAvailability.ts`: `getQualifiedDoctors` (skill matrix `professional_services` + **fallback a todos los doctores del org** si el servicio no tiene skills declarados → no bloquea antes de configurar), `getCombinedDays` (union de dias), `getCombinedSlots` (union de slots + lista de profesionales libres por hora), `getDoctorLoadForDate` (conteo de citas/dia), `pickLeastLoaded`, `doctorLabel`.
- `NuevaCita.tsx`: modo `auto` (default, "Cualquier profesional") vs `specific` (override, "Elegir profesional"). Toggle visible solo en orgs con servicios + multi-profesional (`canCombine`). En auto: service-first → dias/slots combinados → al elegir hora auto-asigna el menos cargado entre los libres, con botones para cambiar. `createAppointment` usa el doctor efectivo (asignado en combinado). Degradacion total: org sin servicios o single-doctor/doctorView → flujo doctor+duracion de siempre.

**Verificado:** `tsc --noEmit` OK. **QA EN VIVO APROBADO 3 Jun** (org OrionCare, Diego Escalante + Dra. Lizzy, ambos con skill de Consulta general/especialista). Las capturas de Diego coincidieron EXACTO con el calculo del motor: con Cabina 1 cap=2 mostro `8:30,10:00,10:30,11:00,11:30` (union de ambos profesionales — 8:30/10:30/11:00/11:30 las aporta Lizzy mientras Diego esta ocupado); con cap=1 mostro solo `10:00` (la unica hora con cabina libre — el resto cae porque la cabina de Diego de 08:00 y 11:00 la satura). Auto-asignacion: a las 10:00 pre-selecciono Lizzy (menos cargada, 2 citas vs 3 de Diego), con boton para cambiar a Diego. Resource-aware + suma + menos-cargado: los 3 comportamientos confirmados.

**FASE 4 CERRADA 3 Jun — relabel #24 aplicado (decision Diego: global, no configurable por org).** Relabel global a "Profesional" en el copy visible del flujo de agendamiento. Alcance quirurgico: `src/pages/NuevaCita.tsx` (6 strings: paso "1. Seleccionar Profesional", 2 toasts de validacion, hint de calendario desktop + alert mobile) + `src/components/DoctorSearch.tsx` (5 strings: placeholder, 2 aria-labels, "Buscando profesionales...", empty state). `DoctorSearch` se usa **solo** en `NuevaCita` → el relabel no se filtra a otras pantallas. Se dejaron INTACTOS a proposito: copy de **rol** (sidebar "Agenda Medica", toggle "Vista Medico", gestion de usuarios, onboarding "Agregar Doctor", AgendaMedico) — refieren al doctor logueado como persona/rol, no a "quien atiende la cita"; tocarlos seria scope creep con riesgo de romper semantica de rol. Identificadores de codigo + comentarios internos sin tocar. **`tsc --noEmit` OK.** Pendiente: QA visual de Diego (cargar `/agenda/nueva-cita` y confirmar que el paso/placeholder/toasts dicen "Profesional").

**DEFERIDO de Fase 4 (no bloquea):**
- **Day-view del calendario NO es resource-aware** (`get-available-days` no recibe `serviceTypeId`): un dia puede verse disponible aunque los recursos esten llenos; al abrirlo, el hour-view (resource-aware) muestra los slots reales. NO permite sobre-cupo (hour-view + trigger bloquean), solo cosmetico. (En combinado tampoco, mismo motivo.)
- **Skill matrix en el BOT** (Fase 6): el bot sigue professional-first; el filtrado por skill + service-first del bot es Fase 6. En la plataforma ya se usa la skill matrix (con fallback).
- **Optimizacion:** mover la combinacion a una EF unica si crece el numero de profesionales.

### Fase 5 — Secuenciador de visitas multi-procedimiento ENTREGADA 3 Jun (RIESGO #1)

Plan: `.claude/plans/fase-5-es-el-shiny-orbit.md`. Una **visita** = N procedimientos para un paciente en una fecha, en slots back-to-back, cada uno con su profesional (auto-asignado al menos cargado, override), N filas de `appointments` que comparten `visit_id`, insertadas atomicamente. Cancelar afecta el bloque.

**Decisiones Diego:** (1) profesional distinto por procedimiento auto-asignado; (2) back-to-back SIN buffer interno (el buffer = limpieza para la siguiente cita EXTERNA, no entre procedimientos de la misma visita); (3) cancelar = bloque completo, reagendar-bloque DIFERIDO (MVP: cancelar+reagendar); (4) alcance = plataforma manual (`NuevaCita`), bot = Fase 6.

**Piezas (todas desplegadas en prod):**
- **P1 Trigger visit-aware** — migracion `20260603120000_motor_07_capacity_trigger_visit_exempt.sql`. Predicado agregado `AND (NEW.visit_id IS NULL OR a.visit_id IS DISTINCT FROM NEW.visit_id)` → procedimientos de la misma visita no cuentan entre si. **Backward-compat byte-identico** para `visit_id NULL` (todo lo de hoy). QA: (a) exencion no auto-bloquea + externo sobre-capacidad SI bloquea; (b) dos NULL solapando siguen bloqueando = identico a motor_06. PASS.
- **P2 RPC atomica + EF** — migracion `20260603120100_motor_08_create_visit_appointments.sql` (`create_visit_appointments(jsonb, uuid)`, SECURITY DEFINER, REVOKE anon/authenticated). EF **`create-visit`** (auth + validacion org/doctor/servicio + rpc + 1 confirmacion WhatsApp consolidada, suprime recordatorios de filas no-primeras → uno consolidado por visita). Wrapper `createVisitAppointments` en `api.supabase.ts`. QA (c): rollback atomico si falla procedimiento k (0 huerfanas) + happy path. PASS.
- **P3 Secuenciador** — primitivas nuevas en `_shared/availability.ts` (`loadVisitDayState`, `isDoctorFree`, `isResourceCapacityOk`, `serviceBuffer`, `dateTimeToMs`, `msToHHMM`, `visitStartCandidates`; promovidos a export los 4 loaders). EF **`get-visit-slots`** (greedy: por cada inicio T encadena offsets back-to-back, exige profesional libre + capacidad por procedimiento vs citas EXTERNAS, auto-asigna menos cargado). Wrapper `getVisitSlots`. QA (d): chain con duraciones **no-grilla** (45+50) inserta limpio; chain sobre recurso ocupado rechaza atomico. PASS. **Salida del greedy en si NO testeable sin login → va en el E2E de Diego.**
- **P4 UI** — `src/components/VisitBooking.tsx` (autocontenido). `NuevaCita.tsx`: toggle "Cita simple / Visita (varios)" solo en `canCombine`; el flujo de cita simple queda en el else, **intacto**. `tsc` OK.
- **P5 Cancelar visita** — `update-appointment` visit-aware: cancel con `visit_id` cancela el bloque (doctor-only dirige a recepcion); reschedule de cita con `visit_id` → 409 "cancela la visita y vuelve a agendar". `appointmentActions.cancelAppointment` devuelve `visitCancelled`+`count`; `PatientDetail` toast refleja N. QA (e): cancelar 1 fila → 3/3 cancelada. PASS.

**Seguridad:** RPC + EFs nuevos confian en la auth de la EF (service-role), igual que `create-appointment`. NO hay constraint DB de doble-booking de profesional (igual que el booking simple); el secuenciador lo evita en read-time + chequeo de slot exacto en `create-visit`. Race concurrente documentado, aceptable para white-glove.

**E2E QA-APROBADO 3 Jun (Diego, logueado).** Verificado en DB real (org prueba): visita `351d7ce2` = Consulta general 08:30 (Diego, 30min) → Consulta especialista 09:00 (Lizzy, 15min), back-to-back exacto, **profesionales distintos**, mismo `visit_id`; cancelar 1 fila → cascada cancelo ambas (`81dc4db5` 2/2 cancelada). Greedy + suma + back-to-back + cancel-bloque confirmados con datos reales.
- **Fix post-QA (commit 1b27f28):** reagendar una cita parte de visita SI se bloqueaba (409) pero mostraba error generico. Ahora `RescheduleModal` recibe `visitId` (plumbeado: `Appointment.visitId`+`mapAppointment`+`PatientDetail`) y, si la cita es de una visita, muestra mensaje claro SIN el form ("cancela la visita y vuelve a agendar"). `handleSubmit` extrae el mensaje del body en cualquier 4xx.
- **Fix post-QA (commit ceee2be):** `get-visit-slots` daba 401 (usaba supabase-js 2.39.0 + `getUser`); alineado al patron de `get-available-slots` (header presente + service-role, gateway valida).

**Fast-follow (diferido, fuera de Fase 5):**
- Reagendar-visita-en-bloque (RPC `reschedule_visit`, mismo patron que P2+P3). Hoy: cancelar+reagendar.
- `RescheduleModal` de citas NORMALES sigue duration-based (no service/resource-aware); el trigger de capacidad lo protege (409 con mensaje claro), pero la UX ideal seria service-first como `NuevaCita`.

### Fase 6 — Bot service-first estructurado IMPLEMENTADA 3 Jun (el diferenciador) — PENDIENTE deploy + E2E

Plan: `.claude/plans/fase-6-bot-service-first.md`. **Decisiones Diego (3 Jun):** (1) **auto-asigna el menos cargado SIN paso de elegir profesional** (bot maximo control + fuga de oferta); (2) alcance = **nucleo + consulta previa + precio** (cierra la verificacion F6 completa).

**Que hace:** invierte el flujo del bot de professional-first → **service-first**. El paciente elige el SERVICIO, el bot calcula los profesionales calificados (skill matrix `professional_services` + fallback a todos = degradacion), muestra disponibilidad **combinada** (union resource-aware via Fase 2B) y al elegir hora **auto-asigna el menos cargado**. Replica en el bot lo que `NuevaCita`/`combinedAvailability.ts` ya hacen en la plataforma (Fase 4).

**De-risk (clave):** los 4 clientes reales son lineas de **1 doctor** → para ellos no cambia nada visible (nunca ven paso de doctor; combined degrada a 1 profesional; 1 servicio = auto-select silencioso = identico a hoy). El cambio de orden solo afecta orgs multi-profesional = el ICP + la org de prueba (Diego+Lizzy con skills). **Blindaje extra:** el camino single-doctor prefiere el calendario de la LINEA (`whatsapp_line_doctors.calendar_id`) con fallback a `calendar_doctors` → parity exacta de disponibilidad con el bot legacy para clientes actuales (evita que un mismatch de calendario les cambie los slots).

**Arquitectura (minima invasion):** la logica combinada solo afecta la ENUMERACION semana/dia/hora; al elegir hora el bot auto-asigna y setea `doctorId/doctorName/calendarId` → todo el downstream (confirmar/nombre/INSERT/re-validacion) queda single-doctor SIN cambios. El flujo legacy professional-first (org SIN servicios) se mantiene intacto como fallback.

**Cambios (todos en `bot-handler/index.ts`, +446 lineas):**
- Carga de `service_types` agrega `price` + `requires_prior_consult` a `lineServiceTypes`.
- `startBookingFlow`: si org tiene servicios → `startServiceFirstFlow`; si no → legacy. Limpia `combinedMode/qualifiedDoctors/combinedSlotDoctors/availableDoctors/selectedServicePrice`.
- NUEVAS: `startServiceFirstFlow`, `resolveServiceAndContinue` (gating consulta-previa + skill resolve), `getQualifiedDoctorsForService` (port org-level de combinedAvailability), `isNewPatient`, `getCombinedWeeks/DaysInWeek/SlotsForDate`, `getDoctorLoadForDate`, `pickLeastLoaded`, `firstActiveCalendarId`, `lineCalendarForDoctor`, `doctorDisplayLabel`.
- `handleBookingSelectService` reescrito → `resolveServiceAndContinue`.
- Branch `combinedMode` en `handleBookingSelectWeek/Day` + `showHourSlots` (guarda `combinedSlotDoctors` = libres por hora). Auto-asignacion en `handleBookingSelectHour` al elegir slot. Precio en confirmacion (`💵 Lps. ...`).
- Reschedule limpia `combinedMode` (siempre single-doctor, mismo doctor de la cita).

**Consulta previa:** paciente NUEVO (`isNewPatient`: sin registro o sin citas no-canceladas) + servicio `requires_prior_consult=true` → ofrece los servicios con `requires_prior_consult=false` (las consultas) primero; si no hay ninguno → handoff. Al elegir la consulta vuelve por el mismo handler y procede.

**Verificacion:** `deno check` sobre bot-handler **type-clean** (unico error = preexistente `_shared/meta-media.ts:225` Blob/Uint8Array, falso positivo de Deno 2.8 vs runtime Supabase, no tocado). **DESPLEGADA a prod 3 Jun** (`supabase functions deploy bot-handler`, bundler OK).

**E2E NUCLEO QA-APROBADO 3 Jun (Diego, 2 citas reales via bot, verificadas en DB org prueba):** ambas Consulta general a las **10:00 del 04-Jun**, profesionales DISTINTOS auto-asignados — 1ra a Lizzy (`c113d3ab`, menos cargada; Diego ya tenia citas ese dia), 2da a Diego (`75a27c93`, unico libre a las 10:00 tras ocuparse Lizzy). `service_type_id` (b97277cb Consulta general) + `calendar_id` por doctor (Lizzy 7594…/ Diego 297f…) + `appointment_at` 16:00 UTC = 10:00 -06 correctos, `duration_minutes` 30. **Confirma toda la cadena:** union combinada, menos-cargado, exclusion del profesional ocupado en la 2da pasada, llenado de capacidad cruzada (2 pacientes misma hora = 2 recursos). **Precio confirmado visualmente 3 Jun** (Diego: la linea `💵 Lps.` aparece antes de confirmar cuando el servicio tiene `price`). **Pendiente solo confirmacion visual (bajo riesgo):** consulta-previa (paciente nuevo + `requires_prior_consult`).** (org prueba OrionCare con Diego+Lizzy skilled): service-first multi-profesional → dias/horas combinados → auto-asigna menos cargado en confirmacion; resource-aware (cabina llena oculta hora); degradacion Demo Bot 1-doctor sin cambios; consulta previa paciente nuevo; precio en confirmacion.

**Anti-scope-creep:** NO elegir profesional especifico (auto y punto), NO NLP, precio ad-hoc sigue siendo FAQ, reagendar combinado diferido.

---

## PROXIMO — Rediseño UI "Nueva Cita" (vista única) — PLANIFICADO 3 Jun, sin arrancar

**Plan completo:** `.claude/plans/rediseno-nueva-cita-ui.md`. Brief y prompts de Stitch en
`docs/stitch-brief-nueva-cita.md` + `docs/stitch-prompt-vista-unica.md`.

**Origen:** Diego pidió rediseñar `/citas/nueva` (se veía "medio feo" = tema slate por defecto +
1 columna). Se iteró con Google Stitch hasta un mockup aprobado (iteración 3): **app-shell sin
scroll de página, 2 columnas, week-strip de 2 semanas, slots Mañana/Tarde en caja con scroll
interno, footer sticky con auto-asignación**.

**Decisión de producto clave (Diego):** **UNIFICAR cita simple + visita en UNA sola vista** — el
usuario agrega 1+ servicios (1 = cita normal, 2+ = procedimientos consecutivos), sin toggle de modo.
Quita la fricción de "elegir modo". Implementar el mockup = implementar esta unificación.

**Arquitectura acordada (clave para no romper nada):**
- **Disponibilidad SIEMPRE vía `get-visit-slots`** (ya maneja 1..N; devuelve inicios factibles +
  profesional sugerido + `freeDoctorIds` por procedimiento).
- **INSERT ramifica por cantidad:** 1 servicio → `create-appointment` (SIN `visit_id`, reagenda
  normal); 2+ → `create-visit` (con `visit_id`, atómico). **Razón:** si toda cita llevara `visit_id`,
  `update-appointment` bloquearía el reagendar (línea 170: `if (appt.visit_id)` → 409). Ramificar el
  insert evita esa regresión. NO unificar el backend en "todo es visita".
- **Degradación:** orgs SIN servicios → flujo viejo basado en duración (fallback).
- **Cambio de profesional por procedimiento:** chips desde `freeDoctorIds` (ya existe en VisitBooking).

**Decisión de alcance visual (Diego):** **"solo layout, sin teal"** — se implementa la estructura
nueva con el tema **slate actual** (reusa tokens/componentes shadcn + lucide). La identidad teal/ámbar
+ Geist del mockup queda **diferida** (a futuro es cambio centralizado en CSS vars, barato). NO se
copia el sidebar/top-bar del mockup; se mantiene `MainLayout`.

**Integración verificada:** `MainLayout` NO se toca — su `<main>` acepta `mainClassName`; pasando
`overflow-hidden flex flex-col` se logra el app-shell y el footer va como hijo `shrink-0` (sin
`position:fixed` frágil). Sin EFs ni migraciones nuevas (backend ya existe).

**Defaults tomados:** reminder3d = toggle compacto en card de Paciente · servicios muestran
precio+duración (sin categoría, no existe en `service_types`) · header actual se mantiene.

**Fases (~14-20h, todo frontend + Fase 0 backend):** 0) `get-visit-days` (week-strip resource-aware) ·
1) componente unificado (absorbe VisitBooking, insert-split) · 2) UI (app-shell 2-col, `WeekStrip`,
footer, panel "Ver detalle") · 3) estados+mobile+validación · 4) limpieza (remover VisitBooking) +
verificar reagendar + QA. **Trabajar por fases con checkpoints de Diego.**

### Refinamientos del review (4 Jun) — en `.claude/plans/rediseno-nueva-cita-ui.md`
Se revisó el código antes de implementar y se resolvieron 5 huecos plan↔código (sección
"Refinamientos del review de código"): (1) el week-strip necesitaba fuente de días que
`get-visit-slots` (per-fecha) no da → **Fase 0**; (2) days-EF son por-mes y el strip de 2 sem cruza
meses → fetch 1-2 meses + merge; (3) "una sola vista" = 1 UI pero 3 paths de datos (ICP via
get-visit-slots; single-doctor/doctor-view via get-available-slots con doctor fijo; sin-servicios via
duración) — `get-visit-slots` auto-asigna y no fija profesional; (4) en el path ICP NO se usan
`getDoctorLoadForDate`/`pickLeastLoaded` (la EF ya trae `suggestedDoctorId`); (5) eliminar el
auto-scroll (`agendarRef`/`fechaRef`) con el app-shell.

### Fase 0 — `get-visit-days` DESPLEGADA 4 Jun (PENDIENTE solo smoke test de lógica)
**Deploy OK** (`npx supabase functions deploy get-visit-days get-visit-slots`, bundle incluyó
`_shared/availability.ts`+`cors.ts` sin error → módulo compartido compila/bundlea limpio). Ambas
activas en prod. Falta solo verificación de LÓGICA (no testeable sin JWT/app): get-visit-slots se
valida con "agendar una visita como hasta ahora" (E2E Fase 5 lo cubre); get-visit-days se valida
cuando Fase 1 lo cablee (comparar días tachados del strip vs slots reales).
Es a las visitas lo que `get-available-days` a las citas simples: dado el rango del week-strip (~14
días), devuelve por día `{working, canFit}` para tachar los sin cupo en UNA llamada (datos batcheados
por rango), no N llamadas a `get-visit-slots`. **Resource-aware** (arregla de paso la deuda "day-view
no resource-aware" para el ICP).
- **`_shared/availability.ts`** (+3 exports): `loadSchedulesAllDows` (horarios de toda la semana de
  un doctor, 1 query), `loadVisitRangeState` (estado de visita por rango → `Map<fecha,VisitDayState>`,
  mismo armado que `loadVisitDayState` pero 2 queries de rango para citas/consumo + estáticos por
  doctor/servicio), `resolveVisitContext` (resolución compartida servicios+profesionales calificados).
- **`get-visit-slots`**: refactor para usar `resolveVisitContext` (extracción verbatim; greedy
  intacto). **Razón:** strip y slots DEBEN resolver los mismos profesionales o el strip mostraría
  "disponible" donde los slots dicen "sin profesional". Comportamiento idéntico → necesita re-smoke
  de Diego (E2E Fase 5/6 ya cubre el greedy).
- **NUEVA `get-visit-days/index.ts`**: resuelve contexto → `loadVisitRangeState` → greedy por día con
  early-exit (basta 1 inicio factible). Auth = patrón get-visit-slots (header + service-role).
- **Wrapper** `getVisitDays` en `api.supabase.ts`. **`tsc --noEmit` OK.**
- **Deuda de validación:** `deno`/CLI no están en PATH de la sesión Claude (sí en el shell de Diego).
  **Deploy:** `npx supabase functions deploy get-visit-days get-visit-slots --project-ref soxrlxvivuplezssgssq`
  (bundlea `_shared` + type-check). `get-visit-days` es inerte hasta Fase 1 (nada la invoca) → deploy
  seguro; `get-visit-slots` redeploy es behavior-preserving. Smoke test: invocar get-visit-days con la
  org de prueba OrionCare (Diego+Lizzy) y 1-2 servicios, comparar días tachados vs get-visit-slots.

### Fase 1 — data-hook unificado IMPLEMENTADO 4 Jun (sin UI; página actual intacta)
**NUEVO `src/hooks/useAppointmentComposer.ts`** — núcleo de datos/lógica de la Nueva Cita unificada.
NO renderiza: expone estado + acciones para que Fase 2 (UI) las consuma. La página `NuevaCita.tsx`
actual NO se tocó (sigue 100% funcional).
- **3 paths derivados** (sin toggle de modo): `visit-engine` (ICP = hasServices && !isDoctorView &&
  !isSingleDoctorOrg → get-visit-days + get-visit-slots, 1..N servicios, auto-asigna menos cargado
  server-side); `single-doctor` (doctor logueado u org 1-doctor con servicios → get-available-days/
  slots con doctor FIJO + serviceTypeId resource-aware, 1 servicio); `duration` (org sin servicios →
  selector de duración + doctor, get-available-* clásico). Preserva el comportamiento de los 4
  clientes reales (single-doctor) y de doctores logueados.
- **Ventana de 14 días** (week-strip): visit-engine usa `getVisitDays`; los otros paths fetchean los
  1-2 meses que cruza la ventana con `getAvailableDays` y mergean (refinamiento #2).
- **Insert-split:** 2+ procedimientos (solo visit-engine) → `create-visit` (atómico); 1 →
  `create-appointment` (sin visit_id → reagenda normal, sin regresión).
- **Sin getDoctorLoadForDate/pickLeastLoaded en cliente** (refinamiento #4): el sugerido lo trae
  get-visit-slots (`suggestedDoctorId`), overridable vía `freeDoctorIds`.
- **Cambio aditivo** en `serviceTypesApi.ts`: `OrgServiceType.price` + se selecciona `price` (para el
  total del footer). Returns de `saveServiceType` actualizados. `tsc --noEmit` OK.

### Fase 2 — UI (núcleo) IMPLEMENTADA 4 Jun (PENDIENTE checkpoint visual de Diego)
`NuevaCita.tsx` reescrita como vista única consumiendo `useAppointmentComposer`. `tsc --noEmit` OK.
- **App-shell 2-col** vía `MainLayout mainClassName="overflow-hidden flex flex-col"`; footer sticky
  como hijo `shrink-0` (sin position:fixed). Contenido `overflow-auto` (no-scroll perfecto → Fase 3).
- **NUEVO `src/components/MonthGrid.tsx`** (reemplazó WeekStrip 4 Jun, feedback Diego: aprovechar
  espacio + mostrar todo el mes): grilla MENSUAL alineada por día de semana (Dom–Sáb), navegable mes a
  mes (no antes del mes actual), días sin cupo/pasados tachados. Alimentado por `daysMap`. Simplificó
  el path no-ICP (1 llamada `get-available-days` por mes, sin merge de meses).
- **Paso 3 unificado en UNA card** (MonthGrid + separador + horarios juntos) + layout más ancho
  (`max-w-[1700px]`, cols `2fr/3fr`) para aprovechar el espacio.
- **Ajustes post-feedback Diego (4 Jun):** (a) overlay de carga gris + `pointer-events-none` en
  MonthGrid mientras carga la disponibilidad diaria (`isLoading = isLoadingDays || daysMap vacío` →
  bloquea clicks de día/flechas hasta tener datos, cierra el hueco del click prematuro); (b) horarios
  SIN scroll interno (quitado `max-h-72 overflow-y-auto`) → usan el espacio vertical disponible. Esto
  reemplaza la idea de "cajas de altura fija con scroll" de Fase 3.
- Izq: Paciente (PatientSearch + card recordatorio) + Servicios (catálogo + lista ordenada ↑↓✕ con
  total, o selector de Duración en path duración, o DoctorSearch si `requiresDoctorSelection`).
- Der: WeekStrip + Horarios Mañana/Tarde (caja scroll, formato 12h).
- Footer: resumen fecha/hora + Total (servicios·L·duración) + `ProfesionalSummary` (badge ✨Auto en
  visit-engine + Popover "Ver detalle" con timeline + cambio por procedimiento vía `freeDoctorIds`) +
  botón Agendar (insert-split por `submit()`).
- `VisitBooking` ya NO se importa (quedó huérfano → se remueve en Fase 4). Auto-scroll eliminado.

### Fase 3 — mobile + footer + estados finos IMPLEMENTADA 4 Jun (PENDIENTE checkpoint visual Diego)
Solo `NuevaCita.tsx` (quirúrgico). `tsc --noEmit` OK. Al revisar el código, lo de Fase 3 ya estaba
mayormente cubierto por Fase 2 (estados vacío/cargando/sin-slots/error vía overlay MonthGrid + spinner
slots + `slotsReason`/`daysError`; 1-columna en mobile cae solo porque el grid es `lg:grid-cols-[2fr_3fr]`
→ debajo de `lg` 1 col, orden DOM correcto Paciente→Profesional→Servicios→Fecha; footer fijo abajo ya
sale del `<main>` flex-col + footer `shrink-0`). Lo que faltaba de verdad y se hizo:
- **Footer responsive:** contenedor `flex flex-col gap-3 md:flex-row md:flex-wrap`. Móvil = cluster de
  resumen (fecha·hora / Total / `ProfesionalSummary`) que envuelve arriba + botón **full-width** abajo;
  desktop = resumen a la izquierda + botón a la derecha (`md:ml-auto`, ancho auto). Antes el `flex-wrap`
  + `ml-auto` dejaba el botón chico/desalineado en pantalla angosta.
- **Hint del siguiente paso** (estado fino): cuando `!canSubmit`, texto arriba del botón guiando el paso
  pendiente en orden de flujo ("Selecciona un paciente" → "Agrega un servicio"/"Selecciona un profesional"
  en path duración → "Elige una fecha" → "Elige un horario"). Cierra el "deshabilitado en silencio".
- **Spinner al agendar:** `Loader2` animado en vez de `CheckCircle` mientras `isSubmitting`.
Nota: el "no-scroll app-shell" estricto de Fase 3 ya se había relajado (decisión Diego: usar el espacio,
contenido con `overflow-auto`) → NO se persiguió; el footer fijo se logra con el flex-col del main.

### Rediseño mobile (4 Jun) — iterado con Diego sobre mockups de Stitch, TODO EN PROD
Serie de commits 68e21c3 → 76baaa0. Solo `NuevaCita.tsx` + `MonthGrid.tsx`. Cada paso: implementar →
push → Diego revisa en Vercel desde el teléfono → siguiente. Desktop intacto (todo bajo breakpoints
`lg`/`md` o props que solo activa el camino mobile). `tsc` limpio en cada commit. Entregado:
- **Fecha/hora en `Drawer` (vaul) fullscreen:** tarjeta tappable en mobile abre bottom-sheet a
  `h-[100dvh] mt-0` (override twMerge sobre el `mt-24` base). Desktop sigue con el panel inline.
  `DateTimePanel` extraído y reutilizado inline (desktop) y dentro del drawer (mobile).
- **`MonthGrid` colapsable** (prop `collapsible`, solo en el drawer): al elegir día colapsa a la **semana**
  de ese día (grid 7-col en 1 línea, sin scroll) con botón "Expandir" para volver al mes. Header del
  drawer con badge "Paso 3"; horarios "Horario en la mañana/tarde", 4 por línea en mobile (5 desktop),
  sin el header redundante de fecha.
- **Patrón "todo a la vista" por pasos:** badges `StepBadge` "Paso N" (✓ al completar). Paciente sin
  seleccionar = buscador + "Crear nuevo paciente"; al seleccionar **colapsa a tarjeta-avatar** (iniciales
  + nombre + Cambiar) con el recordatorio integrado dentro del mismo bloque; en mobile se elimina el
  chrome del Paso 1 (header + borde) para subir los servicios.
- **`ServicePicker` (extraído) estilo carrito:** buscador + chips horizontales **solo-nombre** (sin +,
  sin duración/precio) + cards de servicio elegido en **1 línea** (nombre · duración · precio · quitar);
  placeholder corto "Selecciona servicios…"; tiempo estimado junto al título ("Servicios a realizar ·
  est. 1h 15m").
- **Footer compacto:** en mobile no muestra info hasta elegir fecha y hora (solo el botón); luego muestra
  **solo profesional asignado** (sin total estimado): 1 prof = "Profesional asignado <nombre>" + Auto +
  Cambiar (si aplica); 2+ = "X profesionales asignados" + Auto + Ver detalle, en 1 línea.
  `ProfesionalSummary` refactorizado a inline (la etiqueta vive en el propio texto).
- **Paso 3 unificado:** título "Fecha y hora" + badge "Paso 3" + valor/hint en UNA tarjeta tappable
  (antes header encima de un botón-tarjeta = borde dentro de borde). Chevron › sin elegir / lápiz ✏ elegido.

### Fase 4 — limpieza de código CERRADA 5 Jun (`tsc` OK)
- **Removido `src/components/VisitBooking.tsx`** (huérfano: la vista unificada lo absorbió, ya no se
  importaba en ningún `.tsx`).
- **Removido `src/lib/combinedAvailability.ts`** (muerto en cascada: tras quitar VisitBooking quedó sin
  un solo importador — la nueva `NuevaCita`/`useAppointmentComposer` usan `getVisitSlots`/`getVisitDays`
  server-side, no la combinación client-side de Fase 4). `tsc --noEmit` confirma 0 imports colgantes.
- **Reagendar verificado intacto (revisión de código, no regresiona por el insert-split):** el
  insert-split de `useAppointmentComposer.submit()` solo manda a `create-visit` (con `visit_id`) cuando
  `path==='visit-engine' && chain.length>=2`; toda cita de 1 servicio va a `create-appointment` SIN
  `visit_id`. El bloqueo de reagendar de `update-appointment` (409, líneas 170-176) y el mensaje de
  `RescheduleModal` (`isVisit`) solo se disparan con `visit_id` presente → las citas simples reagendan
  normal. Sin regresión.

### QA EN VIVO COMPLETADO 5 Jun (Diego) — Fase 4 cerrada salvo 1 fix menor
Diego pasó el QA de los 3 paths. **2 observaciones:**
1. **Bug badge "Auto" — RESUELTO 5 Jun (`tsc` OK):** el badge ✨Auto del footer (`ProfesionalSummary`
   en `NuevaCita.tsx`) se mostraba siempre en `visit-engine` sin reflejar el override manual del
   profesional. Fix: se expone `suggestedDoctorId` en cada fila del `chain` (`useAppointmentComposer`)
   y el componente compara `doctorId !== suggestedDoctorId` → badge "Manual" (gris) cuando hay override,
   "Auto" (ámbar) cuando coincide con lo que sugirió el motor.
2. **Multi-procedimiento con 1 solo médico — DIFERIDO (decisión Diego 5 Jun):** el path `single-doctor`
   topa `maxItems=1` (no deja armar visita de varios procedimientos). El ICP multi-profesional NUNCA
   cae en este path, así que no lo necesita; se difiere para no agregar un data-path nuevo
   (single-doctor vía `get-visit-slots`) + su QA bajo feature freeze. Reabrir solo si aparece un cliente
   de 1 solo médico que encadene procedimientos secuenciales (consulta+procedimiento back-to-back).

**PENDIENTE menor:** OK visual de Diego en DESKTOP (todo el feedback fue mobile) + smoke de
`get-visit-days` cuando se valide el strip. Requieren app logueada → los hace Diego.

---

## PRIORIDAD #1 — Sprint Coexistence (1-4 Jun 2026)

### Estado de ejecucion (1 Jun)

Plan original revisado contra el codigo real. **2 decisiones tomadas con Diego:**
1. **Eliminar `/register` del todo** (no flag, no deteccion) — coexistence es EL unico modo de onboarding. El hueco del plan original (item 2 "detectar coexistence en la respuesta") era falso: **no existe ningun campo** de Meta/DB que distinga migracion de coexistence; el bloque `/register` corria a ciegas siempre.
2. **Ejecucion por fases** — Fase A (QR testeable) antes de invertir en historicos/echoes.

**FASE A — CODEADA (pendiente gate test manual):**
- [x] A1: `FB.login` switch a coexistence — `MetaEmbeddedSignup.tsx`. **BUG ENCONTRADO Y RESUELTO 1 Jun:** el Embedded Signup de OrionCare ya esta en **v4**. En v4 el feature type NO va como string suelto v3; el `extras` DEBE incluir `version: 'v4'` o Meta lo ignora y cae al flujo estandar destructivo. Sintaxis correcta confirmada copiando la URL del launcher v4 del propio dashboard (Casos de uso → WhatsApp → Administrador de registro insertado → Tipo de funcion = "Registro de app de WhatsApp Business"):
  ```js
  extras: { featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3', version: 'v4' }
  ```
  (Quitado el `setup: {}` para igualar exacto al launcher de Meta.) Las 2 primeras pruebas (sin `version: 'v4'`) mostraban el flujo viejo de crear WABA + verificar numero por SMS.
- [x] A2: bloque `/register` eliminado (`meta-embedded-signup/index.ts`); ahora marca `meta_registered=true` sin PIN ni fetch destructivo. Frontend ya no ofrece boton "Activar" (era el re-trigger destructivo).
- [x] A3: instrucciones QR scan — nota persistente en `MetaEmbeddedSignup.tsx` + panel post-conexion en `WhatsAppSettings.tsx`. Cubre ambos entry points (Settings + LinesList dialog).
- [x] Typecheck `tsc --noEmit` OK.
- [x] **Config dashboard verificado** ✅ — Tech Provider verificado, permisos correctos, feature "Registro de app de WhatsApp Business" disponible en v4.
- [x] **GATE FASE A PASADO 1 Jun** ✅ — Diego confirmo: interaccion simultanea via API + WA Business App (coexistence real, app NO se desloguea). Plantillas de la cuenta nueva verificadas y funcionando. El dealbreaker de Skin Medic queda resuelto.

**FASE B — en curso:**
- [x] **B1** ✅ (1 Jun, desplegado) — migration `20260601130000_coexistence_sync_state.sql` (`sync_in_progress` BOOL + `last_historical_webhook_at` TIMESTAMPTZ en `whatsapp_lines`). SQL aplicada manual via dashboard (proyecto no enlazado en entorno dev; migration es idempotente). `meta-embedded-signup` marca `sync_in_progress=true` + baseline al vincular.
- [x] **B2** ✅ (1 Jun, desplegado) — `meta-webhook`: `isHistoricalMessage()` (timestamp Unix >5min). **Gate combinado `sync_in_progress && histórico`** (no solo timestamp → fuera de sync, mensaje atrasado recibe proceso normal). Histórico → persiste + crea conversación, pero NO bot/transcripción/intent; refresca `last_historical_webhook_at`. Botones históricos (confirmar/permiso llamada) protegidos. **ORDEN DE DEPLOY CRÍTICO:** migration antes del webhook (el select referencia la columna; sin ella se rompe la recepción).
- [x] **B3** ✅ (1 Jun, desplegado, **QA APROBADO**) — handler `smb_message_echoes` en `meta-webhook`. **Resuelve la visibilidad app→OrionCare:** mensajes que la asistente envia desde la WhatsApp Business App del celular se persisten como outbound (`source=assistant`) y aparecen en el inbox. Estructura confirmada contra doc oficial Meta (`change.value.message_echoes[]`, field `smb_message_echoes`). Idempotente por `provider_message_id` (NO duplica mensajes que OrionCare ya envio via API). Conversacion nueva por echo → `human_active`. Reusa `persistOutboundMessage` + `updateConversationOnOutbound`. **Media:** se guarda referencia `meta-media:<id>` sin descargar el archivo (texto/caption se ve perfecto; descargar archivos de echos = mejora futura). Echos historicos (durante sync) se persisten silenciosos sin reordenar el inbox.
  - **Mejora de B2 (mismo deploy):** el gate de historico ahora corta ANTES de `updateConversationOnInbound` → los mensajes historicos del flood YA NO inflan `unread_count` ni saltan la conversacion al tope (quedan realmente "silenciosos").
- [~] **B4** — `smb_app_state_sync` (sync de contactos del celular): **DESCARTADO** (decision Diego 1 Jun). Bajo valor (sincronizar nombres de contactos) vs superficie de mantenimiento; no bloquea el flujo de mensajes.
- [x] **B5** ✅ (1 Jun, jobid 12) — watchdog pg_cron `coexistence-sync-watchdog`, **SQL puro cada 2 min** (no edge function — la logica es 1 UPDATE; SQL puro evita cold start/HTTP/auth y es mas confiable). Apaga `sync_in_progress` en lineas con >5 min sin mensajes historicos. Frecuencia */2 (no */1) por higiene de `cron.job_run_details`; el query es no-op casi siempre (tabla diminuta). Migration `20260601140000_coexistence_sync_watchdog.sql`. **Cierra el ciclo de B2: la bandera de sync ya se apaga sola.**
- [x] **B6** ✅ (1 Jun) — badge "Sincronizando historial de WhatsApp…" en el header del inbox cuando la linea relevante tiene `sync_in_progress=true`. Frontend-only. `useWhatsAppLines` expone `syncInProgress` y **sondea cada 30s SOLO mientras hay sync** (se auto-detiene → cero polling en operacion normal). Banner ambar en `InboxFilters`.

### ✅ FASE B CERRADA (1 Jun) — Sprint Coexistence (PRIORIDAD #1) ENTREGADO
Coexistence end-to-end: gate A (interaccion simultanea app+API) + plantillas OK + filtro de historial (B2) + auto-apagado del sync (B5) + visibilidad bidireccional con echoes QA-aprobados (B3) + badge de sync (B6). B4 descartado. El dealbreaker que mato a Skin Medic queda resuelto; onboarding sin amputar la WhatsApp Business App del cliente.

### Feature derivada: selector de linea en el inbox (1 Jun) — ✅ codeada

Coexistence habilita N lineas por org → el inbox mezclaba todo. Agregado selector de linea (dropdown, visible solo con >1 linea). **Filtro 100% client-side** (cada conversation ya trae `whatsapp_line_id`) — sin tocar query Supabase, Realtime ni DB. Default "Todas las lineas" + etiqueta de linea por conversation. Seleccion persiste en localStorage (`inbox:selectedLineId`), se auto-resetea si la linea desaparece. Badge global sigue org-wide. Caveat: `useConversations` limita a 50 convs mas recientes org-wide; con varias lineas de alto volumen una linea silenciosa puede sub-representarse — si escala, mover a server-side. Archivos: `useWhatsAppLines.ts` (nuevo), `useConversations.ts` (filterConversations +lineId), `InboxList.tsx`, `InboxFilters.tsx`, `ConversationListItem.tsx`.

### Contexto en una linea

Skin Medic se perdio el 27 May porque el flujo actual de Embedded Signup llama `POST /{phone_number_id}/register` con PIN 2FA = migracion destructiva que desloguea la WhatsApp Business App del cliente. La asistente perdio acceso a "reenviar archivo" y demas features nativas, no pudo trabajar, el cliente cancelo. **Coexistence (modo oficial de Meta GA desde mediados 2025) resuelve esto: el numero queda EN AMBOS lados — Cloud API + WA Business App vinculados via QR scan.**

### Plan tecnico (10 items, ~14-17h trabajo)

| # | Cambio | Archivo + linea | Estimacion |
|---|---|---|---|
| 1 | `featureType: 'whatsapp_business_app_onboarding'` + `sessionInfoVersion: '3'` (string, no numero) | `src/components/whatsapp/MetaEmbeddedSignup.tsx:206-208` | 30 min |
| 2 | Detectar Coexistence en respuesta y **skipear el bloque `/register`** | `supabase/functions/meta-embedded-signup/index.ts:540-583` | 2h |
| 3 | UI: instrucciones "Abre WhatsApp Business App → Configuracion → Dispositivos vinculados → Escanea QR" | nuevo componente o ajuste a `MetaEmbeddedSignup.tsx` | 1h |
| 4 | Migration: `ALTER TABLE whatsapp_lines ADD COLUMN sync_in_progress BOOLEAN DEFAULT FALSE, ADD COLUMN last_historical_webhook_at TIMESTAMPTZ` | nueva migration `20260601_*_coexistence_sync_state.sql` | 15 min |
| 5 | `isHistoricalMessage(timestamp)` — si > 5min en el pasado, skipear bot routing + media transcription dispatch + intent notification, solo persistir + crear conversacion silenciosa | `supabase/functions/meta-webhook/index.ts:~310` (handleIncomingMessage start) | 2h |
| 6 | Handler nuevo: `smb_message_echoes` — mensajes que la asistente envia desde su celular llegan como echo via webhook. Persistir como outbound en `message_logs` para que aparezcan en inbox OrionCare | `supabase/functions/meta-webhook/index.ts` (nuevo field handler) | 2h |
| 7 | Handler nuevo: `smb_app_state_sync` — sincronizar cambios de contactos hechos en el celular | `supabase/functions/meta-webhook/index.ts` | 1.5h |
| 8 | Worker cron 1-min: revisa lineas con `sync_in_progress=true`. Si `NOW() - last_historical_webhook_at > 5 min`, marca `sync_in_progress=false` | nuevo edge function `coexistence-sync-watchdog` + pg_cron | 1.5h |
| 9 | UI inbox: badge "Sincronizando historial" en header cuando `sync_in_progress=true` | header de inbox | 1h |
| 10 | Testing E2E con Demo Bot verified (+50433899824) + numero personal Diego | manual QA | 3-4h |

### Verificacion previa (NO codigo, hacer antes de arrancar)

- Confirmar Tech Provider status: ya confirmado ✅
- Suscribirse a webhooks `smb_message_echoes` + `smb_app_state_sync` en Meta App Dashboard: ya hecho ✅
- WhatsApp Business App del cliente requiere version 2.24.17+ (validar antes de cada onboarding)

### Que NO se hace en este sprint

- ❌ Tocar los 3 clientes actuales (Yeni Ramos, David Diaz/Ecoclinicas, Paredes/Medilaser). Ya estan en modo migracion destructivo. Gemini confirmo que NO hay downgrade path sin downtime. Se dejan churnear organicamente. Silencio total — no comunicacion proactiva del cambio.
- ❌ Construir paridad de features con WhatsApp Business App (reenviar archivo, etiquetas, mensajes fijados, etc.). Coexistence preserva la app movil del cliente — esas features siguen vivas en su celular. No necesitamos replicarlas.
- ❌ Crear config_id nuevo en Meta App. El config_id existente soporta ambos modos (migracion + coexistence). El switch se hace via parametros del FB.login.

### Sintaxis FB.login Coexistence — VERIFICADA con doc oficial Meta 1 Jun

Verificacion realizada 1 Jun 2026 contra 3 fuentes independientes:
1. **Doc oficial Meta:** `https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/` (pagina titulada "Onboarding WhatsApp Business app users (aka 'Coexistence')")
2. **Repo GitHub publico:** `github.com/iragazzisrl/whatsapp-api-cloud-coexistence`
3. **WebSearch resultados convergentes** (Alibaba Cloud, Teknasyon Engineering)

**Sintaxis EXACTA confirmada para `MetaEmbeddedSignup.tsx:202-209`:**

```javascript
FB.login(fbLoginCallback, {
  config_id: META_CONFIG_ID,
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: 'whatsapp_business_app_onboarding',
    sessionInfoVersion: '3'
  }
});
```

**Cambios respecto al codigo actual:**
- AGREGAR `setup: {}` (objeto vacio funciona — si en el futuro asociamos Solution ID de Tech Provider, va como `setup: { solutionID: '<ID>' }`)
- AGREGAR `featureType: 'whatsapp_business_app_onboarding'`
- CAMBIAR `sessionInfoVersion: 2` (numero) → `sessionInfoVersion: '3'` (STRING)

**Notas de la verificacion:**
- `featureType: 'only_waba_sharing'` existe como otro flavor (skipea pasos del Embedded Signup, NO es Coexistence). No usar para nuestro caso.
- No hay menciones de `POST /register` en flujo Coexistence. Confirmado que se omite.
- Gemini acerto en todos los detalles tecnicos.

### Hallazgos tecnicos clave (validados con Gemini 1 Jun)

1. **Inyeccion del historial post-QR-scan:** 5-15 minutos de flood intenso. Cliente decide al escanear si comparte historial.
2. **No hay flag `is_historical: true` en payload.** Filtrar por timestamp Unix Epoch comparado vs `Date.now() - 5min`.
3. **Multimedia historica:** Meta solo sincroniza archivos < 14 dias. Audios mas viejos no llegan al webhook, ahorrando costo Whisper. Pero los de los ultimos 14 dias SI vienen con `audio.id` valido — filtrar explicitamente o Whisper transcribira 14 dias de notas de voz inutilmente.
4. **No hay evento `history_sync_completed`.** Debounce: actualizar `last_historical_webhook_at` con cada mensaje historico recibido. Worker secundario revisa: si pasaron 5 min sin updates, asumir sync terminado y marcar `sync_in_progress=false`.
5. **Idempotencia ya existe:** `meta-webhook/index.ts:318-327` skipea por `provider_message_id`. Si Meta reinyecta el mismo mensaje, no duplica. Eso ya esta resuelto.
6. **Sintaxis exacta del FB.login para Coexistence:**

```typescript
window.FB.login(callback, {
  config_id: META_CONFIG_ID,
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    featureType: 'whatsapp_business_app_onboarding',
    sessionInfoVersion: '3',
    setup: {}
  }
});
```

### Plan de pruebas antes de cliente real

1. **OrionCare Demo Bot verified (+50433899824)** y un numero personal de Diego (con WhatsApp Business App instalada) como contraparte
2. Ejecutar el flujo Coexistence completo — QR scan, vinculacion, recibir mensajes en ambos lados, ver `smb_message_echoes` cuando Diego envie desde su celular
3. Verificar que `isHistoricalMessage` filtra correctamente sin perder mensajes nuevos
4. Verificar debounce: el `sync_in_progress` se apaga correctamente a los 5 min de inactividad

### Bloqueador resuelto (que pense que era bloqueador)

Embedded Signup ya esta 100% implementado (build `meta-embedded-signup@2026-02-25_v16`, 15 iteraciones de produccion). Solo falta el switch del flavor. **NO hay que construir Embedded Signup desde cero** — eso me confundi al principio del analisis.

---

## Fase actual (post-Sprint Coexistence)

**Sprints 4-8 MVP Centro de Atencion** — Sprint 6 cerrado el 20 May (5 semanas antes del plan original 30 Jun). Skin Medic perdido 27 May. Sprint Coexistence resuelve el dealbreaker. Los 3 clientes activos (Guevara, Yeni, David) + Medilaser desconectado quedan como estan — churn organico esperado.

Plan: `.claude/plans/centro-atencion-mvp.md` + `.claude/plans/centro-atencion-sprints.md`

## Sprints MVP — estado

| Sprint | Estado | Highlights |
|---|---|---|
| 0 — Schema | ✅ 18 May | 4 tablas + bucket Storage + RLS + 17 service_types migrados |
| 1 — Persistencia + bot dual mode | ✅ 18 May | 5 functions deployadas, conversation tracking |
| 2 — Multimedia + transcripcion | ✅ 18 May | Whisper español, audios ~3s, $0.002 total |
| 3 — Frontend Inbox | ✅ 18 May 23:30 | InboxContext realtime una-fuente-verdad. Bug fix VOLATILE RLS |
| 4 — Quick replies + multimedia outbound | ✅ 19 May | Pagina settings + picker composer + upload archivos |
| 5 — Promociones del mes | ✅ 19 May | Panel admin + bot scoring/keywords + FAQ override + destacada + matcheo natural. Magic bytes validation. |
| **6 — Calling API** | ✅ 20 May | Schema calls + 5 edge functions + webhook handler + softphone WebRTC inbound/outbound validados en vivo. UI historial timeline. Permission flow. Refactor CallContext unificado. EventBus en InboxContext. |
| 7-8 — Pilot + lanzamiento | en curso | Lun 25 May: Torre Zafiro inbox-only, bot OFF, calling OFF |

## Arquitectura clave (Sprint 3 + 4 + 5, vigente)

### Realtime inbox (Sprint 3)
- `App.tsx` monta `<InboxProvider>` dentro de `UserProvider`
- `InboxProvider` (src/context/InboxContext.tsx):
  - llama `useConversations(orgId)` → state local
  - llama `useRealtimeInbox(orgId, callbacks)` → un solo channel `clinic:{orgId}`
  - expone: conversations, unreadCount (derivado), refetch
- `MainLayout` consume `useInbox().unreadCount` para el badge
- `Inbox.tsx` consume `useInbox()` para la lista
- `ConversationDetail.tsx` mantiene su propio `useConversationMessages(convId)` para timeline

Para optimizar redes lentas (reconnect, debounce, batching) — un solo lugar a tocar: `InboxProvider`.

### Quick replies + composer (Sprint 4)
- `src/lib/quickRepliesApi.ts` — CRUD tipado supabase-js directo. RLS cubre seguridad.
- `src/hooks/useQuickReplies.ts` — patron useConversations. `{ onlyActive }` opcional.
- `src/pages/QuickRepliesPage.tsx` — ruta `/configuracion/quick-replies`, roles `admin/doctor/secretary`.
- `src/components/inbox/QuickReplyPicker.tsx` — popover con Command (cmdk), buscador + grupos por categoria.
- `src/components/inbox/MessageComposer.tsx` extendido — recibe `organizationId` prop (de `ConversationDetail` via `useCurrentUser`).

### Multimedia outbound (Sprint 4)
- `src/lib/conversationMediaUpload.ts` — `uploadConversationMedia({ orgId, conversationId, file })` valida tamaño 25MB + MIME whitelist, sube a bucket `conversation-media` con path `{org}/{conv}/outbound-{uuid}.{ext}`. Retorna `{ path, mime, kind }`.
- `MessageComposer` integra: 3 inputs file hidden (image/pdf/audio) disparados desde el dropdown Paperclip. Handler `handleFileSelected` hace upload + `sendMessage`.
- Caso audio + caption: Meta no acepta caption en audio → enviar 2 mensajes consecutivos (audio primero, texto despues).
- `inbox-send` valida `mediaUrl.startsWith(${organization_id}/)` (linea 137) — el path `outbound-{uuid}` cumple.

### Promociones del mes (Sprint 5 + 5.1)

**Tabla `promotions`** (Sprint 0 base + 5.1 columnas):
- Base: title, description, conditions, image_url, keywords[], valid_from/to, status (draft/active/expired/archived), service_type_id
- Sprint 5.1: `is_featured BOOLEAN` (unique partial idx: 1 featured por org activa) + `related_faq_ids UUID[]`

**Frontend admin (Sprint 5):**
- `src/lib/promotionsApi.ts` — CRUD tipado, computeInitialStatus, archive/reactivate/duplicate helpers.
- `src/hooks/usePromotions.ts` — con filtro por estado. `usePromotionsExpiringSoon.ts` para badge.
- `src/pages/PromotionsPage.tsx` — lista con tabs + banner expiring + FAB mobile.
- `src/pages/PromotionFormPage.tsx` — form en pagina completa con 2 cols (data izq, imagen+preview WhatsApp der). Sprint 5.1: toggle "Destacada del mes" + multi-select FAQs vinculadas.
- `src/components/promotions/PromoCard.tsx` — card con imagen + badge estado + ⭐ destacada + acciones.
- `src/components/promotions/WhatsAppPreview.tsx` — preview chat estilo WhatsApp.
- `src/lib/promoImageUpload.ts` — solo JPG/PNG (WebP rompe Meta async, ver bugs resueltos).
- Bucket `promo-images` con RLS por org (Sprint 5.1: solo JPG/PNG en allowed_mime_types).

**Bot integration (Sprint 5 + 5.1):**
- `honduras-intents.ts` extendido con intent `promo_search` + 21 keywords.
- `bot-handler/index.ts`:
  - Estado `promo_browse` para menu comprimido cuando hay N promos
  - `handlePromoSearch`: matching escalonado (Sprint 5.1) — `scorePromo` rankea por title (3pts/palabra), keywords (2pts), service_type name (2pts), description (0.5pts). `isGenericPromoQuery` detecta "promociones?" generico vs especifico ("promo de botox").
  - `handlePromoBrowse`: matcheo natural (Sprint 5.1) — paciente puede escribir texto natural en lugar de numero. Reusa `scorePromo`. Pivot a otros flows (reschedule/handoff) sin quedar atrapado.
  - `sendPromoMultimedia`: descarga del bucket `promo-images` (NO conversation-media), upload Meta, mensaje image+caption. **Magic bytes validation (Sprint 5.1):** detecta MIME real (`detectMimeFromMagicBytes`) ignorando Content-Type del Storage; rechaza si no es JPG/PNG real → fallback texto.
  - `findPromoOverridingFAQ` (Sprint 5.1) en `handleFAQSearch`: si la FAQ esta en `related_faq_ids` de una promo activa, override de la respuesta con la promo.
  - `getFeaturedPromoCloser` (Sprint 5.1): mencion sutil de la destacada al cierre de FAQ no override + booking exitoso.
- Menu principal opcion 5 "Ver promociones del mes" + detectIntent en pre-check.

**Cron lifecycle:**
- Edge function `mark-promotions-expired` (auth Bearer anon o service_role o internal-secret).
- 3 transiciones diarias: active→expired (valid_to<today), draft→active (valid_from<=today<=valid_to), draft→expired (valid_to<today).
- pg_cron job `mark-promotions-lifecycle-daily` corre `0 12 * * *` UTC (6am Honduras).

**Sidebar badge:** item "Promociones" en MainLayout con contador rojo de promos expirando en 3 dias (usa `usePromotionsExpiringSoon`).

## Reglas criticas aprendidas

### Sprint 3 — Realtime + VOLATILE
**Supabase Realtime + funciones VOLATILE en RLS = silencio.** Cuando llega evento Realtime, Supabase evalua el OR de TODAS las policies SELECT. Si CUALQUIERA usa funcion VOLATILE, evaluacion falla silenciosamente y evento se descarta.

**Verificar siempre** que las funciones usadas en RLS policies de tablas con Realtime habilitado sean STABLE o IMMUTABLE.

Fix aplicado: `ALTER FUNCTION current_doctor_id() STABLE` (migration `20260518200001_*`).

### Sprint 5.1 — Meta error 131053 async + magic bytes
**Meta WhatsApp Cloud API valida media de forma ASINCRONA.** El POST a `/messages` con `image` + `mediaId` retorna 200 con `wamid` (queued) aunque el archivo no sea compatible. El error 131053 "Media upload error" llega DESPUES via webhook callback. El bot no puede detectarlo sincronicamente.

**Solucion preventiva:** validar magic bytes del archivo ANTES de subir a Meta. `detectMimeFromMagicBytes` lee primeros bytes y determina MIME real (JPEG/PNG/WebP/GIF) ignorando Content-Type declarado. Si MIME real != image/jpeg && image/png → fallback a texto.

Meta WhatsApp NO acepta WebP en mensajes `image` (solo en `sticker`). Para outbound multimedia: bucket `promo-images` con allowed_mime_types restringido a JPG/PNG + magic bytes check en bot-handler como defensa en profundidad.

### Sprint 6 — Calling API (20 May)

**Activacion via Graph API, NO via Meta Business Manager UI.** El toggle "Permitir llamadas" en WhatsApp Manager solo funciona si previamente la app esta suscrita al webhook field `calls`. Para activarlo programaticamente:
- `POST /{phone_number_id}/settings` con `{"calling":{"status":"ENABLED"}}`
- Edge function reusable: `meta-enable-calling` (recibe `lineId`, lee creds de `whatsapp_lines`, hace POST + verifica suscripcion).

**Estructura webhook calls** (capturada via sniffer temporal en `_debug_calls_payloads`):
- INSERT en `value.calls[]` con `field='calls'`. Distinto de `value.messages[]`.
- Eventos: `connect` (con `session.sdp` + `sdp_type='offer'`), `terminate` (con `errors[]` si hubo problema).
- `direction`: `USER_INITIATED` (inbound, paciente llama) o `BUSINESS_INITIATED` (outbound, asistente llama).
- Para BUSINESS_INITIATED: `call.from = business`, `call.to = paciente` (al reves que inbound). Mi handleConnect tuvo que distinguir.
- `call_permission_reply` NO viene en `value.calls[]` — viene como mensaje interactive en `value.messages[]`. Estructura: `{ type: 'interactive', interactive: { type: 'call_permission_reply', call_permission_reply: { response: 'accept', is_permanent: true } } }`. Hay que detectarlo en `handleIncomingMessage` antes del flujo bot.

**SDP exchange:**
- Vanilla ICE (Meta envia todos los candidates en el SDP inicial, no trickle).
- Codec OPUS @ 48kHz.
- Inbound flow: webhook connect trae SDP offer → browser arma answer + ICE gathering → POST `/calls action=pre_accept` + `action=accept` (orden critico, accept antes que pre_accept falla).
- Outbound flow: browser arma offer + ICE → POST `/calls action=connect` con offer → Meta envia webhook connect con SDP answer cuando el paciente recibe la notificacion (no cuando atiende). El audio fluye recien cuando paciente atiende = detectar via `pc.getStats().bytesReceived` > threshold.

**call_status semantica:**
- `ringing` = en marcha, esperando atender (inbound) o esperando answer (outbound).
- `accepted` = paciente atendio o asistente apreto atender. handleConnect outbound setea esto al recibir webhook.
- `connected` = WebRTC handshake terminado, audio fluyendo.
- `ended` = terminate normal con duration > 0.
- `missed` = terminate antes de cualquier handshake (call_status era ringing).
- `rejected` = asistente apreto rechazar (inbound) o paciente rechazo (outbound).
- `failed` = error de Meta o WebRTC.

**Limites Meta produccion:** 1 call_permission_request/dia por user, 5 calls/dia por user, permission dura 7 dias o `is_permanent=true` (sin expiry).

### Patron EventBus para single source of truth en Realtime (20 May refactor)

**Problema:** dos providers (`InboxContext`, `CallContext`) escuchaban la misma tabla `message_logs` en canales Realtime separados (`clinic:{orgId}` + `calls:{orgId}`). Duplicacion.

**Solucion:** `InboxContext` expone `subscribeToMessageLog(handler) → unsubscribe`. Internamente mantiene un `Set<handler>` en `useRef`. Cuando `useRealtimeInbox` emite INSERT/UPDATE de `message_logs`, primero hace su trabajo (`applyMessageToConversation`, `playNotificationBeep`) y luego despacha a todos los handlers externos.

`CallContext` consume `useInbox().subscribeToMessageLog()` en lugar de tener su propio listener para `message_logs`. Su channel propio (`call-perms:{orgId}`) queda solo para `call_permissions`.

**Net:** 1 listener sobre `message_logs` para toda la app. Patron replicable para otras tablas con multiples consumers.

### Optimistic UI encapsulado en hook (20 May refactor)

**Antes:** `MessageComposer` construia el `temp-${uuid}`, conocia el shape de `MessageRow`, disparaba `addOptimisticMessage` + POST + `updateOptimisticMessage`. Logica de dominio en componente UI.

**Despues:** `useConversationMessages.sendOptimisticText({ body, userId, patientPhoneTo })` encapsula todo. Composer solo llama el metodo, no sabe nada del flow temp→real. Dedupe del INSERT real con el optimistic por body matching vive en el listener Realtime del hook (no en helper huerfano).

## Bugs activos (no resueltos)

### Criticidad alta — bombas de tiempo
- [x] ~~**Inbox no recibe mensajes con bot OFF**~~ — ✅ **Resuelto 26 May.** `meta-webhook` L345 condicionaba toda la creacion de conversaciones + persistencia de mensajes dentro de `if (botEnabled)`. Mensajes iban al path legacy sin `conversation_id`. Fix: desacoplar gate (siempre crear conv cuando hay lineId+orgId), condicionar solo invocacion del bot. Tambien: `process-media-async` ahora verifica `bot_enabled` antes de invocar bot para audio transcrito; `getOrCreateConversation` acepta `initialStatus` (conv nuevas con bot OFF inician `human_active`); `inbox-return-bot` valida `bot_enabled` antes de devolver al bot; `inbox-send` asigna `assigned_to` en primera respuesta de conv sin asignar; frontend oculta "Devolver al bot" cuando `bot_enabled=false`. 4 edge functions deployadas + frontend.
- [x] ~~**`appointment_at` desfasada 6h (Honduras UTC-6)**~~ — ✅ **Resuelto 20 May AM.** `create-appointment:217` y `update-appointment:151` ahora construyen ISO con offset `-06:00` explicito. Migracion `20260520120000_fix_appointment_at_timezone_backfill.sql` corrigio 616 filas historicas (1 ya correcta no se toco). Verificado: 617/617 ok, ejemplo cita 9:30 HN guarda 15:30 UTC.
- [x] ~~**`confirmation_message_sent` nunca se marca true**~~ — ✅ **Resuelto 20 May PM.** UPDATE sincrono post-envio agregado en `create-appointment/index.ts` dentro del `if (gatewayResult.success)` (patron de `send-reminders:259-265`: log si falla, no rompe response). Bug era 100% pasivo (nadie leia la columna), pero el dato ahora refleja la realidad.
- [x] ~~**Cita huerfana sin `appointment_at`**~~ — ✅ **Resuelto 20 May PM.** `bot-handler` linea 2671 (funcion `createAppointment` de `processBookingConfirm`) omitia `appointment_at` en el INSERT. 144 filas huerfanas confirmadas en produccion (desde 17 Feb), todas con notes "Agendada/Reagendada via WhatsApp Bot". Fix: agregar `appointment_at` al payload + normalizar `selectedTime` (HH:mm → HH:mm:ss). Migracion `20260520140000_appointments_appointment_at_backfill_and_not_null.sql` backfilleo las 144 + `ALTER COLUMN ... SET NOT NULL`. Verificado: 0 huerfanas, 761/761 alineadas con `(date+time)-06:00`. Defensa profunda: cualquier INSERT futuro que omita la columna fallara con 23502.

### Criticidad media
- [ ] **Estado `reagendar` huerfano en DB** — no esta en types pero existe en tabla. Decidir: agregar al type o normalizar.
- [ ] **Paciente +50433899824 en booking_select_hour hace 1 semana** — verificar timeout de sesiones.
- [ ] **SuperAdminRoute requiere DOS filas (public.users + user_roles)** — Bug descubierto 23 May al crear `admin@orioncare.app`. `SuperAdminRoute.tsx` usa `useCurrentUser().user` que viene de `getCurrentUserWithRole()` (api.supabase.ts:917-920). Si el user NO esta en `public.users`, retorna null sin siquiera mirar el fallback de `user_roles` (linea 920 corta antes). Resultado: SuperAdminRoute queda en "Cargando..." infinito porque la RPC `is_superadmin` solo se llama si hay `user`. **Workaround aplicado para admin@orioncare.app:** INSERT en `public.users` (id, email) + INSERT en `user_roles` (user_id, role='admin') + INSERT en `superadmin_whitelist`. Las 3 son necesarias. **Fix correcto:** SuperAdminRoute deberia usar `supabase.auth.getUser()` directo, sin depender de UserContext. Cambio chico (~10 lineas) pero diferido post-Skin Medic. **Para crear nuevos super-admins** seguir el mismo protocolo de 3 inserts hasta que el bug se arregle.

### Criticidad baja — deuda + adopcion
- [ ] **Estados `completada`/`no_asistio` sin uso real** — problema de ADOPCION, no automatizacion. UI existe, backend no transiciona. **Regla Diego:** NO cron de inferencia ([[no-data-inferida]]). Educacion + UX.
- [ ] **`reminder_morning_sent` columnas huerfanas** — existen en tabla, 0 codigo las usa. Decidir: implementar o migration eliminar.
- [ ] **Dual Supabase client** — `src/lib/supabaseClient.ts` (minimal) vs `src/integrations/supabase/client.ts` (full). Unificar Junio 2026.

## Backlog priorizado

### Seguridad (proxima sesion dev)
- [ ] Vista `bot_analytics_summary`: SECURITY DEFINER → INVOKER
- [ ] 10 funciones sin `search_path` fijo: agregar `SET search_path = ''`
- [ ] Habilitar leaked password protection en Supabase Auth settings
- [ ] 4 tablas sin RLS policies: documentar (son service_role only)

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json
- [ ] Limpiar promos duplicadas en Demo Bot tras QA Sprint 5 (2 "Botox primera consulta -15%" y -45%)
- [ ] Documentar para asistentes: agregar keywords al crear promo (incluir sinonimos por especialidad) → mejor matcheo del bot

### Soporte numeros internacionales (Junio+)
- [ ] `normalizeToLocalHN()` en whatsapp-inbound-webhook — deja de asumir 8 digitos HN
- [ ] `findPatientByPhone()` en bot-handler — deja de forzar +504
- [ ] UI ingreso pacientes — validacion numeros extranjeros
- Caso: Mirian Yanira Zelaya Carias (+14794030090, USA) — recibe recordatorios OK, bot no funciona. No urgente.

### Polish UX
- [ ] **PWA instalable (agregado 11 Jul, pedido por Diego):** `vite-plugin-pwa` + manifest (`display: standalone`, íconos, theme color) + service worker básico. Estimado ~2-4h. Efecto: ícono "OrionCare" en el teléfono de secretarias/doctores que abre el inbox fullscreen como app nativa (Android ofrece instalar solo/WebAPK; iOS manual vía Compartir→Agregar a inicio — en instalación presencial Diego hace los toques). Bonus ventas: "le instalo la app aquí mismo" en la demo. Cabe en el freeze (polish, no feature).

### Diferido Junio 2026+
- FAQ auto-poblado (3 capas: onboarding data + templates por especialidad + deteccion gaps)
- Flujo "DEMO" en el bot (cuando reciba "DEMO" dar contexto guiado)
- Sinonimos universales para promos (embeddings/LLM) — actualmente la asistente debe agregar variantes manualmente. Aceptable para arranque.

### Storage media retention — implementar ~Jul 2026 (cuando lleguemos a 5-10 clientes)

Sprint 4 abre la puerta a que el bucket `conversation-media` crezca sin freno. Sprint 5 agrega `promo-images` pero crece mas lento (1-3 archivos por promo, promos rotan ~mensual).

**Plan a implementar (1 sesion de ~3h cuando llegue el momento):**

1. **Cron diario: retencion 90 dias para multimedia outbound + inbound.**
   - Query `message_logs` WHERE `media_url IS NOT NULL AND created_at < NOW() - INTERVAL '90 days'`
   - Borrar archivo del bucket `conversation-media`
   - NULLear `media_url` en la row (preservar el `body` o `transcription` como rastro)
   - Edge function nueva: `cleanup-old-media`, scheduled via pg_cron

2. **Borrar audios inbound post-transcripcion a los 7 dias.**
   - Sprint 2 ya transcribe audios con Whisper a `message_logs.transcription`
   - A los 7 dias, borrar el audio del bucket (la transcripcion queda)

3. **Cron semanal: cleanup huerfanos.**
   - Listar archivos en `conversation-media` + `promo-images` que no tengan match en columna correspondiente
   - Borrarlos

**Trigger:** cuando MRR > $300 o tengamos >5 clientes pagos usando inbox activamente.

## Pendiente operativo

- [ ] **QA handoff notification:** probar con Demo Bot (+50493133496) que doctor/secretaria recibe WhatsApp con datos del paciente
- [ ] Dra. Yeni Ramos no tiene phone en `doctors` — agregar si cambian handoff a doctor
- [ ] Verificar webhook: WABA 1491078449281051 debe apuntar a whatsapp-inbound-webhook
- [ ] Borrar templates rotos de Meta (5 con sufijo `_040326_114943`) — requiere Business Admin

## Notas tecnicas

- **Stack:** React 18 + TS + Vite + Supabase + Edge Functions (Deno) + **Meta Cloud API directo** (NO BSPs).
- **Supabase project ref:** `soxrlxvivuplezssgssq` (config.toml)
- **Deploy CLI:** `npx supabase functions deploy <name> --project-ref soxrlxvivuplezssgssq --no-verify-jwt`
- **Org de prueba:** c8b1c83b (OrionCare). NO usar WABA legacy de OrionCare (1292296356040815).
- **Templates via curl en Windows:** los emojis/acentos se corrompen. Usar Unicode escapes (\uXXXX) o reusar legacy.
- **Landing CTAs:** apuntan a `wa.me/+50433899824`
- **Onboarding wizard:** existe pero requiere activacion SuperAdmin (intencional).
- **Cron jobs activos:** send-reminders (11am+7pm), send-reminder-followup (7:15pm), auto-cancel-unconfirmed (7am), mark-promotions-lifecycle-daily (6am Honduras = 12 UTC).

## Proximos pasos (alineado con estado-estrategia)

| Dia | Trabajo |
|---|---|
| Mar 19 | ✅ Sprint 4 + Sprint 5 + Sprint 5.1 cerrados |
| Mie 20 | ✅ 3 bombas appointments + Sprint 6 Calling API completo (5 semanas antes del plan) + refactor CallContext + ~12 fixes UX |
| Dom 25 | ✅ Instalacion Skin Medic — inbox-only, bot ON, Dulce operando |
| **Lun 26 AM** | ✅ **Bug fix critico:** inbox no recibia mensajes con bot OFF. Desacoplado gate en meta-webhook + UX fixes (6 archivos, 4 deploys). |
| **Lun 26 PM** | ✅ **Parser wa.me:** Dulce pega link del sistema anterior → auto-extrae fecha/hora/template. Nombre paciente ahora opcional (fallback "Estimado paciente"). Default doctor → "Skin Medic". |
| 26 May - 1 Jun | Bug fixes de lo que Dulce encuentre. Cuando Dulce domine inbox → activar bot. Calling se activa despues. |

## Feature wa.me parser + iniciar conversacion (25-26 May)

### Flujo
Dulce pega un link `wa.me` o `api.whatsapp.com/send` del sistema anterior de Skin Medic en el buscador del inbox. El parser extrae telefono, fecha, hora y tipo de template automaticamente. Dulce solo llena nombre (opcional) y envia. Si no pone nombre, el mensaje dice "Estimado paciente".

### Formato del link externo (sistema anterior Skin Medic)
```
https://api.whatsapp.com/send?phone=+504XXXXXXXX&text=Estimado%20paciente,...programó%20una%20cita...horario:%20*DD-MM-YYYY%20HH:MM%20AM/PM*,%20en:%20*Skin%20Medic*...
```
Parser extrae: fecha DD-MM-YYYY → "martes 26 de mayo", hora "06:15 PM", template tipo (hoy→reminder_3d, mañana→reminder_24h, otro→confirmation).

### Archivos creados
- `src/lib/waLinkParser.ts` — `parseWaLink()`, `parseAppointmentText()`, `detectPhoneNumber()`, `detectInputType()`. Soporta `wa.me` y `api.whatsapp.com/send`.
- `src/components/inbox/NewConversationCard.tsx` — card verde con campos editables (nombre opcional, doctor default "Skin Medic", fecha, hora, template type). Crea conversacion via RPC + envia template via `messaging-gateway`.
- `src/lib/inboxActions.ts` — `initiateConversation()` (RPC wrapper) + `sendTemplateMessage()` (edge function wrapper) + `templateBodyText()` (3 templates: confirmation, reminder_24h, reminder_3d).
- `supabase/migrations/20260525120000_add_initiate_conversation_rpc.sql` — RPC `initiate_conversation`: valida org membership, normaliza telefono, upsert conversation, opcionalmente crea paciente.

### Archivos modificados
- `src/components/inbox/InboxList.tsx` — integra `detectInputType()` en buscador, muestra `NewConversationCard` cuando detecta link/telefono.
- `src/components/inbox/ConversationDetail.tsx` — recibe conversacion seleccionada desde card.
- `src/hooks/useConversations.ts` — expone `upsertConversation()` para placeholder optimistic.

### Decisiones
- **Nombre opcional:** no se crea paciente en `patients` si no hay nombre. RPC maneja `p_patient_name = NULL` (skip find_or_create_patient).
- **`parseAppointmentText` stub → implementado 26 May PM** con regex para el formato especifico de Skin Medic.
- **Default doctor "Skin Medic"** (no "Dra. Mendoza") — ajustado 26 May PM.

## Sprint 6 — Archivos creados/modificados (20 May)

### Migraciones nuevas
- `20260520120000_fix_appointment_at_timezone_backfill.sql` — 616 filas backfilled offset -06:00
- `20260520140000_appointments_appointment_at_backfill_and_not_null.sql` — 144 huerfanas backfill + NOT NULL constraint
- `20260520160000_centro_atencion_10_calls.sql` — message_logs +call_id_meta/status/started_at/ended_at + tabla `call_permissions` + RLS org-scoped + realtime habilitado

### Edge functions nuevas
- `supabase/functions/meta-enable-calling/index.ts` — activa Calling via Graph API. Reusable en onboarding.
- `supabase/functions/inbox-request-call-permission/index.ts` — envia mensaje interactive type=call_permission_request
- `supabase/functions/inbox-accept-call/index.ts` — POST /calls action=pre_accept + accept con SDP answer (inbound)
- `supabase/functions/inbox-call-patient/index.ts` — POST /calls action=connect con SDP offer (outbound)
- `supabase/functions/inbox-terminate-call/index.ts` — POST /calls action=terminate/reject

### Edge functions modificadas
- `supabase/functions/_shared/calls.ts` — NUEVO. processCallEvent dispatcher (connect/terminate/permission_update) + waIdToE164 + handlers especializados.
- `supabase/functions/meta-webhook/index.ts` — extiende MetaChangeValue con calls[]; dispatcha a processCallEvent; agrega handleCallPermissionReply para interactive message.
- `supabase/functions/bot-handler/index.ts` — INSERT con appointment_at + normalizar HH:mm → HH:mm:ss
- `supabase/functions/create-appointment/index.ts` — offset -06:00 + UPDATE confirmation_message_sent post-envio
- `supabase/functions/update-appointment/index.ts` — offset -06:00

### Frontend nuevo
- `src/context/CallContext.tsx` — provider unico para llamadas (single source of truth). callQueue + callPhase + permissions + WebRTC peer + audio refs + actions + listener via InboxContext subscribe.
- `src/components/calls/IncomingCallOverlay.tsx` — overlay flotante que consume CallContext. Ringtone WebAudio dual-tone 440+480Hz.
- `src/components/calls/CallPatientButton.tsx` — boton Llamar/Solicitar permiso en ConversationDetail header.

### Frontend modificado
- `src/context/InboxContext.tsx` — agrega `subscribeToMessageLog(handler)` EventBus.
- `src/components/inbox/MessageBubble.tsx` — voice_call card con icono direccional + status + duracion + badge "⚠ Fallido" para mensajes con status=failed.
- `src/components/inbox/ConversationListItem.tsx` — preview voice_call distingue perdida/atendida/saliente.
- `src/components/inbox/MessageComposer.tsx` — usa sendOptimisticText del hook. Sin logica optimistic local.
- `src/components/inbox/ConversationDetail.tsx` — boton CallPatientButton en header. No refetch en onSent (evita flicker).
- `src/hooks/useConversationMessages.ts` — sendOptimisticText encapsulado. Dedupe por body matching en listener INLINE (no en helper). Auto-mark-read en mensaje inbound.
- `src/hooks/useConversations.ts` — last_message embed incluye call_status + call_direction.
- `src/App.tsx` — monta `<CallProvider>` dentro de `<InboxProvider>` + `<IncomingCallOverlay />` global.

### Archivos eliminados (en el refactor)
- `src/context/IncomingCallContext.tsx` — absorbido en CallContext
- `src/hooks/useWebRTCCall.ts` — WebRTC vive ahora en el provider

### Bugs UX cazados y resueltos en walkthroughs
1. Re-mount overlay por callIdMeta entre llamadas consecutivas.
2. Hangup optimista (no espera Meta).
3. Multi-llamadas: queue en vez de sobreescribir, con indicador "+N en espera".
4. Race outbound: AbortController si user cuelga durante setup.
5. Auto-mark-read en conv abierta con mensaje inbound.
6. Outbound "connected" solo cuando hay audio real (pc.getStats bytesReceived > 2KB).
7. Ringtone telefonico realista (440+480Hz, 2s/4s patron, ADSR, lowpass).
8. Ringback durante connecting (no solo dialing-outbound).
9. Toast llamada en espera position top-right (no chocar con overlay bottom-right).
10. No refetch en onSent (evita flicker).
11. Dedupe optimistic por body matching en listener INLINE (no helper huerfano).

## Sprint 5 — Archivos modificados/creados (19 May)

### Nuevos
- `supabase/migrations/20260519193931_centro_atencion_08_promo_images_bucket.sql` — bucket + RLS (idempotente con DROP IF EXISTS)
- `supabase/migrations/20260519194500_promotions_lifecycle_cron.sql` — pg_cron job diario
- `supabase/migrations/20260519210000_promotions_featured_and_linked_faqs.sql` — columnas Sprint 5.1
- `supabase/functions/mark-promotions-expired/index.ts` — edge function cron
- `src/lib/promotionsApi.ts`, `src/lib/promoImageUpload.ts`
- `src/hooks/usePromotions.ts`, `src/hooks/usePromotionsExpiringSoon.ts`
- `src/pages/PromotionsPage.tsx`, `src/pages/PromotionFormPage.tsx`
- `src/components/promotions/PromoCard.tsx`, `src/components/promotions/WhatsAppPreview.tsx`

### Modificados
- `src/App.tsx` — 3 rutas nuevas
- `src/components/MainLayout.tsx` — item sidebar "Promociones" con badge
- `src/pages/ConfiguracionMedico.tsx` — entry "Promociones del mes"
- `src/integrations/supabase/types.ts` — columnas is_featured + related_faq_ids
- `supabase/functions/bot-handler/index.ts` — estado `promo_browse`, handlePromoSearch + scoring + matcheo natural, handlePromoBrowse, sendPromoMultimedia + magic bytes, findPromoOverridingFAQ, getFeaturedPromoCloser, opcion 5 menu
- `supabase/functions/_shared/honduras-intents.ts` — intent promo_search
- `supabase/functions/_shared/bot-messages.ts` — OPT_EMOJI.promociones = ✨
- `supabase/functions/_shared/meta-media.ts` — downloadFromStorage acepta bucket opcional

### Plan referenciado
- `.claude/plans/las-palomitas-ya-est-n-squishy-steele.md` (Sprint 4 + 5 detalle)

### QA Sprint 5 — aprobado por Diego 19 May PM
- 6 promos creadas durante QA, lifecycle (draft→active→expired) verificado
- Cron `mark-promotions-lifecycle-daily` activo
- Matcheo natural validado con "Quiero ver el botox", "La primera", "Quiero saber del facial"
- Pivot a booking flow funciono ("Quiero agendar cita" desde menu)
- FAQ override funciono cuando FAQ correspondiente esta vinculada (probar mas FAQs)
- Magic bytes fallback al texto cuando imagen no es JPG real
- 2 bugs criticos durante QA — todos fixeados (filtro estricto + body.ok + magic bytes)
