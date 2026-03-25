# Estado Desarrollo — OrionCare

> Ultima actualizacion: 25 Mar 2026 (PRIORIDAD 1 resuelta: bot entiende texto libre en todos los menus)

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

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json

## Bugs conocidos

- [ ] Reagendar muestra "Paso 5/4" — numeracion de pasos incorrecta
- [ ] Paciente +50433899824 lleva 1 semana en booking_select_hour — verificar timeout de sesiones

## Resuelto recientemente

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
