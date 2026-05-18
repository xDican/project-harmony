# Plan de Sprints — MVP Centro de Atencion (Tier 1)

> Creado: 18 May 2026
> Complementa: `.claude/plans/centro-atencion-mvp.md` (vision y scope)
> Target final: Mendoza usando OrionCare 20 Jul 2026

## Capacidad de Diego

- **4.5h promedio/dia × 5 dias/sem = 22.5h/sem**
- **9 semanas calendar = ~200h totales**
- Sprints estimados en horas, no en story points

## Resumen visual (Gantt)

```
Semana | Sprint        | Foco                        | Horas
-------|---------------|----------------------------|------
1      | S0 Foundation | Schema + migrations         | 15h
2      | S1 Backend    | Persistencia + bot dual     | 25h
3      | S2 Media      | Transcripcion + adjuntos    | 22h
4      | S3 Inbox UI   | Frontend lista + detalle    | 25h
5      | S4 Responder  | Reply + quick replies       | 22h
6      | S5 Extras     | Promos + agenda + push      | 22h
7      | S6 Llamadas   | Calling API + softphone     | 25h
8      | S7 Dogfood    | Pilot interno + bugs        | 25h
9      | S8 Mendoza    | Instalacion Torre Zafiro    | 25h
                                                    -------
TOTAL                                                 ~206h
```

Capacidad disponible: ~202h. **Margen: 0%.** Si capacidad cae <20h en cualquier semana, se sacrifica Tier 2 (no entra al MVP).

---

## SPRINT 0 — Foundation Schema (Semana 1, 19-25 May)

**Objetivo:** Schema desplegado en branch Supabase. Sin codigo de UI todavia.
**Tiempo estimado:** 15h
**Por que es corto:** sin diseno de schema solido, los 8 sprints siguientes pierden tiempo refactorizando.

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S0.1 | Disenar schema final (papel + revision) — `conversations`, `messages`, `promotions`, `quick_replies`. Decidir indices, FKs, cascades. | 3h | Doc con CREATE TABLE listos |
| S0.2 | Branch Supabase nuevo (`feat/centro-atencion`) | 0.5h | Branch creada con `mcp__supabase__create_branch` |
| S0.3 | Migration 1: `conversations` + indices + RLS | 1.5h | Migration aplicada, `list_tables` confirma |
| S0.4 | Migration 2: `messages` unificada + indices + RLS. Migracion soft de `message_logs` actuales no se hace — coexisten. | 2h | Migration aplicada, schema validado |
| S0.5 | Migration 3: `promotions` + indices + RLS + FK `service_type_id` | 1h | Migration aplicada |
| S0.6 | Migration 4: `quick_replies` + indices + RLS | 0.5h | Migration aplicada |
| S0.7 | TypeScript types regen (`generate_typescript_types`) | 0.5h | `src/integrations/supabase/types.ts` actualizado |
| S0.8 | Validar RLS policies: usuario clinic_user solo ve su clinica. Pruebas SQL `auth.uid()`. | 2h | 4 policies validadas con tests SQL |
| S0.9 | Trigger update_at automatico en las 4 tablas | 0.5h | Trigger aplicado y validado |
| S0.10 | Documentar schema en `docs/centro-atencion-schema.md` con ERD ASCII | 1.5h | Doc creado |
| S0.11 | Plan tecnico semana 2 (S1) afinado | 2h | Doc revisado, checklist S1 listo |

### Decisiones técnicas a cerrar este sprint

- **Coexistencia con `message_logs` existente:** mantener ambas tablas. `message_logs` sigue para recordatorios/confirmaciones. `messages` es para conversaciones inbox. NO migrar data historica al inicio (post-MVP si se necesita).
- **Coexistencia con `bot_conversation_logs`:** mantener. Es log de transiciones de estado del bot, no de mensajes. Sigue util para analisis.
- **`conversations.patient_id` nullable:** porque pacientes nuevos pueden escribir antes de estar en BD.
- **Estados en TEXT vs ENUM:** usar TEXT con CHECK constraint (mas flexible para iterar).

