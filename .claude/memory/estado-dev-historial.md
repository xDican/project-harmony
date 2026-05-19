# Estado Desarrollo — Historial

> Archivo historico. Lo vivo esta en `estado-dev.md`.
> No se carga automaticamente al activar /modo-dev.
> Snapshot tomado el 19 May 2026 (incluye sprints 0-3 MVP Centro de Atencion).
> Sprints y bugs ordenados de mas reciente a mas viejo.

---

# Estado Desarrollo — OrionCare (snapshot)

> Ultima actualizacion: 18 May 2026 23:30 UTC (Sprint 3 MVP Centro de Atencion completado — Frontend Inbox + centralizacion realtime via InboxContext)

## Fase actual

**Sprint 1-8 MVP Centro de Atencion** (19 May - 20 Jul). Feature freeze ROTO conscientemente — pivot a centro de atencion es supervivencia, no feature creep. Detalles en `.claude/plans/centro-atencion-mvp.md` y `.claude/plans/centro-atencion-sprints.md`.

## ✅ SPRINT 3 COMPLETADO 18 May ~23:30 UTC — Frontend Inbox

### Fases 1-7 cerradas

| Fase | Entregable | Commits clave |
|---|---|---|
| 1 | Layout responsive (desktop 2 cols, mobile single) | Sprint 3 fase 1-2 |
| 2 | InboxList + filtros (all/unread/bot/human) + search | — |
| 3 | ConversationDetail: timeline + audio player + transcription + composer | — |
| 4 | Tomar / Devolver al bot (inbox-handoff, inbox-return-bot) | — |
| 5 | Realtime Supabase channels — **bug raiz: `current_doctor_id()` VOLATILE rompia evaluacion de policies en Realtime; fix STABLE** | d69440d |
| 6 | Badge unread global en sidebar (numerito al lado de "Bandeja") | fb954ee |
| 7 | Polish: retry buttons, timeline skeleton, empty states contextuales, aria-labels, focus-visible | 15b127d |
| extra | **InboxContext: una fuente de verdad** — un solo channel `clinic:{orgId}`, badge sidebar + lista derivan del mismo state. Eliminada hook duplicada `useInboxUnreadCount`. | fff4429 |

### Bug raiz importante de Sprint 3 — Realtime + funciones VOLATILE

Supabase Realtime evalua el OR de todas las RLS policies SELECT cuando llega un evento. Si CUALQUIERA usa una funcion VOLATILE, la evaluacion falla silenciosamente y el evento se descarta. `current_doctor_id()` estaba VOLATILE — la policy `v3_message_logs_select_doctor_own` la usaba, y aunque Diego no es doctor, Postgres la evalua igual como parte del OR y rompe todo.

Fix: migration `20260518200001_fix_current_doctor_id_stable_for_realtime.sql` — `ALTER FUNCTION current_doctor_id() STABLE`.

**Aprendizaje para el futuro:** verificar siempre que las funciones usadas en RLS policies de tablas con Realtime habilitado sean STABLE o IMMUTABLE.

### Arquitectura final del Inbox

- `App.tsx` monta `<InboxProvider>` dentro de `UserProvider`
- `InboxProvider` (src/context/InboxContext.tsx):
  - llama `useConversations(orgId)` → state local
  - llama `useRealtimeInbox(orgId, callbacks)` → un solo channel `clinic:{orgId}` que muta el state via upsertConversation/applyMessageToConversation
  - expone: conversations, unreadCount (derivado), refetch, etc.
- `MainLayout` consume `useInbox().unreadCount` para el badge
- `Inbox.tsx` consume `useInbox()` para la lista
- `ConversationDetail.tsx` mantiene su propio `useConversationMessages(convId)` para el timeline (scope por-conv, no por-org)

Para optimizar redes lentas (reconnect, debounce, batching) — un solo lugar a tocar: `InboxProvider`.

### Listo para dogfooding

Inbox funcional end-to-end con Warhol. Faltan fases 4-7 del plan (multimedia outbound desde composer, promociones del mes, Calling API, dogfooding y lanzamiento Mendoza).

## ✅ SPRINT 2 COMPLETADO 18 May 18:06 UTC — Multimedia + Transcripcion

### Edge functions deployadas a prod

| Function | Version | Cambio |
|---|---:|---|
| `process-media-async` | v1 (NEW) | Fire-and-forget: descarga Meta media → Storage → Whisper (si audio) → UPDATE message_logs. Auth `x-internal-secret`. |
| `meta-webhook` | v42 | Dispatch async tras persistInboundMessage cuando llega multimedia. Sin bloquear webhook (Meta espera <5s). |
| `messaging-gateway` | v42 | Acepta `mediaId`, `mediaKind`, `mediaUrl`, `mediaMime`. Provider envia con type='media'. |
| `inbox-send` | v2 | Descarga Storage → upload Meta → mediaId → llamar gateway con multimedia. |

### Helpers nuevos / extendidos

- `supabase/functions/_shared/meta-media.ts` (NEW) — resolveMetaMediaUrl, downloadMetaMediaBytes, uploadToStorage, downloadFromStorage, uploadMetaMedia, createSignedUrl, extFromMime, parseMediaIdFromPlaceholder
- `supabase/functions/_shared/whisper.ts` (NEW) — transcribeAudio (OpenAI Whisper API, language='es')
- `supabase/functions/_shared/messaging-types.ts` — `type` extendido a `template|text|media`, agregados `mediaId`, `mediaKind`
- `supabase/functions/_shared/providers/meta-provider.ts` — nuevo `buildMediaPayload` para enviar image/audio/document con `id`

### Validacion end-to-end con Diego (18 May 18:04-18:06 UTC)

**2 audios reales del Demo Bot:**

| Audio | Storage path | Transcripcion |
|---|---|---|
| 18:04:41 | `c8b1c83b.../1e714e37.../ed03359b-fad2-47c3-8eb2-fb8953f2f07f.ogg` (13KB) | *"Hola, buenos dias. Estoy interesado en agendar una cita con la doctora."* |
| 18:06:25 | `c8b1c83b.../1e714e37.../e4a219af-473b-43ab-a7cd-61617f09bf4b.ogg` (14KB) | *"Hola, mucho gusto. Me llamo Diego. Estoy interesado en agendar una cita con el doctor."* |

**Tiempo end-to-end medido:** ~3 segundos por audio (webhook → storage → whisper → UPDATE).

**Costo real:** $0.002 total por los 2 audios (~$0.001 cada uno).

### Decisiones tecnicas tomadas en Sprint 2

