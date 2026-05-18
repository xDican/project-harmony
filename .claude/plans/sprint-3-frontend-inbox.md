# Sprint 3 — Frontend Inbox (MVP Centro de Atencion)

> Creado: 18 May 2026 PM
> Mockups Stitch aprobados. Detalles a extrapolar: transcripcion debajo del audio player + variante "Tu atendiendo" del header.
> Backend Sprint 1+2 funcionando — endpoints `inbox-send`, `inbox-handoff`, `inbox-return-bot` ya deployados y validados.

## Contexto

Sprint 1+2 dejaron el backend funcionando: conversaciones, mensajes con `conversation_id`, multimedia con Storage, transcripcion automatica, bot que procesa audios. **Pero todo eso esta invisible** — la asistente no puede ver ni interactuar.

Sprint 3 construye el `/inbox` frontend: pantalla donde Dulce/Marleny ve conversaciones, lee transcripciones, toma cuando hace falta. **Es la primera vez que el cliente ve el resultado del pivot**.

## Decisiones tomadas (con Diego)

1. **Layout responsive:** 2 columnas desktop (lista + detalle), 1 columna mobile (lista → detalle full-screen con back button).
2. **Realtime: lista + detalle.** Mensajes nuevos aparecen sin refresh, conversaciones suben en la lista, badge unread actualiza.
3. **Sonido + badge en sprint 3.** Web Push se queda para Sprint 5.
4. **Stitch genero mockups visuales aprobados.** Extrapolo en codigo: agregar transcripcion debajo de audio player + variante "Tu atendiendo".
5. **Filtros: tabs estado (Todos/No leidos/Bot/Humano) + buscador cliente-side.** Urgencia se agrega en Sprint 4 cuando el bot la pueble.
6. **NO usar React Query.** Aunque esta instalado, el patron dominante del repo es `useEffect` + estado local. Mantener consistencia.
7. **Composer adjuntar = solo UI dropdown en Sprint 3.** Upload real de archivos a Storage es Sprint 4.

## Decisiones tecnicas adicionales

- **Realtime channel scope:** `clinic:{organization_id}`. Filtra por org del user activo (NO todas las orgs si tiene varias).
- **Mobile detection:** CSS-only con Tailwind responsive (`lg:hidden`, `lg:block`). JS detection (`window.innerWidth`) solo para 1-2 comportamientos especificos como navegacion programatica back/forward.
- **Audio player:** custom simple (play button + barra de progreso + duracion), NO controls HTML5 nativos. Para coincidir con mockup limpio.
- **Confirmation dialog "Devolver al bot":** shadcn `AlertDialog` con texto "Esta seguro? La conversacion volvera al bot automatico".
- **Optimistic updates:** al enviar mensaje, agregar a timeline localmente con estado "enviando" antes de respuesta del endpoint.
- **Idempotencia realtime:** usar `id` del mensaje para deduplicar (evitar mostrar 2 veces si llega via realtime Y via refetch).

## Scope del Sprint (7 fases, ~25h)

### Fase 1 — Estructura base + routing + layout (~3h)

**Archivos nuevos:**
- `src/pages/Inbox.tsx`
- `src/components/inbox/InboxLayout.tsx` (envoltorio responsive)

**Modificados:**
- `src/App.tsx` (o donde sean las routes): agregar `<Route path="/inbox" element={<RoleBasedRoute roles={['admin','secretary']}><Inbox /></RoleBasedRoute>}>` (lazy)
- `src/components/MainLayout.tsx`: agregar NavLink "Bandeja" al sidebar con icono Inbox + badge unread

**Detalles:**
- Mobile: si no hay convo seleccionada, mostrar solo lista. Si hay seleccionada, mostrar solo detalle con back button.
- Desktop: siempre 2 columnas. Si no hay seleccionada, columna detalle muestra empty state.
- Estado activo de la selected conv en URL: `/inbox/:conversationId` (react-router) o query param `?conv=uuid`. Voto: path param para deeplinking.

### Fase 2 — Lista de conversaciones (~5h)

**Archivos nuevos:**
- `src/hooks/useConversations.ts`
- `src/components/inbox/InboxList.tsx`
- `src/components/inbox/ConversationListItem.tsx`
- `src/components/inbox/InboxFilters.tsx`

