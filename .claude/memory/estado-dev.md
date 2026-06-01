# Estado Desarrollo — OrionCare

> Ultima actualizacion: 1 Jun 2026 (Sprint Coexistence FASE A codeada. Plan revisado contra codigo — corregido hueco critico del item 2. Es la PRIORIDAD #1 del proyecto.)
> Historico sprints + bugs resueltos en `estado-dev-historial.md`
> Plan revisado + fases: `.claude/plans/trabajemos-en-el-coexistence-jaunty-toast.md`

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
- [x] **B3** ✅ (1 Jun, desplegado) — handler `smb_message_echoes` en `meta-webhook`. **Resuelve la visibilidad app→OrionCare:** mensajes que la asistente envia desde la WhatsApp Business App del celular se persisten como outbound (`source=assistant`) y aparecen en el inbox. Estructura confirmada contra doc oficial Meta (`change.value.message_echoes[]`, field `smb_message_echoes`). Idempotente por `provider_message_id` (NO duplica mensajes que OrionCare ya envio via API). Conversacion nueva por echo → `human_active`. Reusa `persistOutboundMessage` + `updateConversationOnOutbound`. **Media:** se guarda referencia `meta-media:<id>` sin descargar el archivo (texto/caption se ve perfecto; descargar archivos de echos = mejora futura). Echos historicos (durante sync) se persisten silenciosos sin reordenar el inbox.
  - **Mejora de B2 (mismo deploy):** el gate de historico ahora corta ANTES de `updateConversationOnInbound` → los mensajes historicos del flood YA NO inflan `unread_count` ni saltan la conversacion al tope (quedan realmente "silenciosos").
- [ ] **B4** — handler `smb_app_state_sync` (sync de contactos del celular).
- [x] **B5** ✅ (1 Jun, jobid 12) — watchdog pg_cron `coexistence-sync-watchdog`, **SQL puro cada 2 min** (no edge function — la logica es 1 UPDATE; SQL puro evita cold start/HTTP/auth y es mas confiable). Apaga `sync_in_progress` en lineas con >5 min sin mensajes historicos. Frecuencia */2 (no */1) por higiene de `cron.job_run_details`; el query es no-op casi siempre (tabla diminuta). Migration `20260601140000_coexistence_sync_watchdog.sql`. **Cierra el ciclo de B2: la bandera de sync ya se apaga sola.**
- [ ] **B6** — badge UI "Sincronizando historial" cuando `sync_in_progress=true`.

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