1. **Async fire-and-forget** — webhook responde <5s a Meta, process-media-async corre en background. No retry loops; si falla, paciente reenvia.
2. **OpenAI Whisper API** — language='es' forzado para Honduras. Costo ~$0.001/audio.
3. **Storage path convention** — `{org_id}/{conv_id}/{message_log_id}.{ext}`. Trazable, msg_id unico.
4. **Media outbound via Meta Media API** — asistente sube a Storage primero, inbox-send descarga, sube a Meta como mediaId, gateway envia con type='media'.
5. **Sin pg_cron** — no implementado retry. Si vemos fallos en campo, agregar en Sprint 7.

### ⚠️ INSIGHT FILOSOFICO (Diego 18 May PM)

**Transcripcion no es para la asistente — es para que el BOT procese audios.**

Detalle en [[bot-maximo-control]] memory. Esto refina como pensar Sprint 4-6:

- **Audio inbound → bot debe procesar transcripcion automaticamente** — feature pendiente que NO esta en plan original. Modificar bot-handler para que, ademas de message_text, acepte una transcripcion de audio como mismo input y responda al paciente con flow normal. Implementacion: en meta-webhook, cuando llega audio, dispatch a process-media-async espera transcripcion + dispatch a bot-handler con `messageText=transcription`. **Estimado: 2-3h. Candidato Sprint 4 o post-Sprint 3.** Ver task #15.
- **Quick replies (Sprint 4)** — no solo para asistente. Plantillas tambien usadas por el bot.
- **Promociones (Sprint 5)** — confirma importancia: bot necesita data fresca.
- **Llamadas perdidas → bot retoma (Sprint 6)** — nueva feature documentada en [[llamada-perdida-bot-retoma]]. Si asistente no contesta WhatsApp call, mensaje auto + bot toma. Ver task #16.

**Frontend inbox (Sprint 3) sigue siendo necesario** pero diseñar para uso EXCEPCIONAL, no rutinario. La asistente NO debe pasar 4h/dia ahi. Si la metrica de uso del inbox >60% del tiempo de la asistente, el modelo de producto fracaso.

### Pendiente (no bloqueante)

- Fase 5 multi-user login validation — requiere crear user `secretary-backup` en auth.users + smoke test. Sprint 3 puede arrancar sin esto.
- Validacion outbound multimedia via inbox-send con JWT real — task #13 actualizada.

### Proximo: Sprint 3 (9-15 Jun → ejecucion adelantada)

Sprint 3 (9-15 Jun originalmente): Frontend `/inbox` con lista + detalle, renderers por tipo (text, image, audio+transcripcion, document), Realtime con Supabase channels, botones tomar/devolver bot. 13 sub-tareas estimadas 25h. **Sera el primer trabajo de frontend del MVP** — UX visible para la asistente.

---

## ✅ SPRINT 1 COMPLETADO 18 May 17:02 UTC — Persistencia + Bot Dual Mode

### Edge functions deployadas a prod

| Function | Version | Cambio |
|---|---:|---|
| `messaging-gateway` | v41 | Acepta campos opcionales del inbox (conversationId, source, sentBy, messageType). Branch outbound: si source provisto → persistOutboundMessage + updateConversationOnOutbound. Sin cambio path legacy. |
| `meta-webhook` | v41 | Imports nuevos. extractMediaFromMetaMessage para detectar audio/image/document. getOrCreateConversation antes del flow bot. persistInboundMessage con conv_id. **Bot dual mode**: si status='human_active', persist+return (no llamar bot-handler). routeToBotHandler pasa conversationId al gateway. |
| `inbox-send` | v1 (NEW) | POST endpoint. Auth JWT. SELECT conversation (RLS). Auto-handoff si bot_active. Llama gateway con source=assistant + sentBy=auth.uid(). Marca unread_count=0. |
| `inbox-handoff` | v1 (NEW) | POST endpoint. Auth JWT. UPDATE status=human_active + assigned_to=auth.uid(). |
| `inbox-return-bot` | v1 (NEW) | POST endpoint. Auth JWT. UPDATE status=bot_active + assigned_to=NULL. |

### Helpers shared nuevos

- `supabase/functions/_shared/conversations.ts` — getOrCreateConversation (idempotente, race-safe via 23505 retry), getConversationStatus, updateConversationOnInbound (read-then-update unread_count), updateConversationOnOutbound, markConversationRead.
- `supabase/functions/_shared/inbox-messages.ts` — persistInboundMessage (usa logMessage + UPDATE patch con conv_id/source/message_type/media_*), persistOutboundMessage (insert directo con todos los campos), extractMediaFromMetaMessage (detecta image/audio/document/video y retorna `meta-media:<id>` URL placeholder).

### Validacion end-to-end con Diego (18 May 16:52-17:02 UTC)

**Conversation 1e714e37-482d-49e5-8bc2-466f66ec790b (Demo Bot — "Dican"):**
- 13 mensajes inbound source='patient' ✅
- 10 mensajes outbound source='bot' ✅
- Flow agendar cita completo (paso 1→5, cita confirmada con Dr. Diego Escalante) ✅
- Bot dual mode: UPDATE status='human_active' → Diego mando 2 mensajes mas → bot NO respondio, mensajes persistidos con conv_id ✅
- Return-to-bot: UPDATE status='bot_active' → bot respondio en 2s con saludo ✅
- 0 regresiones en path legacy (recordatorios siguen sin conv_id)
- Endpoints rechazan 401 sin JWT ✅

### Decisiones tecnicas tomadas en Sprint 1

1. **Bot calla por completo cuando human_active** — no acuse, no push. Mensaje queda en conv para que asistente lo vea.
2. **Gateway centralizado con campos opcionales del inbox** — un solo path de envio. Callers que NO pasen source siguen funcionando.
3. **Endpoints inbox-* con cliente Supabase usando JWT del user** — RLS aplica naturalmente. Service role solo para llamar al gateway desde inbox-send.
4. **Auto-handoff en inbox-send** — si asistente responde en conv bot_active, status pasa a human_active automaticamente.
5. **`message_type='text'` default en message_logs** — CHECK constraint preserva inserts legacy del bot.
6. **billable=false para mensajes de conversacion** — evita el constraint `billable_requires_doctor`. Templates legacy siguen con billable=true cuando hay doctorId.

### Pendiente (no bloqueante, task #13)

- Validacion end-to-end del endpoint `inbox-send` con JWT real (auth.uid() de Diego). Estimado 10 min. JWT se obtiene de DevTools de la app web.

### Proximo: Sprint 2 (26 May - 1 Jun → ya ejecutamos esta sesion el 18 May en lugar de la fecha planeada original 26 May)

