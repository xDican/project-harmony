# Estado Desarrollo — OrionCare

> Ultima actualizacion: 17 Abr 2026 (optimizacion rendimiento mobile — 3 commits de JS/assets deployed + plan de 3 niveles para data layer)

## Fase actual

Feature freeze (Mar-May 2026). Solo bugs, seguridad y polish.

## Optimizacion rendimiento mobile (17 Abr 2026)

### COMPLETADO — Carga JS/assets
- Code splitting 31 paginas con React.lazy (1 MB monolito → chunks lazy)
- Vendor splitting: react, supabase, radix, query, recharts, dates
- modulePreload filtrado (vendor-radix/recharts/dates excluidos del preload)
- Lazy-load Toaster (Radix), TooltipProvider removido del root, MainLayout lazy
- Auth timeout 10s en UserContext (evita hang infinito)
- Spinner CSS inline en index.html
- Favicon 307 KB → 1.2 KB (logo OrionCare 32x32)
- Service Worker (vite-plugin-pwa, autoUpdate)
- Prefetch AgendaSemanal desde Login (1s despues del render)
- **Resultado:** login 30s→11s primera visita, <2s visitas recurrentes (3G)

### EN PROGRESO — Plan de optimizacion data layer (3 niveles)
**Plan detallado:** `.claude/plans/zesty-dazzling-kitten.md`

**Hallazgos criticos:**
- BUG SEGURIDAD: `getTodayAppointmentsByDoctor` no filtra por org_id
- Sin indices en appointments(date) ni appointments(doctor_id)
- 7 hooks de data manuales (useState/useEffect), React Query instalado pero sin usar
- 10-11 round trips a Supabase para cargar agenda semanal
- SELECT * en todas las queries (19 cols, se usan ~8)

**Nivel 1 (pre-martes 22 Abr):** Fix seguridad org_id, consolidar 7→1 query, eliminar waterfall, QueryClient defaults, doctor en localStorage, select columnas, RPC get_weekly_agenda
**Nivel 2 (post-martes):** Migrar hooks a React Query, persistencia IndexedDB, optimistic UI, skeletons con contexto, prefetch por intencion
**Nivel 3 (Junio):** Supabase Realtime, indices PostgreSQL, critical CSS, Brotli check, Edge Middleware, background sync offline

## 🚨 Prioridad proxima sesion — Bot Medilaser UX (descubierto 10 Abr)

**Reporte completo con los 20 flujos reales:** `docs/reporte-medilaser-10abr-bot-flows.md`

**Contexto rapido:** Los fixes de texto libre (25 Mar) funcionaron parcialmente (-58% errores/dia), pero el sistema de auto-cancel (30 Mar) creo un nuevo pain point en `cancel_confirm`. Completion rate del bot bajo 36.2% → 31.0%. Stuck en `cancel_*` explotó 1 → 7 (+600%). De 20 sesiones con error post-fix: 0 volvieron al bot despues, y 10 de 12 no-completion fueron rescatadas manualmente por Marleny — **el bot le agrego trabajo en vez de quitarselo**.

### BUG #1 — CRITICO: `cancel_confirm` no acepta texto humano (~1-2h)
**Evidencia en reporte:** 4 casos reales post-fix de pacientes que abandonaron despues de escribir explicaciones humanas en `cancel_confirm`:
- `+50494566053`: "Esta fuera de la ciudad y regresa hasta la proxima semana"
- `+50499926100`: "Ok ay estaré mañana .con la doctora marleni verdad ??" (queria CONFIRMAR, no cancelar)
- `+50494550191`: "Tengo un proceso infeccioso" (paciente con problema medico real)
- `+50495084967`: "Quiero reprogramar la cita" (estaba en main_menu pero patron identico)

**Fix propuesto:**
- En handler de `cancel_confirm` aceptar texto libre y `detectIntent()`:
  - "ahi estare" / "alli estare" / "ok" / "voy" → re-rutear a confirmacion (NO cancelar)
  - "reagendar" / "reprogramar" / "otro dia" → flujo reagenda
  - "cancelar" / "no puedo" / "ya no" → avanzar a confirmacion cancelacion
  - Explicacion sin verbo ("estoy enfermo", "tengo infeccion") → guardar en `notes` + preguntar "¿quiere reagendar o cancelar?"
- Archivo: `supabase/functions/bot-handler/index.ts` funcion `handleCancelConfirm()`
- **Impacto:** resuelve la regresion mas cara de Medilaser (cliente $75/mes, mayor volumen)

### BUG #2 — MEDIO: Respuestas tardias a reminders caen en `main_menu` (~1-1.5h)
**Evidencia:** 3 pacientes respondieron al reminder con "ahi estare" horas/dias despues. Sesion ya expiro (30 min timeout). Entraron en `main_menu` sin contexto del reminder pendiente.
- `+50492789875`: "Ahí estaré" → error
- `+50499915409`: "Hola. Allí estaré" + "y me confirmó que si" → terminó en handoff
- `+50494566053`: "No puedo asistir" → entro a cancel_confirm sin contexto previo

**Fix propuesto:**
- En `whatsapp-inbound-webhook` o `bot-handler` cuando recibe mensaje en `main_menu`/`greeting`:
  1. Query: ¿paciente tiene cita proxima (<48h) con `reminder_24h_sent=true` y sin confirmar?
  2. Si si + mensaje contiene intent de confirmacion/cancelacion → rutear directo al flow, saltando menu
  3. Intents a detectar: "ahi estare", "alli estare", "voy", "si voy", "ok estare" → confirmar; "no puedo", "no voy" → cancel_confirm