### Checkpoint final (Domingo 25 May)

- [ ] 4 tablas en branch Supabase
- [ ] RLS validadas
- [ ] Types regenerados
- [ ] Doc schema escrito
- [ ] **DECISION:** ¿merge a main o seguir en branch otro sprint?

---

## SPRINT 1 — Persistencia + Bot Dual Mode (Semana 2, 26 May - 1 Jun)

**Objetivo:** Backend procesa TODOS los mensajes y los persiste en `messages`/`conversations`. Bot respeta estado `human_active`.
**Tiempo estimado:** 25h
**Riesgo:** webhook handler tiene logica compleja (intents, FAQ, estados bot). Hay que no romper.

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S1.1 | Leer y mapear webhook handler actual (`bot-handler/index.ts`) | 2h | Lista de puntos donde insertar persistencia |
| S1.2 | Edge function helper: `getOrCreateConversation(clinicId, phone)` | 2h | Test unitario verde |
| S1.3 | Edge function helper: `persistInboundMessage(conv, payload)` | 2h | Mensaje inbound persistido en `messages` |
| S1.4 | Edge function helper: `persistOutboundMessage(conv, content, source)` | 2h | Mensaje outbound persistido |
| S1.5 | Webhook handler: integrar persistencia ANTES de cualquier logica bot | 3h | Todo inbound persiste, no rompe flujo bot |
| S1.6 | Helper: `updateConversationState(convId, state, assigned)` | 1h | Estado transiciona correctamente |
| S1.7 | Bot dual mode: chequear `conversations.status` antes de responder | 2h | Si `human_active`, bot calla |
| S1.8 | Endpoint `POST /functions/v1/inbox-send` (enviar desde plataforma) | 3h | Mensaje sale a Meta API, persiste outbound |
| S1.9 | Endpoint `POST /functions/v1/inbox-handoff` (humano toma conversacion) | 1.5h | Estado cambia a `human_active`, bot calla |
| S1.10 | Endpoint `POST /functions/v1/inbox-return-bot` (devolver al bot) | 1h | Estado vuelve a `bot_active`, bot responde |
| S1.11 | Webhook handler eventos de delivery/read de Meta | 2h | `messages.status` actualiza a delivered/read |
| S1.12 | Tests integracion: simular conversacion completa | 2.5h | Test verde end-to-end |
| S1.13 | Deploy a branch + smoke test con demo bot | 1h | Demo bot funciona normalmente, mensajes en BD |

### Checkpoint final (Domingo 1 Jun)

- [ ] Persistencia de TODOS los mensajes funcionando
- [ ] Bot dual mode validado: handoff manual desde SQL detiene bot
- [ ] Endpoints REST listos para que frontend los use
- [ ] Demo bot opera normal (no regresion)

---

## SPRINT 2 — Multimedia + Transcripcion (Semana 3, 2-8 Jun)