Sprint 2 (2-8 Jun originalmente): Whisper transcripcion + media download Meta → Storage `conversation-media` + multi-user login validation. 12 sub-tareas estimadas 22h. Detalles en `.claude/plans/centro-atencion-sprints.md`.

---

## ✅ SPRINT 0 COMPLETADO 18 May — Schema Foundation Centro de Atencion

### Migrations aplicadas a main (Supabase `soxrlxvivuplezssgssq`)

| # | Migration | Output |
|---|---|---|
| 1 | `centro_atencion_01_helper_set_updated_at` | Funcion generica `public.set_updated_at()` (replaza patron per-tabla) |
| 2 | `centro_atencion_02_service_types` | Tabla `service_types` + 17 rows migrados desde JSONB whatsapp_lines |
| 3 | `centro_atencion_03_conversations` | Tabla `conversations` con UNIQUE(line, phone), 5 indices |
| 4 | `centro_atencion_04_promotions` | Tabla `promotions` con FK service_types, CHECK valid_to >= valid_from |
| 5 | `centro_atencion_05_quick_replies` | Tabla `quick_replies` con FK service_types y 6 categorias |
| 6 | `centro_atencion_06_message_logs_extend` | ALTER message_logs: 9 columnas nuevas nullable (conversation_id, source, message_type, transcription, media_url/mime, call_*, sent_by) + 3 indices parciales |
| 7 | `centro_atencion_07_storage_bucket` | Bucket `conversation-media` (25MB, mime types audio+image+pdf) via execute_sql + 4 storage policies |

### Verificacion post-apply

- 4 tablas nuevas con RLS habilitada + 16 policies (4 por tabla)
- 9 columnas en message_logs validadas con tipos y nullables correctos
- 17 service_types migrados sin perdida (5 orgs, 16 con duration_minutes preservado)
- 4 triggers updated_at activos
- Storage bucket + 4 policies de storage.objects
- TypeScript types regenerados en `src/integrations/supabase/types.ts` (59KB) — `tsc --noEmit` compila limpio
- Test RLS isolation: rol `anon` ve 0 rows en las 4 tablas

### Decisiones de arquitectura tomadas en Sprint 0

1. **Extender `message_logs`** en lugar de crear `messages` nueva. Recordatorios y conversaciones conviven. Query inbox: `WHERE conversation_id IS NOT NULL`.
2. **Normalizar `bot_service_types` JSONB a tabla `service_types`** con FK. JSONB queda intacto hasta que Sprint 1 actualice el bot-handler.
3. **Aplicar a main directamente** (no branch). Migrations aditivas + nullable, sin riesgo. Ahorra ~$22 vs branch.
4. **`set_updated_at()` generica** vs patron per-tabla. La existente `update_bot_faqs_updated_at()` queda en su lugar para no romper trigger actual.
5. **Storage bucket via `execute_sql`** porque `apply_migration` no tiene ownership de `storage.objects`/`storage.buckets`.

### Archivos generados

- `supabase/migrations/20260518120001_centro_atencion_01_helper_set_updated_at.sql`
- `supabase/migrations/20260518120002_centro_atencion_02_service_types.sql`
- `supabase/migrations/20260518120003_centro_atencion_03_conversations.sql`
- `supabase/migrations/20260518120004_centro_atencion_04_promotions.sql`
- `supabase/migrations/20260518120005_centro_atencion_05_quick_replies.sql`
- `supabase/migrations/20260518120006_centro_atencion_06_message_logs_extend.sql`
- `supabase/migrations/20260518120007_centro_atencion_07_storage_bucket.sql`
- `docs/centro-atencion-schema.md` (ERD ASCII + detalle por tabla + verificaciones)
- `src/integrations/supabase/types.ts` (regenerado)

### Proximo: Sprint 1 (26 May - 1 Jun, ~25h)

- Extender `bot-handler/index.ts` para persistir TODOS los inbound en `message_logs` con `conversation_id`
- Helper `_shared/conversations.ts`: `getOrCreateConversation`, `persistInboundMessage`, `persistOutboundMessage`
- Bot dual mode: chequear `conversations.status='human_active'` antes de responder (bot calla)
- Endpoints edge functions: `inbox-send`, `inbox-handoff`, `inbox-return-bot`
- Webhook eventos delivery/read de Meta para actualizar `message_logs.status`
- Smoke test con demo bot

---

## ✅ FIXES PRE-SABADO MENDOZA DEPLOYADOS 15 May ~21:50 UTC — bot-handler v62

## ✅ FIXES PRE-SABADO MENDOZA DEPLOYADOS 15 May ~21:50 UTC — bot-handler v62

> **Contexto:** Mendoza (estetica, Torre Zafiro) se instala sabado 16 May 9:30 AM. Es path critico del canal asistente (Dulce administra ~5 medicos en Torre Zafiro; el resultado con Mendoza decide si Dulce pasa a los otros). Barrido de produccion (12-15 May post Sprint 1) detecto 3 bugs reales que se arreglaron antes del sabado. Plan completo en `C:\Users\dican\.claude\plans\genera-un-plan-para-adaptive-sprout.md`.

### Items deployados

| Fix | Archivo | Cambio |
|-----|---------|--------|
| **#1** dedupe handoff (Sury 14-May) | `bot-handler/index.ts` `handleHandoffToSecretary` (linea 2391) | Agregado dedupe 5min basado en `bot_conversation_logs(session_id, state_after='handoff_secretary')`. Si hit, paciente recibe "✅ Su caso ya fue escalado a [connecting]. Dentro de poco se estara comunicando..." y secretario NO recibe notif dup. Firma extendida con `sessionId?: string`, 13 callsites actualizadas. |
| **#2** SOFT_NO confirmo (14-May) | `_shared/honduras-intents.ts:179` + test | Agregadas 4 frases: "yo le confirmo despues", "le confirmo despues", "confirmo despues", "confirmo luego". Test nuevo en `honduras-intents.test.ts`. |
| **#3** parseTimeHint HH:MM (Jennyfer 14-May) | `bot-handler/index.ts` `parseTimeHint` (linea 1518) | Tercera regex `^(\d{1,2}):(\d{2})$` con regla `<7 → +12` (no hay slots de noche). Tambien ajustada regla de regex "las X" de `<8` a `<7` por consistencia. Wiring en `handleBookingSelectHour` ya existia (linea 1655). |

### Validacion post-deploy

