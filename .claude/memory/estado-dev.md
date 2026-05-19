# Estado Desarrollo — OrionCare

> Ultima actualizacion: 19 May 2026 PM (Sprint 5 + 5.1 ✅ cerrados — Promociones del mes con matching escalonado, FAQ override, destacada del mes, matcheo natural. QA SQL aprobado por Diego.)
> Historico sprints + bugs resueltos en `estado-dev-historial.md`

---

## Fase actual

**Sprints 4-8 MVP Centro de Atencion** (19 May - lanzamiento Torre Zafiro 25 May modo inbox-only, bot activacion gradual desde 8 Jun).

Plan: `.claude/plans/centro-atencion-mvp.md` + `.claude/plans/centro-atencion-sprints.md` + `.claude/plans/las-palomitas-ya-est-n-squishy-steele.md` (Sprint 4 + 5 detalle)

## Sprints MVP — estado

| Sprint | Estado | Highlights |
|---|---|---|
| 0 — Schema | ✅ 18 May | 4 tablas + bucket Storage + RLS + 17 service_types migrados |
| 1 — Persistencia + bot dual mode | ✅ 18 May | 5 functions deployadas, conversation tracking |
| 2 — Multimedia + transcripcion | ✅ 18 May | Whisper español, audios ~3s, $0.002 total |
| 3 — Frontend Inbox | ✅ 18 May 23:30 | InboxContext realtime una-fuente-verdad. Bug fix VOLATILE RLS |
| 4 — Quick replies + multimedia outbound | ✅ 19 May | Pagina settings + picker composer + upload archivos. Bugs fixeados: timeline en convs >100 msgs + busqueda con acentos. |
| **5 — Promociones del mes** | ✅ 19 May | Panel admin + bot integration con scoring/keywords + FAQ override + destacada del mes. Cron diario lifecycle. Magic bytes validation para imagenes. Matcheo natural en promo_browse. |
| 6 — Calling API | proximo | Webhooks calls.* + UI inbox llamadas + softphone WebRTC |
| 7-8 — Pilot + lanzamiento | revisar | Decision 19 May: inbox-only 1 sem en Torre Zafiro |

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
| Mar 19 (hoy) | ✅ Sprint 4 + Sprint 5 + Sprint 5.1 cerrados |
| Mie 20 | Arrancar Sprint 6: Calling API (webhooks inbound + UI llamadas inbox + softphone WebRTC) |
| Jue 21 - Vie 22 | Sprint 6 finalizar |
| Sab 23 | QA full inbox-only. Configurar Torre Zafiro en DB. |
| Dom 24 | Bug fixes finales. Briefing operativo. |
| **Lun 25** | **INSTALACION Torre Zafiro — inbox-only, bot OFF, calling OFF** |
| 25 May - 1 Jun | Solo bug fixes de lo que Dulce encuentre en uso real |

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
