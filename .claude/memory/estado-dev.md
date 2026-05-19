# Estado Desarrollo — OrionCare

> Ultima actualizacion: 19 May 2026 PM (Sprint 4 ✅ cerrado — quick replies + multimedia outbound. QA aprobado, 2 bugs durante QA fixeados (timeline >100 msgs + busqueda acentos).)
> Historico sprints + bugs resueltos en `estado-dev-historial.md`

---

## Fase actual

**Sprints 4-8 MVP Centro de Atencion** (19 May - lanzamiento Torre Zafiro 25 May modo inbox-only, bot activacion gradual desde 8 Jun).

Plan: `.claude/plans/centro-atencion-mvp.md` + `.claude/plans/centro-atencion-sprints.md` + `.claude/plans/las-palomitas-ya-est-n-squishy-steele.md` (Sprint 4 detalle)

## Sprints MVP — estado

| Sprint | Estado | Highlights |
|---|---|---|
| 0 — Schema | ✅ 18 May | 4 tablas + bucket Storage + RLS + 17 service_types migrados |
| 1 — Persistencia + bot dual mode | ✅ 18 May | 5 functions deployadas, conversation tracking |
| 2 — Multimedia + transcripcion | ✅ 18 May | Whisper español, audios ~3s, $0.002 total |
| 3 — Frontend Inbox | ✅ 18 May 23:30 | InboxContext realtime una-fuente-verdad. Bug fix VOLATILE RLS |
| **4 — Quick replies + multimedia outbound** | ✅ 19 May | Pagina settings + picker en composer + upload archivos. QA aprobado. Bugs fixeados: timeline en convs >100 msgs (preexistente Sprint 3) + busqueda quick replies normalizando acentos. |
| 5 — Promociones del mes | proximo | Panel asistente + uso por bot + expiracion auto |
| 6 — Calling API | en cola | Webhooks calls.* + UI inbox llamadas + softphone WebRTC |
| 7-8 — Pilot + lanzamiento | revisar | Decision 19 May: inbox-only 1 sem en Torre Zafiro |

## Arquitectura clave (Sprint 3 + 4, vigente)

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

## Regla critica aprendida (Sprint 3)

**Supabase Realtime + funciones VOLATILE en RLS = silencio.** Cuando llega evento Realtime, Supabase evalua el OR de TODAS las policies SELECT. Si CUALQUIERA usa funcion VOLATILE, evaluacion falla silenciosamente y evento se descarta.

**Verificar siempre** que las funciones usadas en RLS policies de tablas con Realtime habilitado sean STABLE o IMMUTABLE.

Fix aplicado: `ALTER FUNCTION current_doctor_id() STABLE` (migration `20260518200001_*`).

## Bugs activos (no resueltos)

### Criticidad alta — bombas de tiempo
- [ ] **`appointment_at` desfasada 6h (Honduras UTC-6)** — severidad BAJA hoy (ningun flujo productivo lo usa), ALTA si algo nuevo lo empieza a usar. `create-appointment/index.ts:217` y `update-appointment/index.ts:151` construyen ISO string sin offset. Postgres timestamptz asume UTC. **Fix minimo:** agregar `-06:00` o usar Luxon con `zone: 'America/Tegucigalpa'`. Migracion datos opcional.
- [ ] **`confirmation_message_sent` nunca se marca true** — en `create-appointment/index.ts` linea ~410, falta `UPDATE appointments SET confirmation_message_sent = true` despues de `gatewayResult.success`. Mensajes SI se envian.

### Criticidad media
- [ ] **Cita huerfana sin `appointment_at`** — bot crashea. Caso Kensi Nicol Carcamo (Consultorio Familiar, 24 Mar). Hay rama del bot-handler que crea citas sin timestamp. Localizar y arreglar.
- [ ] **Estado `reagendar` huerfano en DB** — no esta en types pero existe en tabla. Decidir: agregar al type o normalizar.
- [ ] **Paciente +50433899824 en booking_select_hour hace 1 semana** — verificar timeout de sesiones.

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

### Soporte numeros internacionales (Junio+)
- [ ] `normalizeToLocalHN()` en whatsapp-inbound-webhook — deja de asumir 8 digitos HN
- [ ] `findPatientByPhone()` en bot-handler — deja de forzar +504
- [ ] UI ingreso pacientes — validacion numeros extranjeros
- Caso: Mirian Yanira Zelaya Carias (+14794030090, USA) — recibe recordatorios OK, bot no funciona. No urgente.