| Check | Resultado |
|-------|-----------|
| `list_edge_functions` post-deploy | bot-handler **v62 ACTIVE** ✅ |
| SQL dedupe handoff (24h) | Solo 2 rows con diff_seconds < 300 — ambos del bug pre-fix de Sury (15-May 01:13-01:15 UTC). 0 nuevos casos post-deploy ✅ |
| QA Demo Bot | **PENDIENTE viernes 16-May AM** — Diego validara los 3 fixes en demo bot antes de instalacion Mendoza 9:30 AM |

### QA pendiente viernes 16 May AM (~30 min)

Antes de instalar en Mendoza, validar en Demo Bot con org de Wilmer:

1. **Fix #1 — Dedupe handoff:**
   - Disparar handoff (ej. "necesito hablar con alguien"). Confirmar mensaje al paciente + notif a Diego.
   - Dispararlo de nuevo en <5min. Esperado: paciente recibe "✅ Su caso ya fue escalado...". Diego NO recibe segunda notif.

2. **Fix #2 — SOFT_NO confirmo:**
   - En main_menu, escribir "yo le confirmo despues" → bot responde con copy SOFT_NO (no navigation).
   - Variantes: "le confirmo despues", "confirmo despues".
   - SQL check: `intent_detected = 'soft_no'` en bot_conversation_logs.

3. **Fix #3 — Horas HH:MM:**
   - Llegar a `booking_select_hour` con un slot AM disponible.
   - Escribir "8:15" (si slot 08:15 existe) → avanza a booking_confirm.
   - Variantes: "08:15", "8:15 am", "14:30".
   - Caso negativo: "25:00" / "8:99" → "opcion no valida".

### SQL de monitoreo continuo (correr ~48h post-deploy)

```sql
-- Confirmar 0 handoffs duplicados POST-deploy (15-May 21:50 UTC en adelante)
WITH handoffs AS (
  SELECT session_id, created_at,
    LAG(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS prev_created
  FROM bot_conversation_logs
  WHERE state_after = 'handoff_secretary'
    AND created_at >= '2026-05-15 21:50:00+00'
)
SELECT session_id, created_at, prev_created,
  EXTRACT(EPOCH FROM (created_at - prev_created)) AS diff_seconds
FROM handoffs
WHERE prev_created IS NOT NULL
  AND EXTRACT(EPOCH FROM (created_at - prev_created)) < 300
ORDER BY created_at DESC;
```
Esperado: 0 rows.

### Bugs descartados / postergados del barrido

- **Mensajes sin texto (`media_no_text`):** Sprint 1 funciona — 6 casos en 4 dias todos respondidos correctamente.
- **Loops post-completed** ("Hola", "Ok" despues que cerro la sesion): edge case conversacional, no critico.
- **Loops en faq_search** sin respuesta: NO bug de codigo, configuracion de FAQs. Se resuelve en pre-config Mendoza viernes PM.

### Bugs de observabilidad descubiertos (NO bloqueantes, backlog)

1. **`appointment_released` no se loguea siempre** — 13 de 47 auto-cancelaciones (27.7%) NO crean event en `message_logs` aunque flag `auto_cancelled=TRUE` si se setea. Reportes que cuentan liberaciones via message_logs subestiman ~28%. Postponer a Sprint 2 o 3.

2. **Recordatorios huerfanos sin `appointment_id`** — 3 de 98 (3%) no graban el FK. Probable race condition. Postponer.

---

## ⚠️ HISTORICO PREVIO — 3 FIXES PRE-SABADO MENDOZA (ANTES DEL DEPLOY)

> **Contexto:** Mendoza (estetica, Torre Zafiro) se instala sabado 16 May 9:30 AM. Es path critico del canal asistente (Dulce administra ~5 medicos en Torre Zafiro; el resultado con Mendoza decide si Dulce pasa a los otros). Barrido de produccion (12-15 May post Sprint 1) detecto 3 bugs reales fixeables antes del sabado.

### Fix #1 — Dedupe handoffs: ampliar ventana 5s → 5min (15 min)

**Bug confirmado:** Sury Madrid (Tel +504...6875) escalo 3 veces consecutivas a Marleny:
- 19:13:00 (primera)
- 19:14:23 (+63 seg)
- 19:15:44 (+81 seg)

Sprint 1 item 1.5 implemento dedupe a 5 segundos. Ambas duplicadas pasaron muy encima de la ventana.

**Por que importa para sabado:** la asistente del canal (Dulce, y Mendoza) NO PUEDE recibir notificaciones duplicadas — destruye confianza desde dia 1. Punto cero del pitch "OrionCare te quita la carga".

**Fix:** en `bot-handler/index.ts` `handleHandoffToSecretary`, cambiar ventana de dedupe de 5s a 5min. Verificar que el check tambien aplica por `(session_id, intent)` y no solo por timestamp absoluto.

**Validacion post-fix:** repetir SQL que detecto el bug — `LAG(created_at) ... WHERE diff_seconds < 300`.

### Fix #2 — "Yo le aviso" no clasificado como SOFT_NO (10 min)

**Bug confirmado:** Tel +504...9562, 14-May 7:41 AM:
- `user_message` = `"Yo le aviso."`
- `intent_detected` = `navigation` (debio ser `SOFT_NO`)
- `state_after` = `main_menu → main_menu` (loop)

Plan Sprint 1 declaraba 8 frases SOFT_NO incluyendo "yo aviso" pero "yo le aviso" (con "le") no fue cubierta.

**Fix:** en `_shared/honduras-intents.ts`, agregar al array SOFT_NO:
- "yo le aviso"
- "yo le aviso despues"
- "yo le confirmo despues"
- "le aviso luego"

**Test:** agregar caso al `.test.ts` de honduras-intents.

### Fix #3 — Horas HH:MM no aceptadas en booking_select_hour (30 min)

**Bug confirmado:** Jennyfer (Consultorio Familiar, 14-May 15:21):
```
Bot: "Horarios disponibles. Escriba el numero"
Paciente: "11"     → loop (no hay opcion 11)
Paciente: "8:15"   → loop (bot espera numero del menu)
Paciente: "2 de las 8:15" → acepta el "2" pero agenda 10:45 AM (no 8:15)
Paciente: "2" → re-elige el slot correcto
Paciente: "1" → ✅ confirma
```

Paciente sufrio 4 min de pelea antes de completar. Sprint 2 (parser fechas completo) resuelve esto, pero un mini-fix vale antes del sabado porque **pacientes esteticos de Mendoza escriben horas literales** ("9 am", "2:30", "10:15").