- **Impacto:** resuelve 3+ casos y es el patron mas frecuente de abandono.

### BUG #3 — MEDIO: `parseDateHint` no cubre prefijos comunes y rangos (~45 min)
**Evidencia:** 4 casos reales en `booking_select_day`:
- `+50499282398`: "Para la semana del 6 de abril" (prefijo "Para la")
- `+50495083227`: "Me gustaria dejar la cita para el 24 de abril" (prefijo "Me gustaria")
- `+50433899824` (tu QA): "Semana del 30 de marzo" (sin "al" al final)
- `+50432801129`: "Semana del 13 de abril al 17" (rango con "al DD" sin segundo mes)

**Fix propuesto:**
- En `parseDateHint()`: stripear prefijos antes de parsear: `"Para la "`, `"Me gustaria "`, `"Quiero "`, `"Quisiera "`, `"Para el "`
- Patron adicional: `/semana del (\d+) de (\w+)(\s+al \d+(?:\s+de (\w+))?)?/i`
- Si rango termina con solo dia, asumir mismo mes
- **Impacto:** resuelve 4 casos + patron generalizado de hondureños escribiendo frases completas.

### Casos destacados documentados en reporte (relevantes para Carla)

- **`+50499796391`** (25 Mar): el bot canceló su cita cuando ella queria reagendar (escribio "1. Reagendar" copiando del menu, bot lo interpreto como "1 = confirmar cancelacion"). Tuvo que volver 7 dias despues a agendar de nuevo. Guard `hasReagendarIntent` ya deployado 30 Mar (e4be0f7) — **verificar no se repite post-fix**.
- **`+50495083227`**: despues de fallar el bot con "Me gustaria dejar la cita para el 24 de abril", contacto directo a la doctora para reagendar. Bot perdio el punto.
- **`+50494550191`** (paciente con infeccion): 3 "opcion no valida" en 2 dias, nunca completo en el bot. Ejemplo perfecto del daño al UX.

### Criterios de exito (re-correr queries en 1-2 semanas)
- [ ] Stuck en `cancel_*` bajo de 7 a ≤ 2
- [ ] 0 "opcion no valida" en `cancel_confirm` con texto libre
- [ ] Completion rate bot ≥ 35%
- [ ] 0 cancelaciones erroneas (paciente queria reagendar pero bot canceló)
- [ ] Tasa de "opcion no valida" en `booking_select_day` -50%

### Bugs secundarios del mismo analisis (BAJA prioridad)
- [ ] BUG #4: `booking_select_hour` no redirige cuando paciente escribe fecha ("17 de abril")
- [ ] BUG #5: `booking_select_doctor` acepta numeros fuera de rango sin mensaje claro ("elija del 1 al 3")
- [ ] BUG #6: FAQ matching por keywords atrapa preguntas irrelevantes (paciente pregunto por "blanqueamiento genital", bot respondio "consulta dermatologica"). Ya planificado para Junio 2026+ con FAQ+AI. Mitigacion temporal: "no encontre respuesta, ¿quiere hablar con secretaria?"

## Sprint mini — progreso (aprobado 6 Mar, max 2-3 dias)

| # | Item | Estado |
|---|------|--------|
| 1 | Secretaria no puede crear pacientes | DONE (d8fffc2) |
| 2 | Bloquear fechas especificas | PENDIENTE — operacional critico para Dra. Yeni |
| 3 | UI medico unico (ocultar dropdowns innecesarios) | DONE (7c54164, 261a8e2, a731467) |
| 4 | Completar hand-off a secretaria/doctor | DONE (f9e263d) |

## Backlog

### Seguridad
- [ ] Vista `bot_analytics_summary`: cambiar SECURITY DEFINER a INVOKER
- [ ] 10 funciones sin `search_path` fijo: agregar `SET search_path = ''`
- [ ] Habilitar leaked password protection en Supabase Auth settings
- [ ] 4 tablas sin RLS policies: documentar (son service_role only)

### Producto (blocker para ads)
- [ ] Flujo "DEMO" en el bot: cuando reciba "DEMO" dar contexto guiado para doctor

### Bot — bugs de parsing (detectados y RESUELTOS 30 Mar)
- [x] **CRITICO — Cancelacion accidental en `cancel_confirm`:** Guard `hasReagendarIntent` previene que "1. Reagendar" cancele citas. Deploy: e4be0f7
- [x] **Keywords hondureñas en todo el bot:** reajendar, canselar, ajendar, sita, konsulta, presio, sekretari, bolber, etc. en todos los handlers. Deploy: e4be0f7
- [x] **Texto libre en booking_select_day:** parseDateHint ahora soporta "semana del DD MES", "DD MES", "esta/proxima semana", meses abreviados. Deploy: e4be0f7
- [x] **Intent detection en greeting:** Primer mensaje con intent claro ya no se pierde (agendar, reagendar, FAQ, handoff). Deploy: e4be0f7
- [x] **Intent detection en FAQ:** "quiero agendar" en faq_search redirige a booking. Deploy: e4be0f7
- [x] **Keywords de FAQs Dr. Guevara:** Ubicacion (0→15 keywords), Extraccion (4→13 keywords). Fix via SQL directo.