**`useConversations(orgId, filter)`:**
- SELECT conversations WHERE organization_id = orgId ORDER BY last_message_at DESC
- Filter por status: 'all' | 'unread' | 'bot_active' | 'human_active'
- LIMIT 50 (paginacion infinita en Sprint 4 si necesario)
- Re-fetch on focus o cada 60s como fallback de realtime
- Devuelve: `{ conversations, isLoading, error, refetch, counts }` donde counts es `{ all, unread, bot, human }`

**`ConversationListItem`:**
- Props: `conversation`, `isSelected`, `onClick`
- Avatar con foto del paciente (si patient_id) o iniciales del patient_name
- Nombre del paciente (negrita si unread_count > 0)
- Telefono pequeno gris
- Preview ultimo mensaje (1 linea, truncar con ...). Si message_type='audio'/'image'/'document', mostrar icono + label en vez de texto. Para audio si hay transcripcion, usar transcripcion.
- Hora a la derecha (formato adaptativo: "5 min", "1 hora", "Ayer", "Lun", "12 may")
- Badge unread count si > 0 (circulo verde con numero)
- Border lateral izquierdo verde fino si status='human_active'
- Fondo verde-claro si isSelected

**`InboxFilters`:**
- Tabs shadcn con conteo: "Todos (45)", "No leidos (12)", "Bot atiende (30)", "Humano atiende (3)"
- Input search con icono lupa, placeholder "Buscar paciente o telefono..."
- Search es client-side: filtra `conversations` ya cargadas por nombre o telefono (case-insensitive, sin tildes)

### Fase 3 — Detalle de conversacion: timeline + composer (~7h)

**Archivos nuevos:**
- `src/hooks/useConversationMessages.ts`
- `src/components/inbox/ConversationDetail.tsx`
- `src/components/inbox/MessageBubble.tsx`
- `src/components/inbox/AudioMessagePlayer.tsx`
- `src/components/inbox/MessageComposer.tsx`
- `src/lib/inboxActions.ts` (helpers que llaman edge functions)

**`useConversationMessages(conversationId)`:**
- SELECT message_logs WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 100
- Para mas, paginacion hacia arriba (load older) — Sprint 4 si llega
- Marcar como leido al abrir: UPDATE conversations SET unread_count=0

**`ConversationDetail`:**
- Header:
  - Avatar + nombre paciente + telefono
  - Badge status: "BOT ATIENDE" (gris-verde) o "TÚ ATENDIENDO" (verde mas fuerte, posiblemente con icono persona)
  - Boton derecho:
    - Si bot_active: "Tomar conversacion" (verde primary)
    - Si human_active: "Devolver al bot" (outline, con AlertDialog confirm)
  - Boton ficha paciente (icono documento) — abre Sheet lateral con info paciente + agenda (Sprint 4 implementa la Sheet completa, en Sprint 3 solo dejar el boton sin funcionalidad o un Sheet basico con datos)
  - Dots menu (...) para acciones extra (por ahora vacio o "Marcar como leido")
- Timeline central scrolleable:
  - Auto-scroll al ultimo mensaje al cargar o al recibir nuevo
  - Separadores de fecha entre mensajes ("Hoy", "Ayer", "Mar 15 mayo")
  - Cada mensaje renderizado con `MessageBubble`
  - Empty state si no hay mensajes (raro, pero pasaria con conv recien creada)
- Composer (fija al pie):
  - `MessageComposer` component

**`MessageBubble`:**
- Props: `message`, `isPatient` (derived from source='patient')
- Layout:
  - source='patient': burbuja blanca a la izquierda
  - source='bot': burbuja verde-claro a la derecha + etiqueta arriba "ASISTENTE VIRTUAL" + icono robot
  - source='assistant': burbuja verde-oscuro a la derecha + etiqueta arriba "TÚ" o nombre del user
- Renderer por message_type:
  - **text:** body en parrafo
  - **audio:** `<AudioMessagePlayer>` con `media_url` + `transcription` debajo
  - **image:** thumbnail clickable (abre Dialog modal con imagen full + boton descargar)
  - **document:** Card con icono PDF/doc + nombre archivo + boton descargar
  - **voice_call:** placeholder "Llamada de voz - duracion 0:32" (Sprint 6 implementa el full UI)