**Fix:** en `bot-handler/index.ts` `handleBookingSelectHour`, antes del check de numero del menu:
- Regex: `/^\d{1,2}:\d{2}(\s?(am|pm))?$/i`
- Si matchea, buscar slot en `options_shown` cuya hora coincida (normalizar "8:15" vs "08:15" vs "8:15 AM")
- Si encuentra, avanzar a confirm. Si no, responder "Esa hora no esta en los slots disponibles. Elija uno del menu: ..."

**Test:** caso real de Jennyfer + variantes ("8:15", "08:15", "8:15 am", "8:15 AM").

### Roadmap del jueves 15 May tarde / viernes 16 May AM

| Bloque | Item | Tiempo |
|---|---|---:|
| Jueves PM | Fix #1 (dedupe) + tests + deploy | 30 min |
| Jueves PM | Fix #2 (SOFT_NO) + tests + deploy | 20 min |
| Viernes AM | Fix #3 (horas HH:MM) + tests + deploy | 45 min |
| Viernes AM | QA en demo bot con frases reales de los 3 bugs | 30 min |
| Viernes PM | Pre-config Mendoza (servicios + FAQs esteticos) | 1.5h |
| Sabado 9:30 | Instalacion en sitio | 2h |

### NO arreglar antes del sabado (descartado del barrido)

- **Mensajes sin texto (`media_no_text`):** Sprint 1 SI funciona — 6 casos en 4 dias todos respondidos correctamente con "🤔 Solo veo un audio/imagen/sticker..." Falsa alarma del analisis previo.
- **Loops post-completed** ("Hola", "Ok" despues que cerro la sesion): edge case conversacional, no critico.
- **Loops en faq_search** sin respuesta: NO es bug de codigo, es configuracion de FAQs por cliente. Se resuelve en pre-config Mendoza viernes.

### Bugs de observabilidad descubiertos (NO bloqueantes para sabado, ir en backlog)

1. **`appointment_released` no se loguea siempre** — 13 de 47 auto-cancelaciones (27.7%) NO crean event en `message_logs` aunque flag `auto_cancelled=TRUE` si se setea. Reportes que cuentan liberaciones via message_logs subestiman ~28%. Postponer a Sprint 2 o 3.

2. **Recordatorios huerfanos sin `appointment_id`** — 3 de 98 (3%) no graban el FK. Probable race condition. Postponer.

---

## ✅ HOTFIX SPRINT 1 DEPLOYADO 12 May 17:00 UTC (~11am HN)

**Motivo:** Analisis del cron 11 May 7pm HN revelo 2 bugs reales en los 4 pacientes que recibieron recordatorio. Plan en `.claude/plans/debemos-hacer-hotfix-ahorita-tender-whistle.md`.

**Deploys ejecutados:**
- `meta-webhook` v40 (Fix A)
- `bot-handler` v61 (Fix B + Bonus)

### Fixes incluidos

| Fix | Archivo | Cambio |
|-----|---------|--------|
| **A** state stale post-boton | `meta-webhook/index.ts` `logBotInteractionFromLegacy` | Cuando ya existe sesion del paciente, UPDATE bot_sessions.state='completed' (antes solo escribia log, dejaba state stale en booking_*/cancel_confirm). |
| **B** texto libre confirm/reschedule/cancel | `bot-handler/index.ts` `handleGreeting` + 2 helpers nuevos | Cuando intent='confirm'/'reschedule'/'cancel' y hay cita inminente: actua (UPDATE status o entra a reschedule/cancel destructive). Antes solo respondia "Recibido" sin tocar BD — paciente creia que confirmo y a las 7am auto-cancel la liberaba. |
| **Bonus** "no puedo" pelado | `_shared/honduras-intents.ts` `RESCHEDULE_PHRASES` | Agregado "no puedo", "hoy no puedo" (sin "asistir"). Diego ya no tiene que escribir 2 veces. |

### Validacion en produccion (cron 11am HN del 12 May)

| Caso | Resultado |
|------|-----------|
| **Diego (QA)** texto "No puedo ir" → reschedule directo | ✅ Bonus funciono |
| **Diego (QA)** "Gracias!" post-boton legacy | ✅ Fix A — ack normal (anoche era "Opcion no valida") |
| **Paciente real +50497870752** "Confirmo" texto libre | ✅✅ Fix B — `status='confirmada'` + mensaje formal (anoche era "Recibido" sin UPDATE) |
| **Paciente real +50499478944 (Medilaser)** boton confirm | ✅ Flujo legacy normal, state queda completed |

### Esperando data de la semana

Antes de pasar a Sprint 2 (planeado 19 May), dejar correr 1 semana con el hotfix vivo. Medir si los 3 bugs reaparecen o si surgen variantes nuevas. **Sprint 2 confirmado solo si las metricas justifican (parser fechas, slot mas cercano, aliases servicios).**

---

## ✅ SPRINT 1 DEPLOYADO 11 May 23:45 UTC — Humanizacion del bot

**Deploys ejecutados (todos retornan 200 post-deploy):**
- `bot-handler` v59
- `meta-webhook` v38
- `messaging-gateway` v39 (por el fix en `_shared/message-logger.ts`)

**QA parcial completado por Diego en Demo Bot:**
- FAQ matching (B.1.x) ✓
- Greeting/main_menu naturales (B.4.x) ✓
- Mensaje vacio (B.5.x) ✓
- Regresion (B.7.x) ✓
- Pendiente: B.6.x (boton "Confirmar" — cron 7PM HN del 11 May con 2 citas test)

**Proxima sesion dev: 19 May (Sprint 2).** Esta semana NO codear — dejar correr Sprint 1 para acumular data real. Diego enfoca en 6 demos del canal asistente (12-14 May) + segundas visitas (19+).



### Items completados

| # | Cambio | Archivo |
|---|--------|---------|
| 1.0 | 2 FAQs Wilmer pobladas (12+10 kw), 7 keywords promocionales quitadas de "consulta de diagnostico" | DB (`bot_faqs` UPDATE directo) |
| 1.1 | Modulo `honduras-intents.ts` (50+ frases del diccionario) + tests con 30+ casos reales | `supabase/functions/_shared/honduras-intents.ts` + `.test.ts` |
| 1.2 | `detectIntent` aplicado en 4 handlers. `handleDirectReschedule` salta menu redundante (fix 47% abandono). Escape "cancelar" en booking_* durante reschedule → phase 2 destructive | `bot-handler/index.ts` |
| 1.3 | Migration `bot_faqs.min_match_score NUMERIC NOT NULL DEFAULT 1.0` | `migrations/20260511120001_add_bot_faqs_min_match_score.sql` |
| 1.4 | `searchFAQ` usa threshold per-FAQ. Sin matches por solo prefix | `bot-handler/index.ts:2391` |
| 1.5 | Guard `user_message=""` con dedupe handoffs (5s window) | `bot-handler/index.ts` |
| 1.6 | `logBotInteractionFromLegacy` — insert en `bot_conversation_logs` desde meta-webhook flujo legacy | `meta-webhook/index.ts` |
| 1.7 | **Bug billable_requires_doctor encontrado y fixado.** Detalle abajo | `_shared/message-logger.ts` |