### Diferido Junio 2026+
- FAQ auto-poblado (3 capas: onboarding data + templates por especialidad + deteccion gaps)
- Flujo "DEMO" en el bot (cuando reciba "DEMO" dar contexto guiado)

### Storage media retention — implementar ~Jul 2026 (cuando lleguemos a 5-10 clientes)

Sprint 4 abre la puerta a que el bucket `conversation-media` crezca sin freno. A 1 cliente es ~150 MB/mes. A 100 clientes proyectado ~180 GB acumulados en 12 meses ($1.70/mes extras de storage Supabase Pro). Manejable pero crece sin parar.

**Plan a implementar (1 sesion de ~3h cuando llegue el momento):**

1. **Cron diario: retencion 90 dias para multimedia outbound + inbound.**
   - Query `message_logs` WHERE `media_url IS NOT NULL AND created_at < NOW() - INTERVAL '90 days'`
   - Borrar archivo del bucket `conversation-media`
   - NULLear `media_url` en la row (preservar el `body` o `transcription` como rastro)
   - Edge function nueva: `cleanup-old-media`, scheduled via pg_cron

2. **Borrar audios inbound post-transcripcion a los 7 dias.**
   - Sprint 2 ya transcribe audios con Whisper a `message_logs.transcription`
   - A los 7 dias, borrar el audio del bucket (la transcripcion queda)
   - La asistente sigue leyendo el texto — nadie oye audios de >7 dias en practica

3. **Cron semanal: cleanup huerfanos.**
   - Si upload OK pero `sendMessage` falla a mitad → archivo queda en bucket sin referencia
   - Listar archivos en bucket que no tengan match en `message_logs.media_url` ni `messages.media_url`
   - Borrarlos

**NO implementar antes** porque a 1-3 clientes el costo es $0 y la complejidad introducida no se justifica.

**Comunicacion a clientes** (incluir en onboarding cuando se implemente): "Los archivos del inbox se conservan 90 dias. Si necesitas guardar algo importante, descargalo."

**Trigger para activar este trabajo:** cuando MRR > $300 o tengamos >5 clientes pagos usando inbox activamente.

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

## Proximos pasos (alineado con estado-estrategia)

| Dia | Trabajo |
|---|---|
| **Mar 19 (hoy)** | ✅ Sprint 4 codigo (quick replies + multimedia). Pendiente QA in-vivo con Demo Bot. |
| Mie 20 | QA Sprint 4 + Sprint 5 (promos del mes) arranque |
| Jue 21 - Vie 22 | Sprint 5 finalizar + Sprint 6 (Calling API) arranque |
| Sab 23 | QA full. Configurar Torre Zafiro en DB. |
| Lun 25 | Instalacion Torre Zafiro modo inbox-only |
| 25 May - 1 Jun | Solo bug fixes de lo que Dulce encuentre en uso real |

## Sprint 4 — Archivos modificados/creados (19 May)

### Nuevos
- `src/lib/quickRepliesApi.ts` — CRUD tipado quick_replies
- `src/hooks/useQuickReplies.ts` — hook con `{ onlyActive }` opcional
- `src/lib/conversationMediaUpload.ts` — upload archivos a bucket `conversation-media` con validacion cliente
- `src/pages/QuickRepliesPage.tsx` — admin de plantillas
- `src/components/inbox/QuickReplyPicker.tsx` — popover en composer

### Modificados
- `src/App.tsx` — ruta `/configuracion/quick-replies` + lazy import
- `src/pages/ConfiguracionMedico.tsx` — entry "Respuestas rápidas" en settings
- `src/components/inbox/MessageComposer.tsx` — picker + 3 inputs file + handler upload (acepta prop `organizationId`)
- `src/components/inbox/ConversationDetail.tsx` — pasa `organizationId` al composer via `useCurrentUser`

### NO tocado (deliberado)
- `MessageBubble.tsx` — palomitas siguen funcionando
- `inbox-send` edge function — acepta el flujo tal cual desde Sprint 2

### Validacion automatizada hecha
- `npx tsc --noEmit` pasa sin errores (2 corridas: post Fase 2 + post Fase 5)

### QA in-vivo pendiente (Diego)
Ver checklist completo en `.claude/plans/las-palomitas-ya-est-n-squishy-steele.md` seccion "Verificación / QA".