- Footer del bubble: hora + palomitas (para outbound: ✓ sent, ✓✓ delivered, ✓✓ azul read)
- Para outbound source='assistant' Y sent_by != current_user: mostrar "Por {nombre del otro user}" pequeno (caso backup asistente)

**`AudioMessagePlayer`:**
- Custom UI: boton play/pause + barra de progreso + tiempo actual / duracion
- HTML5 `<audio>` interno con src de `media_url` (path Storage)
- Llamar a `supabase.storage.from('conversation-media').createSignedUrl(path, 3600)` para obtener URL servible
- Debajo del player:
  ```
  📝 Transcripción: "Hola, queria saber..."
  ```
  Texto en gris secundario, italic opcional, label claro de que es automatica.
- Si `transcription` es null (todavia procesando o fallo), mostrar: "📝 Transcribiendo..." con spinner pequeno
- Caching: la signed URL dura 1h, refrescar si el componente sigue activo despues

**`MessageComposer`:**
- Textarea expandible (rows 1, grows up to 5)
- Boton clip (adjuntar) con DropdownMenu shadcn: Imagen, Audio, Documento (estos solo abren input file en Sprint 3, pero NO suben — Sprint 4 implementa upload completo)
- Boton enviar (verde, icono avion). Disabled si textarea vacia.
- Hint inferior si conversation.status === 'bot_active': "Al escribir, tomarás control del chat"
- Submit con Enter (Shift+Enter para nueva linea)
- Al enviar: llamar `inboxActions.sendMessage({ conversationId, body })` → edge function `inbox-send`
- Optimistic: agregar mensaje al timeline localmente con status 'sending', actualizar a 'sent' tras respuesta

**`inboxActions.ts`:**
```ts
export async function sendMessage(args: { conversationId: string; body?: string; mediaUrl?: string; messageType?: string })
export async function takeConversation(conversationId: string)
export async function returnToBot(conversationId: string)
```
Cada uno wrappea `supabase.functions.invoke()` con tipos correctos.

### Fase 4 — Tomar / Devolver al bot (~2h)

**Modificar:** `src/components/inbox/ConversationDetail.tsx` (header buttons)

- Boton "Tomar conversacion" (visible cuando status='bot_active'):
  - Click → `inboxActions.takeConversation(convId)` → UPDATE conversations.status='human_active', assigned_to=auth.uid()
  - Optimistic update local: cambiar status, cambiar badge, swap boton
- Boton "Devolver al bot" (visible cuando status='human_active'):
  - Click → abrir shadcn AlertDialog: "¿Devolver esta conversacion al bot? El bot automatico volvera a responder."
  - Confirmar → `inboxActions.returnToBot(convId)` → UPDATE status='bot_active', assigned_to=null
- Auto-handoff: ya implementado en `inbox-send` backend. Si la asistente responde en bot_active, status cambia. Frontend solo refleja el cambio (via realtime o re-fetch).

### Fase 5 — Realtime Supabase channels (~4h)

**Archivos nuevos:**
- `src/hooks/useRealtimeInbox.ts`
- `public/notification.mp3` (asset pequeno de sonido, ~5KB)

**`useRealtimeInbox(orgId, callbacks)`:**
- En `useEffect`, subscribe a channel `clinic:{orgId}`
- Filter para events postgres_changes en tablas:
  - `conversations` filter `organization_id=eq.{orgId}` (events: INSERT, UPDATE)
  - `message_logs` filter `organization_id=eq.{orgId}` (events: INSERT, UPDATE)
- Callbacks:
  - `onNewMessage(message)`: actualizar timeline si convId activo. Reproducir sonido si no es del user actual Y document.hidden=false. Si document.hidden, sumar a queue para notificar al volver.
  - `onConversationUpdate(conversation)`: actualizar item en lista
  - `onNewConversation(conversation)`: agregar a top de lista
- Cleanup en unmount: `channel.unsubscribe()`
- Reconexion: supabase-js maneja automatico, pero log warnings

**Sonido:**
- Web Audio API o `<audio>` HTML5 con `notification.mp3` (~250ms, ding suave)
- Mute si `document.hidden`
- Mute si el mensaje es outbound (envia el user, no necesita confirmar)

**Test:**
- Diego abre /inbox, otra ventana manda mensaje al demo bot, verifica que aparezca sin refresh + suena

### Fase 6 — Marcar como leido + badge global (~2h)