**Objetivo:** Audios se transcriben automaticamente. Imagenes y PDFs inbound/outbound funcionan.
**Tiempo estimado:** 22h
**Riesgo:** Whisper API requiere descargar archivo de Meta primero. Latencia.

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S2.1 | OpenAI API key + secret en Supabase | 0.5h | `WHISPER_API_KEY` en secrets |
| S2.2 | Edge function `transcribe-audio` (descarga Meta media → manda a Whisper → guarda) | 4h | Audio test transcrito |
| S2.3 | Webhook handler: si tipo=audio, trigger async transcribe | 1.5h | Audio entra, transcription se popula en <30s |
| S2.4 | Helper: `downloadMetaMedia(mediaId)` con manejo de errores | 2h | Test verde |
| S2.5 | Helper: `uploadMetaMedia(file)` para outbound | 2h | Imagen sale a Meta API |
| S2.6 | Endpoint inbox-send acepta `attachment_url` (imagen, PDF) | 2h | Outbound con adjunto llega a WhatsApp |
| S2.7 | Webhook handler: persistir image/document/voice inbound con media_url | 2h | Mensajes con adjuntos persisten correcto |
| S2.8 | Validacion multi-user login: asistente backup puede entrar y ver inbox | 1h | Login con 2 usuarios distintos OK |
| S2.9 | Almacenamiento Supabase Storage: bucket `conversation-media` con RLS | 2h | Imagenes accesibles solo por clinica owner |
| S2.10 | Re-download estrategia: media de Meta expira en 30 dias. Copiar a Storage. | 2.5h | Job que copia media reciente a Storage |
| S2.11 | Tests integracion: audio + imagen + PDF inbound/outbound | 2h | Tests verdes |
| S2.12 | Deploy + smoke test | 0.5h | Demo bot opera, audios se transcriben |

### Checkpoint final (Domingo 8 Jun)

- [ ] Audio test transcrito a texto en <30s
- [ ] Imagen y PDF visibles en BD con media_url valido
- [ ] Multi-user login funcionando

---

## SPRINT 3 — Frontend Inbox Basico (Semana 4, 9-15 Jun)

**Objetivo:** Asistente puede VER mensajes y tomar conversaciones desde la plataforma. Sin responder todavia.
**Tiempo estimado:** 25h
**Riesgo:** Supabase realtime puede tener edge cases con reconexion.

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S3.1 | Route `/inbox` + layout basico (sidebar lista + main detalle) | 2h | Pagina renderiza con shadcn/ui |
| S3.2 | Hook `useConversations(clinicId)` con paginacion | 2h | Lista carga, paginacion funciona |
| S3.3 | Componente `<ConversationListItem>` (nombre, ultimo mensaje, hora, badge unread) | 2h | Item se renderiza, click selecciona |
| S3.4 | Filtros lista: "Todos / No leidos / Bot atiende / Humano atiende" | 2h | Filtros funcionan |
| S3.5 | Hook `useConversationMessages(convId)` con paginacion descendente | 2h | Timeline mensajes carga |
| S3.6 | Componente `<MessageBubble>` con renderers por tipo (text, image, audio+transcripcion, document, voice_call placeholder) | 4h | Mensajes se ven bien |
| S3.7 | Indicador estado conversacion (bot/humano/cerrado) en header detalle | 1h | Badge visible |
| S3.8 | Botones: "Tomar conversacion" + "Devolver al bot" | 2h | Click llama endpoint, estado cambia |
| S3.9 | Supabase Realtime: channel `clinic:{id}` con eventos `new_message`, `conversation_updated` | 3h | Mensaje nuevo aparece sin refresh |
| S3.10 | Auto-scroll al ultimo mensaje + indicador "X mensajes nuevos" | 1.5h | UX correcta |
| S3.11 | Marcar como leido al abrir conversacion | 1h | unread_count baja a 0 |
| S3.12 | Estado vacio + skeleton loading | 1.5h | UX pulida |
| S3.13 | Tests E2E basicos (Playwright si existe, sino smoke manual) | 1h | Pase verde |

### Checkpoint final (Domingo 15 Jun)

- [ ] Asistente puede entrar a `/inbox` y ver conversaciones reales
- [ ] Mensajes nuevos aparecen sin refresh
- [ ] Handoff manual funciona desde UI

---

## SPRINT 4 — Responder + Quick Replies (Semana 5, 16-22 Jun)

