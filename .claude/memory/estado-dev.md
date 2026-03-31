# Estado Desarrollo — OrionCare

> Ultima actualizacion: 30 Mar 2026 sesion 3 (sistema de auto-cancelacion por falta de confirmacion)

## Fase actual

Feature freeze (Mar-May 2026). Solo bugs, seguridad y polish.

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
- [ ] **QA 31 Mar:** Verificar resultados en OrionCare Demo Bot
- [ ] **Post-QA:** Activar swap en Consultorio Familiar, Dr. Guevara, Medilaser
- [ ] Reportar a Medilaser: necesitan FAQs sobre precios de laser, blanqueamiento axilas, eliminacion tatuajes, queloide

### Soporte numeros internacionales (Junio 2026+)
- [ ] `normalizeToLocalHN()` en whatsapp-inbound-webhook — deja de asumir 8 digitos Honduras
- [ ] `findPatientByPhone()` en bot-handler — deja de forzar +504
- [ ] UI de ingreso de pacientes — validacion de numeros extranjeros
- [ ] Caso: Mirian Yanira Zelaya Carias (+14794030090, USA) — recibe recordatorios OK pero confirmacion/bot no funciona
- [ ] Nota: clienta viaja cada 8 meses, no urgente

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json

## Bugs conocidos

- [ ] Reagendar muestra "Paso 5/4" — numeracion de pasos incorrecta
- [ ] Paciente +50433899824 lleva 1 semana en booking_select_hour — verificar timeout de sesiones
- [ ] **confirmation_message_sent nunca se marca true** — en `create-appointment/index.ts` linea ~410, despues de `gatewayResult.success` falta `await supabase.from("appointments").update({ confirmation_message_sent: true }).eq("id", appointment.id)`. Los mensajes SI se envian (message_logs lo confirma), solo el flag no se actualiza. Afecta a todas las orgs desde siempre (las citas viejas con true fueron de codigo anterior a la migracion a messaging-gateway).

## Resuelto recientemente

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

- [ ] **Templates Pinares (6 nuevos, sufijo _100326_*)**: esperando aprobacion Meta (24-48h). Una vez APPROVED, activarlos y desactivar los viejos (_050326_*)
- [ ] **QA handoff notification**: esperar aprobacion de Meta templates, luego probar con Demo Bot (+50493133496). Verificar que doctor/secretaria recibe WhatsApp con datos del paciente
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