**Archivos modificados:**
- `src/components/MainLayout.tsx`: agregar Badge en NavLink "Bandeja"

**Archivos nuevos:**
- `src/hooks/useUnreadCount.ts`

**`useUnreadCount(orgId)`:**
- SELECT COUNT(*) FROM conversations WHERE organization_id=? AND unread_count > 0
- Re-fetch cada 30s + on realtime conversation update
- Devuelve numero

**Marcar como leido al abrir conv:**
- En `useConversationMessages`, despues de cargar mensajes, UPDATE conversations.unread_count=0 WHERE id=?
- Si el componente se cierra antes de UPDATE, ignorar (no critico)

**Badge en sidebar:**
- Si count > 0, mostrar circulo verde con numero al lado del icono Inbox
- Si count > 99, mostrar "99+"

### Fase 7 — Polish + estados edge (~2h)

- Skeleton loaders (`<Skeleton>` shadcn) en lista (6 items) y timeline (4 mensajes)
- Empty state lista: "No hay conversaciones aun. Cuando un paciente escriba, aparecera aqui."
- Empty state detalle (no conv seleccionada): "Selecciona una conversacion para ver los mensajes"
- Empty state timeline (conv sin mensajes — raro): "No hay mensajes en esta conversacion"
- Error states: `sonner` toast con mensaje + retry button
- Composer:
  - Loading state: spinner en boton enviar
  - Error: toast "No se pudo enviar el mensaje" + mantener texto en textarea
- Responsive testing: Chrome devtools mobile (iPhone 12, Pixel 5) + smaller breakpoint (320px)
- Validar Safari iOS audio player (suele tener quirks)

---

## Critical files

### Nuevos (a crear)

```
src/pages/Inbox.tsx
src/components/inbox/
  InboxLayout.tsx
  InboxList.tsx
  InboxFilters.tsx
  ConversationListItem.tsx
  ConversationDetail.tsx
  MessageBubble.tsx
  AudioMessagePlayer.tsx
  MessageComposer.tsx
src/hooks/
  useConversations.ts
  useConversationMessages.ts
  useRealtimeInbox.ts
  useUnreadCount.ts
src/lib/inboxActions.ts
public/notification.mp3
```

### Modificados

```
src/App.tsx (o donde estan las routes)  — agregar lazy /inbox
src/components/MainLayout.tsx  — NavLink Inbox + badge unread
```

### NO se tocan

- `src/integrations/supabase/types.ts` — types ya regenerados en Sprint 0
- Edge functions backend — todas funcionando
- Otros pages — Inbox es feature aislada

---

## Reuso de codigo existente

| Componente | Ubicacion | Uso en Sprint 3 |
|---|---|---|
| `useCurrentUser()` | context | obtener user.id + organizationId activo |
| `MainLayout` | components | wrapper donde se agrega NavLink Inbox |
| `RoleBasedRoute` | components | proteger /inbox para admin/secretary |
| shadcn components | `@/components/ui/*` | Avatar, Badge, Button, Card, Input, Textarea, Tabs, ScrollArea, Tooltip, Sheet, Dialog, AlertDialog, Skeleton, DropdownMenu |
| sonner toast | ya instalado | errores y confirmaciones |
| `supabase` client | `@/integrations/supabase/client` | queries + realtime |
| `supabase.functions.invoke()` | supabase-js | llamar inbox-send/handoff/return-bot |

---

## Estimaciones por fase

| Fase | Trabajo | Estimado |
|---|---|---:|
| 1 | Estructura base + routing + layout | 3h |
| 2 | Lista de conversaciones | 5h |
| 3 | Detalle: timeline + composer | 7h |
| 4 | Tomar / Devolver al bot | 2h |
| 5 | Realtime Supabase channels | 4h |
| 6 | Marcar leido + badge global | 2h |
| 7 | Polish + estados edge | 2h |
| **Total** | | **25h** |

Con capacidad de Diego (4-5h/dia, 5 dias) = ~1 semana calendar. Coincide con plan original Sprint 3 (9-15 Jun).

---

## Verificacion end-to-end

### Smoke tests por fase

**Tras Fase 2 (lista):**
- Login Diego → ir a /inbox → ver lista de conversaciones existentes (Demo Bot conv con audios + Maria Lopez, etc.)
- Filtros funcionan (cambiar tab, conteos correctos)
- Buscador filtra