**Objetivo:** Asistente puede RESPONDER mensajes desde plataforma. Plantillas rapidas listas. Notificaciones basicas.
**Tiempo estimado:** 22h

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S4.1 | Componente `<MessageComposer>` con textarea + send button | 2h | Mensaje se envia, aparece en timeline |
| S4.2 | Adjuntar archivo (imagen, PDF) desde composer | 2.5h | Drag&drop + boton, sube a Storage, envia |
| S4.3 | Estados envio (loading → sent → delivered → read) visuales en mensaje propio | 2h | Palomitas WhatsApp-style |
| S4.4 | Schema `quick_replies` ya esta. CRUD endpoints en `inbox-quick-replies` edge function | 2h | GET/POST/PUT/DELETE funcionan |
| S4.5 | Pagina `/settings/quick-replies` (CRUD con shadcn) | 3h | Asistente puede crear/editar plantillas |
| S4.6 | Categorias: direccion, horarios, pago, pre_cita, post_cita, otro | 1h | Filtro funciona |
| S4.7 | Vinculacion plantilla con `service_type_id` (opcional para pre-cita) | 1.5h | Plantillas pre-cita filtran por tipo |
| S4.8 | Boton "/" en composer abre dropdown de plantillas, selecciona → inserta | 2.5h | UX rapida |
| S4.9 | Sonido al recibir mensaje nuevo (Web Audio API) | 1h | Suena tono corto |
| S4.10 | Badge contador unread en sidebar app (no solo inbox) | 1.5h | Visible globalmente |
| S4.11 | Indicador "escribiendo" cuando hay mensaje pendiente | 1.5h | Skip si complica — opcional |
| S4.12 | Tests E2E del flujo enviar → recibir delivery | 1.5h | Verde |

### Checkpoint final (Domingo 22 Jun)

- [ ] Asistente puede responder texto + adjuntos desde inbox
- [ ] Plantillas funcionan e insertan rapido
- [ ] Sonido + badge cuando llega mensaje

---

## SPRINT 5 — Promociones + Agenda + Web Push (Semana 6, 23-29 Jun)

**Objetivo:** Promociones del mes funcionando. Agenda visible en detalle conversacion. Notificaciones push del browser.
**Tiempo estimado:** 22h

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S5.1 | Pagina `/settings/promotions` (CRUD lista, formulario crear/editar) | 3h | UI funcional |
| S5.2 | Upload imagen promo a Supabase Storage bucket `promo-images` | 1.5h | Imagen visible en preview |
| S5.3 | Estado: active/expired/archived/draft. Cron diario: marca expired | 2h | Job ejecuta, promos viejas marcadas |
| S5.4 | Notif (mensaje + email) al asistente 3 dias antes de expirar | 2h | Notif llega a tiempo |
| S5.5 | Bot handler: detector keywords promos ("oferta", "promo", "descuento", "este mes") + servicio detectado | 3h | Bot responde con promo activa relevante |
| S5.6 | Bot handler: si paciente pregunta "¿que tienen este mes?" → lista todas activas | 1.5h | Respuesta correcta |
| S5.7 | Sidebar agenda paciente en detalle conversacion (proxima cita, ultima cita, total citas) | 3h | Sidebar visible |
| S5.8 | Boton "Crear cita" desde inbox → modal con formulario rapido | 3h | Cita se crea y vincula al paciente |
| S5.9 | Boton "Reagendar" / "Cancelar" desde sidebar cita | 1.5h | Acciones funcionan |
| S5.10 | Service Worker para Web Push notifications | 2h | SW registrado |
| S5.11 | Pedir permiso push al login + suscribir | 1.5h | Subscription guardada en BD |

### Checkpoint final (Domingo 29 Jun)

- [ ] Asistente crea promo, bot la responde a paciente test
- [ ] Sidebar agenda visible y funcional
- [ ] Web Push notifications llegan al browser

---

## SPRINT 6 — Llamadas WhatsApp (Semana 7, 30 Jun - 6 Jul)

**Objetivo:** Llamadas WhatsApp inbound y outbound funcionando en la plataforma.
**Tiempo estimado:** 25h
**Riesgo MAXIMO:** WebRTC en browser es complicado. Calling API es nueva. Si se atrasa aqui, MVP slip.

### Tareas