### Hallazgo critico Item 1.7

**Bug:** check constraint `message_logs_billable_requires_doctor` (billable=false OR doctor_id NOT NULL) hacia que TODOS los inbounds del flujo bot (no solo button_replies) fallaran al insertar en `message_logs`. logMessage logueaba el error a console.error pero el flujo continuaba.

**Causa:** flujo bot loggea inbound del paciente ANTES de identificar doctor → `doctorId=undefined` → `billable=true` (default) → check viola → insert rechazado.

**Fix:** `logMessage` auto-deduce `billable` del doctorId: si no hay doctorId → billable=false → check pasa. Caller puede sobrescribir pasando `billable` explicito.

**Impacto post-deploy:** `message_logs` empezara a tener entries para todos los inbounds del bot. Hoy hay 30+ entries en `bot_conversation_logs` sin contraparte en message_logs.

### QA pendiente (item del Sprint 1)

Antes de cerrar Sprint 1, validar en Demo Bot con org de Wilmer:

1. **FAQ matching:**
   - "cuanto cuestan las resinas?" → restauraciones ✓
   - "tienen blanqueamiento?" → blanqueamiento ✓
   - "tienen promo?" → handoff (no falso positivo) ✓

2. **Flujo reschedule:**
   - Boton "No puedo asistir" → directo a seleccion de semana (NO menu intermedio)
   - "cancelar" durante booking_* (con isReschedule) → confirmacion destructiva
   - "ahi estare" en cancel_confirm → cierra como confirmado

3. **Edge cases:**
   - Sticker/audio sin texto → pide texto, no handoff
   - Mensaje vacio duplicado en <5s → no respuesta dup

4. **Validacion SQL post-deploy (24h):**
   ```sql
   -- Inbounds del bot ahora deben aparecer en message_logs
   SELECT COUNT(*), MIN(created_at) FROM message_logs
   WHERE direction='inbound' AND provider='meta' AND billable=false
     AND created_at >= NOW() - INTERVAL '24 hours';
   ```

### Medicion 14 dias post-deploy

Correr el SQL de medicion (al final de la seccion plan) y comparar contra baseline V2 (14-28 Abr):

| Metrica | Baseline V2 | Esperado post-Sprint 1 |
|---------|------------:|----------------------:|
| Exito Medilaser | 31.5% | 45-50% |
| Exito Wilmer | 0% | 30-40% |
| Exito Yeni/CF | 40% | 55% |
| Abandono cancel_confirm | 70% | 30% |
| Mensajes vacios → handoff dup | 4-6/qna | 0 |
| Inbounds button "No puedo asistir" loggeados en message_logs | 0 | >20/qna |

### Pendiente para Sprint 2 (19 May)

Items NO incluidos en Sprint 1, planeados originalmente:
- Parser fechas/horas naturales
- "Buscar slot mas cercano" cuando fecha pedida no existe
- Aliases en `bot_service_types` (papanicolau → citologia, tatuaje → procedimiento)
- Validar duplicado de cita

### Pendiente para Sprint 3 (2 Jun)

- Onboarding pasos Servicios + FAQs
- Preambulos / out-of-scope / terceros
- Yeni y Ecoclinicas tienen **0 FAQs activas** — acción comercial: pedirles poblar paquete básico (ubicación, horario, métodos de pago, servicios). NO bloquea Sprints anteriores.

---

> Ultima actualizacion previa: 4 May 2026 (Sprint 1 humanizacion del bot priorizado — plan completo en .claude/plans/bot-humanizacion.md)

## SPRINT 1 PRIORIZADO — Humanizacion del bot (~9.5h, 3 sesiones) [HISTORICO]

**Plan completo:** `.claude/plans/bot-humanizacion.md` (incluye Sprints 2 y 3)
**Diccionario fuente:** `.claude/memory/diccionario-hondurenismos.md` (2,357 mensajes reales)
**Analisis fuente:** `docs/analisis-bot-detalle-pacientes-14abr-28abr.md` (56 sesiones)

### Arquitectura: 2 capas
- **Universal (estatica, codigo):** `_shared/honduras-intents.ts` — hondurenismos + intents top + parser. ~50 frases.
- **Cliente (dinamica, DB):** `bot_faqs.keywords` + `bot_service_types.aliases`. Crece sin deploy.

### Items Sprint 1 (orden sugerido de ejecucion)

### ⚠️ ITEM 1.0 — PREREQ: Auditar keywords de FAQs activas (30 min, ANTES de codear)

**Por que primero:** El item 1.4 sube el umbral de match a `min_match_score=1.0`. Si una FAQ activa tiene `keywords: []` o keywords debiles, dejara de matchear despues del deploy. Auditar y completar antes de tocar codigo.

**FAQs criticas confirmadas vacias (4 May):**
- Wilmer org `c7234d61-1586-42ae-bc0a-db8abb96a75c`:
  - "¿Cuál es el precio de las restauraciones dentales?" — `keywords: []` ⚠️
  - "¿Cuál es el precio del Blanqueamiento Dental?" — `keywords: []` ⚠️

**Pendiente revisar (correr SQL antes de codear):**
```sql
SELECT
  o.name AS cliente,
  f.question,
  COALESCE(array_length(f.keywords, 1), 0) AS num_keywords,
  f.keywords
FROM bot_faqs f
JOIN organizations o ON o.id = f.organization_id
WHERE f.is_active = true
  AND o.id IN (
    'c7234d61-1586-42ae-bc0a-db8abb96a75c', -- Wilmer
    '1eec1734-9cc0-4e2c-ae67-31aab1393df8', -- Medilaser
    'a182a362-62e4-45f4-84c7-f76c0735390c', -- Yeni/CF
    '7daa9810-13d2-44f9-bbf6-a7ea4f57ab74'  -- Ecoclinicas
  )
ORDER BY o.name, num_keywords ASC;
```

**Acciones segun resultado:**
- FAQs con `num_keywords = 0` → poblar con 5-10 keywords reales (sinonimos, typos comunes hondurenos del diccionario, palabras del title de la pregunta)
- FAQs con `num_keywords < 3` → expandir
- FAQs con keywords ambiciosos (ej. la "consulta de diagnostico" de Wilmer con 30+ keywords incluyendo "promo", "descuento") → recortar a los esenciales para evitar falsos positivos

