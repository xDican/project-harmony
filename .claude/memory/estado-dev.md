# Estado Desarrollo — OrionCare

> Ultima actualizacion: 3 Jun 2026 (PRIORIDAD #1 = Motor de Agendamiento Multi-Recurso. **FASES 0-6 ENTREGADAS — MOTOR COMPLETO.** Fase 6 (bot service-first + combinada + auto-asignacion) **E2E NUCLEO QA-APROBADO 3 Jun** con 2 citas reales (misma hora, profesionales distintos auto-asignados, verificado en DB). Solo falta confirmacion visual de 2 add-ons de bajo riesgo (consulta-previa + precio) y los fast-follows diferidos (reagendar-visita-en-bloque, RescheduleModal service-aware). Ver seccion Fase 6 abajo + `.claude/plans/fase-6-bot-service-first.md`.** Fase 5 (secuenciador multi-procedimiento `visit_id`, RIESGO #1) construida y desplegada hoy: backend QA-aprobado (compuertas a-e PASS, transaccional auto-rollback en prod), UI entregada. **PENDIENTE: E2E manual de Diego logueado** (agendar una visita real desde `/agenda/nueva-cita` → toggle "Visita (varios)" → verificar inicios factibles, asignacion, N filas mismo visit_id, 1 WhatsApp, cancelar visita). Ese E2E tambien cubre la verificacion de la salida del greedy de get-visit-slots (no testeable sin login). **PROXIMA SESION: Fase 6 (bot service-first estructurado, el diferenciador) + fast-follow: reagendar-visita-en-bloque (hoy diferido a cancelar+reagendar).** Tambien pendiente: QA visual del relabel #24 de Fase 4. MCP Supabase disponible. Es el producto real, ver [[motor-agendamiento-es-producto]].)
> Historico sprints + bugs resueltos en `estado-dev-historial.md`
> Plan motor multi-recurso: `.claude/plans/motor-agendamiento-multirecurso.md`
> Plan Coexistence (entregado): `.claude/plans/trabajemos-en-el-coexistence-jaunty-toast.md`

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
- **NUEVO `src/components/WeekStrip.tsx`**: 14 días (2 sem, grilla 7), ‹ › navega por semana (no antes
  de hoy), días sin cupo/pasados tachados. Alimentado por `daysMap` del hook.
- Izq: Paciente (PatientSearch + card recordatorio) + Servicios (catálogo + lista ordenada ↑↓✕ con
  total, o selector de Duración en path duración, o DoctorSearch si `requiresDoctorSelection`).
- Der: WeekStrip + Horarios Mañana/Tarde (caja scroll, formato 12h).
- Footer: resumen fecha/hora + Total (servicios·L·duración) + `ProfesionalSummary` (badge ✨Auto en
  visit-engine + Popover "Ver detalle" con timeline + cambio por procedimiento vía `freeDoctorIds`) +
  botón Agendar (insert-split por `submit()`).
- `VisitBooking` ya NO se importa (quedó huérfano → se remueve en Fase 4). Auto-scroll eliminado.

**PROXIMA SESIÓN: tras OK visual de Diego → Fase 3 (no-scroll app-shell + mobile 1-col + estados/
validación fina) y Fase 4 (remover VisitBooking + verificar reagendar intacto + QA en vivo 3 paths).**

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