| # | Tarea | Horas | Output verificable |
|---|---|---:|---|
| S6.1 | Activar Calling API en Meta Business Manager para numero | 1h | API activa |
| S6.2 | Configurar webhook eventos llamadas en Meta | 1h | Eventos llegan |
| S6.3 | Webhook handler: eventos `call.connect`, `call.terminate`, `call.permission.update` | 3h | Eventos persisten en `messages` como voice_call |
| S6.4 | Call permission template aprobado por Meta (template approval ~24-48h) | 1h | Template aprobado |
| S6.5 | Endpoint `inbox-request-call-permission` envia template al paciente | 1.5h | Template llega a WhatsApp paciente |
| S6.6 | Endpoint `inbox-call-patient` inicia llamada outbound (post-permission) | 2h | Llamada saliente conecta |
| S6.7 | Frontend: componente `<Softphone>` (atender, colgar, mute) con WebRTC | 6h | UI funcional |
| S6.8 | Integracion Meta Calling SDK / SIP / WebRTC bridge (depende docs Meta) | 4h | Audio fluye |
| S6.9 | Llamada entrante: notif ringtone + popup en plataforma | 2h | Suena, popup aparece |
| S6.10 | Historial llamadas en timeline conversacion (duracion, hora, exitosa/perdida) | 2h | Visible en timeline |
| S6.11 | Llamada perdida: aviso + accion sugerida ("Devolver llamada" o "Mensaje") | 1.5h | Visible |
| S6.12 | Tests + smoke con numero real | 1h | Llamada real exitosa |

### Riesgo de slip

Si S6.7+S6.8 (WebRTC) supera 12h, **decision en miercoles del sprint:** entregar solo INBOUND llamadas (audio en browser, asistente atiende) en este sprint. OUTBOUND llamadas pasa a Sprint 7 o post-MVP. Inbound es 80% del valor.

### Checkpoint final (Domingo 6 Jul)

- [ ] Llamada inbound: paciente llama, asistente atiende en plataforma
- [ ] Llamada outbound: asistente devuelve llamada con permission template (si tiempo)
- [ ] Historial llamadas en timeline

---

## SPRINT 7 — Dogfooding interno + bug fixes (Semana 8, 7-13 Jul)

**Objetivo:** Diego + Warhol responden Wilmer/Medilaser desde el inbox durante 1 semana. Encontrar y fixear los 10-15 bugs reales que solo aparecen usandolo.
**Tiempo estimado:** 25h (dogfooding + fixes)

### Tareas (no granular — emergente)

| Bloque | Horas | Notas |
|---|---:|---|
| Lunes-Martes: setup pilot interno con Wilmer (mas safe que Medilaser) | 4h | Activar inbox para org de Wilmer |
| Lunes-Domingo: Diego + Warhol responden Wilmer desde inbox | 0h | Trabajo paralelo, no cuenta horas dev |
| Captura de bugs en `docs/dogfooding-bugs.md` | continuo | Lista priorizada |
| Bug fixes prioritarios (esperar ~10 bugs) | 12h | 30min-2h por bug |
| Performance: paginacion lista convos, lazy load imagenes | 3h | <500ms primer render |
| UX adjustments segun feedback Warhol | 4h | Cosas obvias |
| Pre-pilot Medilaser: review feature parity vs el bot puro actual | 2h | Confirmar no falta nada |

### Checkpoint final (Domingo 13 Jul)

- [ ] 1 semana completa de uso interno sin bug critico
- [ ] Performance aceptable (<500ms)
- [ ] Lista de fixes hecho

---

## SPRINT 8 — Mendoza Launch (Semana 9, 14-20 Jul)

**Objetivo:** Mendoza Torre Zafiro usando OrionCare en sitio. Dulce contenta. Otro medico de Torre Zafiro viendo resultados.
**Tiempo estimado:** 25h (mucho on-site + acompanamiento)

### Tareas