**Caso especifico Wilmer:** ademas de poblar las 2 FAQs vacias, considerar agregar FAQ nueva "¿Cuanto cuesta la limpieza dental?" — paciente W1 (sesion del 25 Abr) la pidio 2 veces y nunca la obtuvo. Diego puede pedir el precio a Wilmer en la proxima llamada de seguimiento.

**Sin esta auditoria, el deploy de Sprint 1 puede empeorar las cosas para los clientes que dependen de FAQs con matching debil.** El plan ya identifica esto como riesgo #1.

---

**Sesion 1 (~4h, despues del prereq 1.0):**

| # | Item | Esfuerzo | Archivos clave |
|---|------|----------|----------------|
| 1.3 | Migracion `bot_faqs.min_match_score numeric NOT NULL DEFAULT 1.0` | 30min | `supabase/migrations/2026XXXX_bot_humanizacion.sql` |
| 1.4 | Ajustar `searchFAQ` con umbral: `bestScore >= (faq.min_match_score ?? 1.0)` | 30min | `bot-handler/index.ts:2403` |
| 1.1 | Crear `_shared/honduras-intents.ts` con `detectIntent()`, `normalizeTypos()`, `isAcknowledgment()`. 50 frases del diccionario. Tests unitarios con 30+ casos del dataset. | 3h | `_shared/honduras-intents.ts` (nuevo) + `_shared/honduras-intents.test.ts` |

**Sesion 2 (~3.5h):**

| # | Item | Esfuerzo | Archivos clave |
|---|------|----------|----------------|
| 1.2 | Aplicar `detectIntent` en 4 handlers: `handleGreeting`, `handleMainMenu`, `handleCancelConfirm`, `handleDirectReschedule`. **Cambio clave:** `handleDirectReschedule` retorna `nextState: 'booking_select_day'` (no `cancel_confirm`) con copy humano. Agregar escape "cancelar" en booking_*. | 2h | `bot-handler/index.ts:464-547`, `:549-630`, `:676-695`, `:2000+` |
| 1.5 | Bug `user_message=""` (M37, M1, M39, E1) — early return con mensaje claro + dedupe de handoffs si la transicion previa fue <5s | 1h | `bot-handler/index.ts` `processMessage` + `handleHandoffToSecretary` |
| 1.6 | Logging boton "Confirmar" — insert en `bot_conversation_logs` desde flujo legacy de meta-webhook | 30min | `meta-webhook/index.ts:335-360` |

**Sesion 3 (~2h):**

| # | Item | Esfuerzo | Archivos clave |
|---|------|----------|----------------|
| 1.7 | **Bug logging button_replies que van al bot.** Diagnostico (logs detallados en meta-webhook ramas botEnabled, deploy, test real con Diego presionando boton). Fix segun hallazgo. Validar con SQL post-fix. | 1h | `meta-webhook/index.ts:200-251` |
| QA | Pruebas en Demo Bot: confirmacion explicita en greeting, "no puedo asistir" → reagendar directo, "cancelar" en booking_*, FAQ con umbral, mensajes vacios, dedupe. Verificar bot_conversation_logs y message_logs. | 1h | testing manual |

### Resultados esperados Sprint 1 (medir 14 dias post-deploy)

| Metrica | Baseline (V2) | Esperado |
|---------|--------------|----------|
| Tasa exito Medilaser | 31.5% | **45-50%** |
| Tasa exito Wilmer | 0% | **30-40%** |
| Tasa exito Yeni/CF | 40% | **55%** |
| Abandono cancel_confirm | 70% | **30%** |
| Confirmaciones perdidas | 8-15/qna | **0-2** |
| FAQs respondidas incorrecto | 5/qna | **<1** |
| Mensajes vacios → handoff dup | 4-6/qna | **0** |
| Inbounds "No puedo asistir" loggeados | 0 (de ~23 recibidos) | **>20/qna** |

### Riesgos Sprint 1

- `min_match_score=1.0` puede romper FAQs con keywords debiles. **Mitigacion:** auditar las 7 FAQs activas de Wilmer + Medilaser/Yeni/Eco antes de subir umbral. Agregar keywords reales.
- Falsos positivos del detector ("siempre voy" interpretado como reschedule). **Mitigacion:** tests unitarios con casos reales, reglas culturales documentadas en codigo y `diccionario-hondurenismos.md`.
- Pérdida UX en cancel_confirm si paciente queria cancelar definitivo. **Mitigacion:** keyword "cancelar" disponible en cualquier paso de booking_*.

### Items NO incluidos en Sprint 1 (van en Sprint 2 y 3)

- Parser fechas/horas naturales (Sprint 2)
- "Buscar slot mas cercano" cuando fecha pedida no existe (Sprint 2)
- Aliases en `bot_service_types` (Sprint 2)
- Validar duplicado de cita (Sprint 2)
- Onboarding pasos Servicios + FAQs (Sprint 3)
- Preambulos / out-of-scope / terceros (Sprint 3)

### SQL de medicion (correr 14 dias post-deploy)

```sql
WITH sessions AS (
  SELECT
    session_id, organization_id,
    bool_or(state_after = 'completed') AS reached_completed,
    string_agg(DISTINCT state_before, ',') AS states_visited
  FROM bot_conversation_logs
  WHERE created_at >= 'YYYY-MM-DD' AND created_at < 'YYYY-MM-DD'
  GROUP BY session_id, organization_id
)
SELECT
  o.name AS cliente,
  COUNT(*) AS sessions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE reached_completed) / NULLIF(COUNT(*),0), 1) AS pct_exito,
  ROUND(100.0 * COUNT(*) FILTER (WHERE states_visited LIKE '%cancel_confirm%' AND NOT reached_completed)
                / NULLIF(COUNT(*) FILTER (WHERE states_visited LIKE '%cancel_confirm%'),0), 1) AS pct_abandono_cancel
FROM sessions s JOIN organizations o ON o.id = s.organization_id
WHERE o.id IN (
  'c7234d61-1586-42ae-bc0a-db8abb96a75c', '1eec1734-9cc0-4e2c-ae67-31aab1393df8',
  'a182a362-62e4-45f4-84c7-f76c0735390c', '7daa9810-13d2-44f9-bbf6-a7ea4f57ab74'
) GROUP BY o.name;
```

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