**Tras Fase 3 (detalle):**
- Click conversation → ver timeline con mensajes reales
- Audio del paciente: player funciona, transcripcion visible debajo
- Escribir mensaje en composer → boton enviar → mensaje llega al WhatsApp de Diego, aparece en timeline
- Bot dual mode visual: status badge cambia tras enviar (auto-handoff)

**Tras Fase 4 (handoff):**
- Boton "Tomar" → status cambia, badge "TÚ ATENDIENDO"
- Boton "Devolver al bot" + confirm → status vuelve a bot_active
- Diego manda otro mensaje al bot desde su WhatsApp → bot responde correctamente

**Tras Fase 5 (realtime):**
- Diego abre /inbox en navegador
- Desde otra ventana (o su celular), manda mensaje al demo bot
- En /inbox: timeline actualiza sin refresh + lista mueve conv arriba + suena ding
- Mover a pestana diferente y mandar mensaje → no suena (document.hidden)

**Tras Fase 6 (badge):**
- Mandar 3 mensajes nuevos al demo bot
- En MainLayout sidebar, badge "3" al lado de "Bandeja"
- Abrir conv → badge baja a 0

**Tras Fase 7 (polish):**
- Refrescar /inbox con conexion lenta → ver skeletons
- Cerrar conexion supabase → toast de error + retry visible
- iPhone Safari: audio reproduce ok

### Tests RLS (heredados de Sprint 1)

- User de Wilmer NO ve conversaciones de Medilaser
- secretary y admin de misma org ven mismas conversaciones (multi-user)

---

## Riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---:|
| Realtime con Supabase tiene edge cases (mensajes duplicados, reconexion) | ALTA | Idempotencia client-side por message.id. Cleanup correcto en useEffect. Validar con simulacion network drop. |
| Audio Safari iOS no reproduce / quirks | MEDIA | Probar temprano (Fase 3). Si problema serio, usar fallback `<audio controls>` nativo. |
| Mobile layout se rompe en pantallas pequenas (<360px) | MEDIA | Tailwind responsive desde el inicio. Testing en Pixel 5 + iPhone SE. |
| Signed URLs de Storage no funcionan o expiran rapido | BAJA | Generar al renderizar el bubble, no en lista. Refrescar si componente sigue activo. |
| Performance lista con 500+ conversaciones | BAJA | Limit 50 inicial. Paginacion infinite scroll en Sprint 4 si necesario. |
| `useConversationMessages` re-fetch infinito por bucle de dependencias | MEDIA | useEffect con deps `[conversationId]` solo. Test con dev tools React profiler. |
| Realtime envia tantos eventos que UI se vuelve lenta | BAJA | Throttle/debounce updates a la lista. 60 mensajes/min es manejable. |

---

## Decisiones pendientes (resolver durante implementacion)

1. **Avatar fallback:** si patient no tiene foto, usar iniciales (ya planeado). ¿Color de fondo por nombre o todos verdes? Voto: hash del nombre → color de paleta de 8 colores.
2. **Path Storage en frontend:** signed URL o public URL? Bucket es privado → signed URL. Token expira 1h. ¿Caching local? Voto: nuevo signed URL cada render del bubble es OK (es barato).
3. **Mobile detail back button:** ¿history.back() o navigate(`/inbox`)? Voto: navigate("/inbox") explicito.
4. **Outbound del bot vs assistant:** ambos verdes pero con etiqueta distinta. ¿Mismo tono de verde o variantes? Voto: misma tonalidad, distinguir SOLO por etiqueta + (para assistant) sent_by user name.
5. **Confirmation devolver al bot:** AlertDialog vs Toast con accion "Deshacer". Voto: AlertDialog, mas explicito.

---

## Proximos pasos (Sprint 4)

Cuando Sprint 3 termina:
- Composer con upload real de archivos (drag&drop + multipart)
- Pagina settings/quick-replies (CRUD plantillas)
- Insertar quick_reply en composer con "/"
- Filtro de urgencia en lista (bot empieza a poblar urgency='high')
- Web Push notifications

Sprint 3 deja: asistente puede VER + RESPONDER + TOMAR + DEVOLVER conversaciones desde plataforma. Suficiente para dogfooding interno (Sprint 7) y mostrarle a Dulce en la visita post-MVP.