### Junio 2026+ — FAQ auto-poblado (concepto aprobado, no construir aun)
Tres capas planificadas para despues del feature freeze:
1. **Datos estructurados del onboarding:** Ubicacion, horarios, precios base → el bot responde sin necesidad de FAQ manual. Estos datos ya se recogen parcialmente en el wizard.
2. **Templates de FAQ por especialidad:** Pre-cargar FAQs tipicas segun tipo de clinica (dermatologia, odontologia, etc). Ya existe `FAQTemplatePicker` con 50 templates genericos — extender con templates por especialidad. Cada template incluye pregunta + keywords + respuesta placeholder que la clinica solo llena con sus datos.
3. **Deteccion automatica de gaps:** Query semanal contra bot_conversation_logs para detectar preguntas sin respuesta. Generar reporte para cada clinica: "3 pacientes preguntaron sobre X y no tuvimos respuesta". Ya existe el query como herramienta en modo-dev (gap report). Fase futura: notificacion automatica al admin de la clinica via dashboard.

### Recordatorios / Engagement (descubierto y resuelto 30 Mar)
- [x] Segundo cron 7pm para cubrir citas creadas en la tarde (pg_cron job #8)
- [x] Sistema de confirmacion con consecuencia real (auto-cancel 7am)
- [x] Nuevo template con deadline + follow-up 7:15pm + notificacion de slot liberado
- [x] Intent detection: "ahi estare"→confirm, "no puedo"→cancel
- [x] **QA 31 Mar:** Verificado en Demo Bot — funciona correctamente
- [x] **Post-QA:** Swap v2 activado en Consultorio Familiar, Dr. Guevara, Medilaser (1 Abr)
- [ ] Reportar a Medilaser: necesitan FAQs sobre precios de laser, blanqueamiento axilas, eliminacion tatuajes, queloide

### Templates gender-neutral + copy corto (5 Abr)
- [x] Reescribir 7 de 9 canonical templates: copy corto para Honduras, gender-neutral, Meta-compliant
- [x] `reminder_24h`: ya no inicia con variable (Meta lo rechazaba), quitado "la" hardcodeado
- [x] `confirmation`: simplificado de 8 a 4 lineas
- [x] `reschedule_doctor`: quitado "El paciente" (genero), simplificado
- [x] `patient_confirmed`, `patient_reschedule`, `handoff_notification`: simplificados
- [x] `appointment_released`: mejorado con ❌ y "cancelada" (mas visible que "liberada")
- [x] `reminder_3d` y `reminder_followup`: sin cambio (ya estaban bien)
- [x] `meta-webhook.ts`: fallback body de reschedule alineado con nuevo texto
- [x] `recreate-templates`: nuevo parametro `logical_types` para recrear templates especificos (no todos)
- [x] Deploy: recreate-templates, meta-embedded-signup, meta-webhook
- [x] **Fix Ecoclinicas:** mapping corregido a `recordatorio_cita_24h_050426`, meta_status=PENDING
- [x] **APROBADO 7 Abr:** `recordatorio_cita_24h_050426` en Ecoclinicas → meta_status=APPROVED en BD (actualizado manualmente)
- [x] **Prueba manual enviada 7 Abr:** template recibido OK en +50433899824. Encoding de acentos se corrompe en curl Windows pero el cron envia dd/MM/yyyy (sin acentos) — no es issue en produccion
- **0 templates PENDING en toda la BD** — todos APPROVED
- Nota: templates canonicos solo afectan nuevos onboardings. Clinicas existentes (Guevara, Consultorio, Medilaser) no se afectan — usan `recordatorio_v2_300326`

### Recordatorios 3 dias antes (31 Mar sesion 2)
- [x] Template `reminder_3d` creado en canonical-templates.ts (sin "manana", usa fecha)
- [x] messaging-gateway: type `reminder_3d` + TYPES_WITH_QUICK_REPLY
- [x] send-reminders: seccion 3-day usa `type: "reminder_3d"` en vez de `reminder_24h`
- [x] Templates `recordatorio_3d_310326` creados en 4 WABAs Meta (PENDING aprobacion)
- [x] template_mappings insertados (is_active=false hasta APPROVED)
- [x] meta_status de templates v2 actualizado a APPROVED en DB
- [x] Deploy: messaging-gateway + send-reminders (ff78b27)
- [x] **APROBADO 6 Abr:** `recordatorio_3d_310326` en 5 WABAs — ya estaban APPROVED y activos en BD

### Soporte numeros internacionales (Junio 2026+)
- [ ] `normalizeToLocalHN()` en whatsapp-inbound-webhook — deja de asumir 8 digitos Honduras
- [ ] `findPatientByPhone()` en bot-handler — deja de forzar +504
- [ ] UI de ingreso de pacientes — validacion de numeros extranjeros
- [ ] Caso: Mirian Yanira Zelaya Carias (+14794030090, USA) — recibe recordatorios OK pero confirmacion/bot no funciona
- [ ] Nota: clienta viaja cada 8 meses, no urgente

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json

## Bugs conocidos

- [ ] Paciente +50433899824 lleva 1 semana en booking_select_hour — verificar timeout de sesiones
- [ ] **confirmation_message_sent nunca se marca true** — en `create-appointment/index.ts` linea ~410, despues de `gatewayResult.success` falta `await supabase.from("appointments").update({ confirmation_message_sent: true }).eq("id", appointment.id)`. Los mensajes SI se envian (message_logs lo confirma), solo el flag no se actualiza. Afecta a todas las orgs desde siempre (las citas viejas con true fueron de codigo anterior a la migracion a messaging-gateway).
- [ ] **`appointment_at` se guarda 6 horas desfasada (Honduras UTC-6)** — severidad **BAJA hoy, ALTA si algo nuevo la empieza a usar**. Descubierto 10 Abr analizando citas de Consultorio Familiar (horarios apareciendo a las 2-5 AM en queries con `AT TIME ZONE 'America/Tegucigalpa'`).
  - **Causa raiz:** `create-appointment/index.ts:217` construye `const appointmentAt = \`${date}T${normalizedTime}\`` (string ISO sin offset). `update-appointment/index.ts:151` (accion reschedule) tiene el mismo patron. Postgres con columna `timestamptz` asume UTC → guarda `2026-04-18 11:30:00+00` cuando deberia ser `2026-04-18 17:30:00+00` (11:30 AM local Honduras).
  - **Por que NO afecta reminders hoy:**
    - `send-reminders/index.ts` filtra por columna legacy `date` (`tomorrowHonduras()`) y formatea hora con `appointment.time` — nunca lee `appointment_at` en logica real (solo esta en el SELECT).
    - `send-reminder-followup/index.ts` idem.
    - `auto-cancel-unconfirmed/index.ts:34,52,119` idem — usa `date` y `time`.
    - Frontend (`src/`): `appointment_at` solo aparece en `integrations/supabase/types.ts` (generado), no se usa en ningun componente.
  - **Lecturas de riesgo bajo (no criticas pero existen):**
    - `meta-webhook/index.ts:297-298` — fallback cuando el paciente responde con texto libre sin `appointmentIdFromPayload`: `.gte("appointment_at", twoDaysAgo.toISOString())` + `.order("appointment_at")`. El desfase de 6h es uniforme en todas las citas, asi que el orden relativo es correcto. Edge case solo en bordes del umbral de 2 dias (muy raro).
    - `whatsapp-inbound-webhook/index.ts:670,763` — pasa `appointmentAt` al bot-handler como parametro. **Codigo muerto: `bot-handler/index.ts` no lee `appointmentAt` en ningun lado.**
  - **Fix propuesto (minimo):** cambiar en `create-appointment:217` y `update-appointment:151`:
    ```ts
    const appointmentAt = `${date}T${normalizedTime}-06:00`; // Honduras sin DST
    ```
    O con Luxon (consistente con `_shared/datetime.ts`):
    ```ts
    const appointmentAt = DateTime.fromISO(`${date}T${normalizedTime}`, { zone: 'America/Tegucigalpa' }).toUTC().toISO();
    ```
  - **Migracion de datos existentes:** `UPDATE appointments SET appointment_at = appointment_at + interval '6 hours'` — opcional, solo si algun codigo nuevo empieza a leer la columna. Por ahora se puede dejar como esta.
  - **Por que no es urgente:** ningun flujo productivo depende de esta columna. Pero ES bomba de tiempo — proximo dev que agregue un feature (ej. notificacion al doctor cuando paciente agenda, vista "proximas citas ordenadas", API externa) y use `appointment_at` como fuente de verdad lo rompe silenciosamente.
- [ ] **`reminder_morning_sent` / `reminder_morning_sent_at` huerfanos** — las columnas existen en la tabla `appointments` pero **ningun codigo las lee ni las escribe**. Grep completo en `supabase/functions/` y `src/` = 0 matches. Decidir: (a) implementar cron matutino que las usa, o (b) hacer migration para eliminar columnas. Probablemente feature a medio hacer. No afecta hoy.

- [ ] **Estados `completada` / `no_asistio` sin uso en produccion — problema de adopcion, NO de automatizacion.** Descubierto 10 Abr analizando citas de todos los clientes. Wilmer tiene 71 citas pasadas en limbo (31 agendada + 40 confirmada), Medilaser 80 (47 agendada + 33 confirmada), Yeni 5. **Cero** citas marcadas como `completada` o `no_asistio` en clientes pagos reales. Consecuencia: no podemos medir tasa de asistencia ni no-shows — la metrica central del producto.
  - **UI existe:** dropdown en `src/pages/AgendaSecretaria.tsx:370-375, 483-488` permite cambiar a `completada` o `no_asistio`. StatusBadge renderiza los 5 estados. Tipos en `src/types/appointment.ts:1`.
  - **Backend no hace nada:** 0 edge functions transicionan estados post-cita, 0 crons procesan citas pasadas. El unico cron que toca status es `auto-cancel-unconfirmed` (pre-cita, no post).
  - **Regla operacional (Diego, 10 Abr):** NO implementar cron que rellene estados automaticamente. Prefiere que el medico/secretaria se acostumbren al workflow manual. Datos inferidos ensucian metricas reales. Ver `feedback_no-data-inferida.md` en memoria Claude.
  - **Diego trabajara por su cuenta en la adopcion** (Opcion A — educacion + UX). Propuestas validas de Claude si vuelve el tema: nudges in-app, recordatorio visual post-cita, onboarding explicito. **Propuestas invalidas:** cron de inferencia, default pesimista, asumir "confirmada = completada".
  - **Implicacion comercial:** los reportes tipo Guevara/Medilaser son incompletos — tenemos el funnel de mensajeria (enviado/leido/confirmado) pero NO el funnel final (llego/no llego). Tesis del producto "reducimos no-shows" sin validacion de datos duros hasta que la adopcion suba.

- [ ] **Estado `reagendar` huerfano en DB** — no esta en `src/types/appointment.ts` pero existe en la tabla `appointments`: Wilmer 4, OrionCare 1, OrionCareEditado 32. Alguien (probablemente bot-handler en un flow antiguo) escribe ese valor. Decidir: agregar al type o normalizar a `agendada`/`cancelada`.

- [ ] **Cita huerfana sin `appointment_at` — flujo del bot crashea** — descubierto en Consultorio Familiar: cita de Kensi Nicol Carcamo Bonilla (24 Mar) quedo con `appointment_at=null`, notes "Agendada via WhatsApp Bot". El bot agendo pero no guardo timestamp. Sin `date`/`time` tampoco recibe reminders. Buscar que rama del bot-handler crea citas sin appointment_at y arreglar. Probablemente relacionado con bot-handler creando appointments via otra ruta que no pasa por `create-appointment`.
- [x] **Template reminder_24h rechazado por Meta en Ecoclinicas** — causa: Meta no permite iniciar con variable `{{1}}`. Fix: reescrito template + mapping corregido (5 Abr). Pendiente aprobacion Meta.
- [x] **Race condition UserContext redirige a onboarding** — usuarios existentes redirigidos a /onboarding/clinic tras login. Causa: dos llamadas concurrentes a getCurrentUserWithRole() (onAuthStateChange + getSession). Fix: eliminado getSession duplicado + skip TOKEN_REFRESHED. Commit: 47443e4
- [ ] **Dual Supabase client** — dos instancias: `src/lib/supabaseClient.ts` (minimal, sin auth config) y `src/integrations/supabase/client.ts` (full config). No causa bugs visibles ahora pero es deuda tecnica. Diferir unificacion a Junio 2026.
- [ ] **+50488844585 (Jonathan Ayala, Medilaser)** — todos los mensajes quedan en `sent` (nunca delivered). WhatsApp Business inactivo o desregistrado. No es bug de OrionCare — reportar a clinica.

## Resuelto recientemente

- **Sesion 7 Abr — template Ecoclinicas APPROVED + prueba flujo completo:**
  - Template `recordatorio_cita_24h_050426` actualizado a APPROVED en BD (era el unico PENDING)
  - Prueba manual via Meta API: template recibido OK. Acento en "miércoles" se corrompe desde curl Windows — no afecta produccion (cron envia dd/MM/yyyy)
  - Cita de prueba creada: 8 Abr 10:00 AM, id `2c9aa52e`, reminder enviado manualmente, `reminder_24h_sent=true`
  - 6 message_logs FAILED (132001) de crons anteriores cuando template estaba PENDING — ya no deberia repetirse
  - **Pendiente verificar:** cron 7pm (01:00 UTC) deberia enviar reminder_24h a 2 citas de manana (b8f8 18:30, 7fb2 19:00), y follow-up a la cita de prueba (2c9a 10:00) a las 7:15pm
  - 2 citas de hoy (7 Abr) nunca recibieron reminder — ya pasaron, sin accion

- **Sesion 6 Abr (2) — race condition UserContext + analisis Medilaser:**
  - **Fix race condition:** UserContext.tsx tenia dos paths concurrentes (onAuthStateChange + getSession) que ambos llamaban getCurrentUserWithRole(). El ultimo en resolver ganaba — si retornaba null, seteaba isNewUser=true y redirigía a onboarding. Fix: eliminado getSession duplicado (INITIAL_SESSION de onAuthStateChange cubre el caso desde Supabase v2.39+), agregado skip de TOKEN_REFRESHED. Commit: 47443e4
  - **Hallazgo dual-client Supabase:** dos instancias separadas (`lib/supabaseClient.ts` minimal vs `integrations/supabase/client.ts` full config). Comparten localStorage pero tienen listeners independientes. No causa el bug actual, diferido a Junio.
  - **Analisis citas Medilaser semana 6-12 Abr:** 16 citas total, 5 auto-canceladas (todas manuales del lunes, flujo correcto: reminder→followup→auto-cancel), 3 reagendadas via bot, 8 pendientes. 0 pacientes usaron boton de confirmar. Citas del bot NO fueron auto-canceladas — pacientes del bot reagendan proactivamente.
  - **Caso +50488844585 (Jonathan Ayala):** 4 mensajes en `sent` (nunca delivered). WhatsApp Business inactivo — no es bug nuestro. Reportar a clinica.

- **Sesion 6 Abr — templates + auto_cancel + cita prueba Ecoclinicas:**
  - Ultimo template PENDING (`recordatorio_cita_24h_050426` Ecoclinicas) → APPROVED + is_active=true
  - Templates `recordatorio_3d_310326` verificados APPROVED en 5 WABAs (ya estaban OK)
  - Templates Pinares verificados APPROVED (ya estaban OK)
  - 0 templates pendientes en toda la BD
  - `auto_cancel_enabled` activado para Ecoclinicas (estaba false por default)
  - **Default de columna `auto_cancel_enabled` cambiado a `true`** — nuevos clientes lo tendran activo automaticamente
  - Cita de prueba creada via SQL para Diego en Ecoclinicas (7 Abr 7:45 PM, id: cd6b5a2d) — sin confirmacion WhatsApp porque bypass create-appointment. Doctor hara prueba desde dashboard.
  - Nota: no se pudo invocar messaging-gateway sin service_role_key. CLI no tiene `functions invoke`.

- **Templates gender-neutral + copy corto + fix Ecoclinicas (5 Abr):**
  - Causa raiz: Meta rechaza templates que inician con variable (`{{1}}, la {{2}} le espera...`)
  - Tambien: "la" hardcodeado no funciona para doctores masculinos (Dr. vs Dra.)
  - Fix: 7 de 9 canonical templates reescritos — copy corto para Honduras, gender-neutral
  - `reminder_24h`: "Hola {{1}}, {{2}} le espera mañana {{3}} a las {{4}}. ⚠️ Confirme antes de las 7AM o se libera su espacio."
  - `confirmation`: simplificado de 8→4 lineas
  - `reschedule_doctor`: quitado "El paciente", simplificado a 2 lineas
  - `appointment_released`: ❌ + "cancelada" (mas visible que "liberada")
  - `recreate-templates`: nuevo filtro `logical_types` para recrear solo templates especificos
  - Deploy: recreate-templates, meta-embedded-signup, meta-webhook
  - Ecoclinicas: mapping corregido a `recordatorio_cita_24h_050426` (PENDING aprobacion Meta)
  - Solo afecta nuevos onboardings. Clinicas existentes usan `recordatorio_v2_300326` (no se tocan)

- **Template reminder_3d + prep swap v2 (31 Mar sesion 2, ff78b27):**
  - Nuevo template `reminder_3d` para recordatorios 3 dias antes (sin "manana", usa fecha real)
  - Botones: "Confirmo" / "No puedo asistir" (sin emojis — Meta no permite)
  - Flujo: 3-day reminder (dia -3) → paciente confirma → 24h reminder (dia -1) igual se envia
  - Templates `recordatorio_3d_310326` creados en 4 WABAs, esperando aprobacion Meta
  - meta_status de templates v2 (recordatorio_v2, sin_confirmar, liberada) actualizado a APPROVED
  - Swap pendiente: activar reminder_3d + swap reminder_24h_v2 en 3 clinicas cuando Meta apruebe

- **Swap reminder_24h v2 + fix direct reschedule (1 Abr, 54aab1a):**
  - Swap activado en 3 clinicas: Consultorio Familiar, Dr. Guevara, Medilaser
  - Templates viejos renombrados a `reminder_24h_legacy` (is_active=false) para rollback
  - Templates v2 (`recordatorio_v2_300326`) promovidos a `reminder_24h` (is_active=true)
  - **Bug fix:** "No puedo asistir" en recordatorio mostraba menu principal en clinicas reales
  - Causa: `handleDirectReschedule` requeria `session.state === 'greeting'`, pero pacientes con sesiones existentes (estado `completed`) no pasaban el check
  - Fix: removida restriccion de estado — `handleDirectReschedule` es autónomo y resetea todo el context
  - Deploy: bot-handler (54aab1a)
  - **Canonical templates fix (edf9796):** Botones de `reminder_24h` y `reminder_followup` tenian emojis que Meta rechaza. Alineados con templates aprobados en produccion. Deploy: meta-embedded-signup + recreate-templates

- **3 bugs de confirmacion (31 Mar, fac1121):**
  - **detectIntent "No puedo asistir" confirmaba:** "asistir".includes("si") matcheaba CONFIRM antes de CANCEL. Fix: "si" como palabra completa, cancel antes de confirm. Alineado con whatsapp-inbound-webhook.
  - **"Paso 5/4" en reagendar:** availableDoctors/availableServiceTypes stale causaban offset incorrecto en getStepNumbers(). Fix: limpiar en handleDirectReschedule + handleCancelConfirm opcion Reagendar.
  - **handleDirectReschedule → opciones:** Ahora muestra Reagendar/Cancelar/Volver en vez de saltar directo a seleccion de semana.
  - **Follow-up prematuro 15 min:** send-reminder-followup ahora filtra reminder_24h_sent_at < 4h ago. Citas del cron 7pm ya no reciben follow-up a las 7:15pm.
  - Deploy: meta-webhook + bot-handler + send-reminder-followup
  - **QA PENDIENTE:** Diego probara y reportara resultados proxima sesion

- **Sistema de confirmacion con consecuencia real (30 Mar sesion 3):**
  - Flujo: Recordatorio 11am → Follow-up 7:15pm si no confirmo → Auto-cancel 7am dia de cita
  - 2 edge functions nuevas: `send-reminder-followup`, `auto-cancel-unconfirmed`
  - 2 crons nuevos: job #9 (follow-up 7:15pm), job #10 (auto-cancel 7am)
  - DB: columnas `reminder_followup_sent`, `auto_cancelled`, `auto_cancelled_at`, `auto_cancel_enabled` (por org)
  - Auto-cancel activado en 4 orgs produccion: Consultorio Familiar, Dr. Guevara, Medilaser, OrionCare
  - Intent detection actualizado: "ahi estare"→confirm, "no puedo"→cancel (meta-webhook + whatsapp-inbound-webhook)
  - Cancel intent nuevo: status→cancelada con notes
  - 3 templates Meta creados en 4 WABAs (12 total):
    - `recordatorio_v2_300326` — nuevo reminder con deadline 7AM (8/12 APPROVED, 4 PENDING)
    - `recordatorio_sin_confirmar_300326` — follow-up de urgencia
    - `cita_liberada_no_confirmacion_300326` — notificacion de slot liberado
  - template_mappings insertados: `reminder_followup` y `appointment_released` activos, `reminder_24h_v2` inactivos (activar cuando 4/4 APPROVED)
  - Nota: botones Meta NO permiten emojis. Botones: "Si, ahi estare" / "No puedo asistir" / "Confirmo"
  - Swap activado en OrionCare: `reminder_24h` → `recordatorio_v2_300326` (APPROVED)
  - QA en curso: 3 citas creadas para 31 Mar en Demo Bot (+50493133496), paciente dican (+50433899824)
    - Cita A: flujo completo (no confirmar → follow-up → auto-cancel)
    - Cita B: confirmar con boton "Si, ahi estare"
    - Cita C: cancelar con boton "No puedo asistir"
  - **PENDIENTE proxima sesion:**
    - Revisar resultados QA del 31 Mar (crons 7pm follow-up + 7am auto-cancel)
    - Si QA OK → activar swap en las otras 3 clinicas (Consultorio Familiar, Dr. Guevara, Medilaser)
    - Swap = borrar mapping viejo de `reminder_24h` + renombrar `reminder_24h_v2` a `reminder_24h` + activar
    - Verificar que los 4 templates PENDING ya esten APPROVED antes de swap
    - Limpiar templates duplicados con sufijo `_223520` (del batch que hizo timeout)
    - Comunicar a clinicas: "citas no confirmadas antes de las 7AM se cancelan automaticamente"
  - Nota: template matutino (morning nudge) descartado — innecesario si ya confirmaron o se cancelo

- **Segundo cron de recordatorios 7pm (30 Mar sesion 2):**
  - Problema: 28% de citas (23/82) no recibian recordatorio — creadas despues del cron de 11am
  - Fix: pg_cron job #8 `send-reminders-evening` a las 01:00 UTC (7pm Honduras)
  - La funcion send-reminders ya era idempotente (checa `reminder_24h_sent = false`)
  - Cobertura estimada: 72% → 85-88%
  - Citas despues de 7pm siguen sin cobertura (pocas, ~4-6 en 15 dias)

- **Telefonos corregidos Medilaser (30 Mar sesion 2):**
  - Marlon Enamorado: `+5049798084` → `+50497983084` (faltaba digito)
  - Ana Solis: `+50499590522` → `+50494510434` (numero incorrecto)

- **HBR Medilaser 15 dias (30 Mar sesion 2):**
  - 89 citas, 5.9/dia, 37% via bot, 40% show-up rate (dato de Elena)
  - Engagement: solo 20% de pacientes interactuan con recordatorios
  - Embudo recordatorios: 61 enviados → 56 llegaron (92%) → 33 leidos (54%) → 17 confirmaron (28%)
  - 23 sin recordatorio: 13 por timing del cron (RESUELTO), 8 reagendadas (esperado), 2 edge cases
  - Bot: 34.5% completion, 11.1% error, 34.5% handoff, 14.3 msgs/completada
  - FAQ gaps: precios de laser (5 mismatch), eliminacion tatuajes, blanqueamiento — reportar a clinica
  - Feedback Elena: siente trabajo doble, pacientes "perezosos" no confirman, no sabia marcar completadas

- **Health Bot Report (HBR) consolidado en modo-dev (30 Mar):**
  - Unifica FAQ Gap Report + Bot Health Report en un solo reporte de 7 secciones
  - 8 queries: citas, mensajeria, dashboard bot, embudo, abandonos, eficiencia, horaria, FAQ gaps
  - Separa cancelaciones reales vs reagendamientos (notes ILIKE '%reagendada%')
  - Tasa de confirmacion de recordatorios: boton vs respondieron al bot
  - Commits: e4be0f7, 46a565c, ac20b00, e73ad85, 702fefa
  - Baseline Medilaser sem2: 30% completion, 15.8% error, 56% citas via bot
  - Baseline Guevara sem2: 0% completion, 0% error, volumen muy bajo (4 sesiones)

- **PRIORIDAD 1 RESUELTA: Bot entiende texto libre en todos los menus (25 Mar)** — 5 fixes deployados:
  1. **Acknowledgments en greeting:** "Ok", "Gracias", "Listo" en respuesta a recordatorio → respuesta breve sin menu (elimina ~16 sesiones falsas)
  2. **Main menu intent detection:** `detectMenuIntent()` detecta booking/reschedule/faq/handoff desde texto natural. Keywords: ubicacion→FAQ, cita/lunar/consulta→booking, mi cita/reagendar→reschedule, hablar/ayuda→handoff. Fechas y horas tambien rutean a booking.
  3. **Fuzzy match servicios/doctor:** `fuzzyMatchOption()` matchea texto contra nombres de servicio/doctor (accent-insensitive, substring). "Consulta medica" → selecciona servicio correcto.
  4. **Texto en fechas:** `parseDateHint()` parsea "manana", "lunes", "05 de abril", "el 31" → matchea semana/dia disponible. Usado en booking_select_day y booking_select_hour (seleccion de dia).
  5. **Texto en horas:** `parseTimeHint()` parsea "3pm", "las 2", "a las 3:30" → matchea slot disponible. `fuzzyMatchOption` contra opciones formateadas ("2:00 PM").
  - Helpers agregados: `detectMenuIntent`, `fuzzyMatchOption`, `parseDateHint`, `parseTimeHint`
  - Bug fix bonus: `startRescheduleFlow` pasaba 4 args a `handleRescheduleList` (necesitaba 5)
  - Baseline pre-fix: 0.61 opcion-no-valida/sesion, 37.7% completion rate
  - QA: Diego probo con Demo Bot, todo funciona
  - Deploy: bot-handler, 25 Mar 2026
  - Analisis baseline en: `docs/bot-analysis-baseline-24mar.md`

- Bot UX fixes (20 Mar, 2d90f73) — 5 fixes de analisis de conversaciones reales:
  1. **Escape global booking:** "cancelar/salir/menu/volver" en 5 estados de booking → main_menu (pacientes atrapados sin salida)
  2. **FAQ auto-handoff:** Contador de not-found consecutivos, al 3ro ofrece conectar con secretaria/doctor (paciente envio "4" x11 sin escape)
  3. **Saludos en main_menu:** "hola/buenas/buenos dias" ya no genera "opcion no valida"
  4. **Logging searchFAQ:** Query, FAQs count, best match + score para diagnosticar 83% fail rate
  5. **Scoring mejorado:** Reverse keyword match (kw.includes(query)) + prefix matching (word.startsWith)
  - Deploy: `npx supabase functions deploy bot-handler` — verificado OK
  - Estados excluidos deliberadamente: booking_confirm (cancelar=opcion3), cancel_confirm, main_menu, faq_search (ya maneja), reschedule_list (ya maneja)



- Superadmin smoketest05 agregado (16 Mar):
  - `dican19+smoketest05@gmail.com` insertado en `superadmin_whitelist`
  - Acceso a `/internal/activations` habilitado
- Configuracion de nueva doctora completada (16 Mar):
  - Doctora solicito segundo calendario ($35 adicional) y posible tercero en futuro
  - Requiere definir pricing multi-calendario en estrategia
- FAQ Template Catalog completado (16 Mar):
  - 50 templates pre-poblados en 8 categorias (horarios, citas, pagos, servicios, preparacion, resultados, politicas, emergencias)
  - Componente FAQTemplatePicker con busqueda, filtro por categoria, deteccion de duplicados
  - Integrado en BotFAQsPage: boton "Desde catalogo" + "Crear manual"
  - Keywords robustas con errores ortograficos, frases informales WhatsApp, hondurenismos
  - Commits: cfe745b, 1629271
  - QA aprobado
- UI medico unico completado (16 Mar):
  - Hook `useSingleDoctor` auto-detecta orgs con un solo doctor
  - Oculta dropdown en NuevaCita, AgendaSemanal, AgendaMedico, Pacientes, AppointmentsReport
  - Flash fixes: guards con `loadingDoctors` y `enabled` param en hooks de queries
  - Fix orphan patient records: upsert con onConflict en bot-handler
  - Commits: 7c54164, 792dbc4, 261a8e2, a731467
- Handoff WhatsApp notification completado (6 Mar):
  - Template canonico `handoff_notification` (solicitud_atencion_paciente) agregado
  - `messaging-gateway` acepta tipo `handoff_notification`
  - `bot-handler` notifica al target (secretaria o doctor) via WhatsApp fire-and-forget
  - Resuelve target segun `bot_handoff_type`: secretary→org_members→secretaries.phone, doctor→whatsapp_line_doctors→doctors.phone
  - UI auto-detecta si org tiene secretaria activa; fuerza handoff a doctor si no
  - Templates creados en Meta para las 3 orgs (PENDING aprobacion):
    - Consultorio Familiar: `solicitud_atencion_paciente_060326_235901` (meta_id: 2122880248326847)
    - Dr Guevara: `solicitud_atencion_paciente_060326_235902` (meta_id: 900073702633323)
    - Demo Bot: `solicitud_atencion_paciente_060326_235903` (meta_id: 2684167388611076)
  - template_mappings insertados en DB para las 3 lineas
  - Deploy: bot-handler + messaging-gateway
  - Commit: f9e263d, pushed to main
- Phones verificados: Elena (secretaria Dra Yeni) +50497825738, Wilmer Guevara 99919187, Diego +50412312313, Ana Lopez +50433899824. Dra Yeni sin phone pero su handoff va a secretaria.
- Bot muestra 10 slots por pagina en vez de 5 (PAGE_SIZE, emojis 8→12). Deploy hecho.
- Linea "Demo Bot" (+50493133496) configurada manualmente en org TEsting (c8b1c83b)
  - Registro Meta Cloud API completado (PIN: 246810)
  - Templates: apuntados a legacy templates ya aprobados (encoding UTF-8 correcto)
  - Fix: trailing underscore en template confirmation causaba error #132001
  - Linea vieja duplicada eliminada (org 2edd8692)
- Eliminada edge function `recreate-templates` de Supabase (10 Mar):
  - Estaba desplegada sin auth (v3) — riesgo de seguridad
  - Borrada via `supabase functions delete`
  - Codigo local conservado con auth para re-deploy futuro
  - 6 templates de Pinares recreados (PENDING aprobacion Meta)
- FAQ bot: opciones swapeadas corregidas
- 5 bugs de booking del bot corregidos (stale context, calendarId, post-cancel menu, disponibilidad real)
- Seleccion opcional de tipo de servicio en flujo de booking
- Emojis del bot actualizados, typo secretaria corregido
- Dialog de edicion de linea WhatsApp dividido en tabs General/Bot

## Pendiente

- [x] **Templates Pinares (6 nuevos, sufijo _100326_*)**: APPROVED y activos en BD (verificado 6 Abr)
- [ ] **QA handoff notification**: templates aprobados — probar con Demo Bot (+50493133496). Verificar que doctor/secretaria recibe WhatsApp con datos del paciente
- [ ] Dra. Yeni Ramos no tiene phone en tabla doctors — agregar si algun dia cambian handoff a doctor
- [ ] `TBD_LEGACY_NAME` en canonical-templates.ts para WABA OrionCare — no urgente, no se usa con bot
- [ ] Verificar webhook: WABA 1491078449281051 debe apuntar a whatsapp-inbound-webhook de Supabase
- [ ] Borrar templates rotos de Meta (5 con sufijo _040326_114943) — requiere permisos de Business Admin, no System User

## Notas tecnicas

- Bot de autoagenda entrando a campo con clientes reales
- Onboarding tiene wizard pero requiere activacion SuperAdmin
- Stack: React 18 + TS + Vite + Supabase + Edge Functions (Deno) + Twilio/Meta WhatsApp
- Landing page: prompt maestro creado para actualizar contenido en Lovable (4 Mar). CTAs apuntan a wa.me/+50433899824
- Seguridad: backlog sigue pendiente, priorizar en proxima sesion dev
- Al crear templates via curl en Windows, los emojis/acentos se corrompen. Solucion: reusar templates legacy existentes o usar Unicode escapes (\uXXXX)
- Supabase project ref: `soxrlxvivuplezssgssq` (en config.toml). Deploy CLI: `npx supabase functions deploy <name> --project-ref soxrlxvivuplezssgssq --no-verify-jwt`
- Org de prueba es c8b1c83b (OrionCare), NO se usa la WABA legacy de OrionCare (1292296356040815)