### COMPLETADO — Nivel 1 data layer (17 Abr)
- Fix seguridad: org_id en getTodayAppointmentsByDoctor (DONE)
- RPC `get_weekly_agenda`: 10+ round trips → 1 llamada PostgreSQL (DONE)
- Select solo columnas necesarias: 19 → 8 (DONE)
- Eliminar waterfall doctors → appointments (DONE)
- QueryClient defaults: staleTime 30s, sin refetchOnWindowFocus (DONE)
- Doctor seleccionado persiste en localStorage (DONE)
- Prefetch semanas adyacentes en background (DONE)
- **Resultado:** 2G segunda visita 19s→14s, primera visita 1:01→56s

### Metricas acumuladas (2G simulado, 50 kbps)

| Escenario | Original | Post JS/assets | Post Nivel 1 |
|-----------|----------|----------------|--------------|
| Primera visita | 1:15 | 1:01 | **56s** |
| Segunda visita (SW) | 35s | 19s | **14s** |

### PENDIENTE — Nivel 2: Refactor data layer (~8-10 horas, post-martes 22 Abr)

| # | Item | Esfuerzo | Impacto | Archivos clave |
|---|------|----------|---------|----------------|
| 2.1 | **Migrar 7 hooks a React Query** — reemplazar useState/useEffect por useQuery con queryKeys. Habilita cache, dedup, retry. Hooks: useWeekAppointments, useDoctors, useTodayAppointments, usePatientAppointments, useDoctorsSearch, usePatientsSearch, useSingleDoctor | 3-4h | ALTO | `src/hooks/*.ts` |
| 2.2 | **Persistencia IndexedDB** — `@tanstack/react-query-persist-client` + `idb-keyval`. Al abrir la app, la agenda de ayer se pinta en 0ms, revalida en background (stale-while-revalidate). Requiere 2.1 | 2h | ALTO | `src/App.tsx`, `package.json` |
| 2.3 | **Optimistic UI** — `useMutation` con `onMutate` optimistico para confirmar/cancelar/reagendar citas. Se siente instantaneo, sync en background. Revert automatico en `onError`. Requiere 2.1 | 2h | ALTO | `src/hooks/useAppointmentMutations.ts` (nuevo) |
| 2.4 | **Skeleton screens con contexto** — Reemplazar 3 rectangulos grises por estructura de agenda con nombre del doctor (del localStorage). Mostrar slots de hora vacios | 1h | BAJO | `src/pages/AgendaSemanal.tsx:305-311` |
| 2.5 | **Prefetch por intencion** — Hook `usePrefetchOnHover` que dispara `queryClient.prefetchQuery` en hover/touch de links de navegacion y botones. Requiere 2.1 | 1h | MEDIO | `src/hooks/usePrefetchOnHover.ts` (nuevo), `src/components/MainLayout.tsx` |

### PENDIENTE — Nivel 3: Infraestructura (post-freeze Junio, ~6-8 horas)

| # | Item | Esfuerzo | Impacto | Archivos clave |
|---|------|----------|---------|----------------|
| 3.1 | **Supabase Realtime** — Suscripcion a cambios en `appointments`. Cuando bot confirma o paciente reagenda, agenda se actualiza sin recargar. Requiere 2.1 para `invalidateQueries` | 3h | MEDIO | `src/hooks/useWeeklyAgenda.ts`, Supabase dashboard |
| 3.2 | **Indices PostgreSQL** — `CREATE INDEX idx_appointments_org_date ON appointments(organization_id, date)` + composito con doctor_id + parcial para status. Hoy cada query hace full table scan | 1h | MEDIO | `supabase/migrations/` |
| 3.3 | **Critical CSS inlining** — Tailwind genera 71 KB CSS, login necesita ~5 KB. Plugin `critters` extrae CSS critico e inline en HTML | 2h | BAJO | `vite.config.ts` |
| 3.4 | **Verificar Brotli en Vercel** — `curl -I -H "Accept-Encoding: br"` al dominio. Vercel lo activa por defecto pero confirmar | 15min | BAJO | Verificacion, no codigo |
| 3.5 | **Edge Middleware auth** — Vercel Edge verifica sesion antes de servir HTML. Usuarios no autenticados redirigidos sin cargar React | 3h | MEDIO | `middleware.ts` (nuevo) |
| 3.6 | **Background sync offline** — `onlineManager` de React Query + queue de mutaciones. Si secretaria confirma cita sin internet, sync al reconectar. Requiere 2.1 + 2.2 | 2h | BAJO | Config en QueryClient |

### Orden sugerido de ejecucion

**Semana 1 post-martes:** 3.2 (indices, 1h) → 2.1 (React Query, 3-4h) — los indices benefician todo y son independientes
**Semana 2:** 2.2 (IndexedDB, 2h) → 2.3 (Optimistic UI, 2h) → 2.4 (Skeletons, 1h) → 2.5 (Prefetch, 1h)
**Junio:** 3.1 (Realtime, 3h) → 3.3-3.6 segun prioridad

## Bot UX (analisis 10 Abr) — ABSORBIDO por Sprint 1 humanizacion

> Los BUG #1, #2, #3 originales del analisis Medilaser 10 Abr estan ahora cubiertos en Sprint 1 (items 1.1-1.7). Reporte completo del analisis: `docs/reporte-medilaser-10abr-bot-flows.md`. Detalle del plan en `.claude/plans/bot-humanizacion.md`.

**Casos historicos relevantes (mantener para QA del Sprint 1):**

- **`+50499796391`** (25 Mar): bot canceló cita cuando ella queria reagendar (escribio "1. Reagendar"). Guard `hasReagendarIntent` deployado 30 Mar (e4be0f7) — verificar no se repite post-Sprint 1.
- **`+50495083227`**: bot fallo con "Me gustaria dejar la cita para el 24 de abril" (prefijo). Sprint 2 lo cubre (parser fechas).
- **`+50494550191`** (paciente con infeccion): 3 "opcion no valida" en cancel_confirm. Sprint 1 lo cubre (texto libre via detectIntent).
- **`+50499926100`**: "Ok ay estaré mañana .con la doctora marleni verdad ??" (queria CONFIRMAR en cancel_confirm). Sprint 1 lo cubre.

### Bugs secundarios (cubiertos en Sprints siguientes)

- BUG #4: `booking_select_hour` no redirige cuando paciente escribe fecha → **Sprint 2 (parser fechas)**
- BUG #5: `booking_select_doctor` acepta numeros fuera de rango sin mensaje claro → polish menor, agregar a Sprint 1 sesion 3 si hay tiempo
- BUG #6: FAQ matching atrapa preguntas irrelevantes ("blanqueamiento genital" → "consulta dermatologica") → **Sprint 1 (item 1.4 umbral)** ya lo resuelve

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