| Dia | Horas | Trabajo |
|---|---:|---|
| Lun 14 Jul | 5h | Pre-config Mendoza: 5-7 plantillas rapidas, 3-5 promos activas, FAQs base, servicios esteticos |
| Mar 15 Jul | 3h | Llamada Mendoza/Dulce: confirmar instalacion miercoles 16, alinear expectativas |
| Mier 16 Jul AM | 4h | **Instalacion en sitio Torre Zafiro** (similar al sabado 16 May original) |
| Mier-Vie | 6h | Acompanamiento dias 1-3: WhatsApp Dulce, ajustes pequenos, bug fixes en sitio |
| Sab-Dom | 7h | Hotfixes + monitoreo SQL + reporte estado a Dulce |

### Checkpoint final (Domingo 20 Jul)

- [ ] Mendoza opera con OrionCare 5+ dias
- [ ] Dulce reporta usabilidad positiva
- [ ] 0 incidentes criticos
- [ ] **DECISION:** ¿avanzar al siguiente medico de Torre Zafiro o consolidar 1-2 semanas?

---

## Reglas de juego si nos atrasamos

### Triggers de re-planning

- **Viernes de cualquier sprint sin >70% completo:** revisar scope, mover lo no critico
- **Capacidad real <18h/sem por 2 semanas consecutivas:** **MVP slip 1 semana**, comunicar a Dulce
- **Bug bloqueante >4h sin solucion:** consultar con ChatGPT/Gemini, pedir ayuda

### Que se sacrifica primero (orden de salida del scope)

1. Quick replies con vinculacion a service_type (S4.7) → simplificar a categoria libre
2. Transcripcion audios (S2.2-2.4) → diferir post-MVP, asistente escucha audios
3. Web Push (S5.10-5.11) → solo sonido + badge en pestana
4. Indicador "escribiendo" (S4.11) → quitar
5. Outbound llamadas (S6.6) → solo inbound

### Que NO se sacrifica

- Persistencia mensajes (S1) — core
- Inbox + handoff (S3) — core
- Llamadas inbound (S6 parcial) — deal-breaker resuelto
- Promociones del mes (S5.1-5.6) — diferenciador unico vendible

---

## Costos operativos del MVP (estimados/mes a 5 clinicas)

| Servicio | Costo | Notas |
|---|---:|---|
| Whisper API (transcripcion) | $2-5 | ~100 audios/clinica/mes × $0.006/min |
| Meta Calling outbound | $5-15 | ~100 llamadas outbound × 3 min × $0.03 |
| Supabase Storage (media) | $1-3 | Imagenes y audios |
| Supabase Realtime | incluido | Plan actual |
| Web Push | $0 | Self-hosted |
| **Total** | **$8-23** | Para 5 clinicas |

Costo variable por clinica/mes: ~$2-5. Margen a $60/cliente: ~85%.

---

## Decisiones a tomar antes de empezar

1. **¿Branch `feat/centro-atencion` o sub-branches por sprint?** Mi voto: una sola branch larga, merge al final del Sprint 7 (post-dogfooding). Permite testing integral.
2. **¿Pre-flight Calling API:** Diego pide activacion Meta esta semana? Tarda 24-48h aprobacion. Si esperamos al Sprint 6, podemos perder dias.
3. **¿Whisper o transcripcion local (Whisper.cpp en Deno)?** Mi voto: API. Mas simple, $0.30/cliente/mes es trivial.
4. **¿Cobramos a clientes existentes el inbox?** Mi voto: NO. Grandfathered. Es buena fe + caso de estudio.
5. **¿Activar promos del mes para Wilmer/Yeni (clinicas no esteticas)?** Mi voto: SI, opcional. No usaran, pero la feature existe. Mendoza/Medilaser si la usaran.

---

## Tareas a crear (1 por sprint, conforme lleguemos)

Por ahora solo crear `Sprint 0`. Cuando termine S0, crear S1. Asi mantenemos task list limpia y no se desincroniza con la realidad.
