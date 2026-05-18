# Plan MVP — Centro de Atencion OrionCare

> Creado: 18 May 2026
> Pivot de "bot que reemplaza" a **"centro de atencion que potencia a la asistente"**.
> Target MVP: 13 Jul 2026 (instalacion Mendoza el 14-20 Jul).

---

## Por que pivotamos (tesis)

### Senales del mercado (triangulacion)

1. **Paredes (Medilaser, 17 May):** pidio devolver su numero. Razon: "los pacientes nos llaman via WhatsApp". Sin llamadas = deal-breaker. Numero devuelto.
2. **Mendoza (sabado 16 May, instalacion NO ejecutada):** rechazo modelo "2 numeros" (ya lo probaron, pacientes se confunden). Rechazo perder llamadas. Dejo abierto: vuelvo 30 May con solucion completa.
3. **Dulce (Torre Zafiro, asistente champion):** se asusto cuando entendio que la dejabamos "ciega" del WhatsApp. El WhatsApp **ES** su trabajo, no es algo que ceder.

### Conclusion

El modelo "el bot toma el numero principal" es **estructuralmente incompatible** con el ICP unico (asistente champion en edificio medico). La asistente no puede quedar ciega. Las llamadas WhatsApp no son negociables.

### Solucion habilitada por tecnologia

WhatsApp Business Calling API esta en **General Availability** (Meta Cloud API directo, NO via Twilio). Permite:

- **Inbound:** llamadas del paciente al numero del negocio = **GRATIS**
- **Outbound:** llamadas del negocio al paciente = por minuto, 6 segundos increments, ~$0.01-0.05/min Honduras (estimado, confirmar dashboard Meta)
- **Honduras disponible** (no esta en restringidos: USA, Canada, Egipto, Vietnam, Nigeria)

Estimacion costo llamadas por clinica/mes: **~$1-3** (80% inbound gratis, 20% outbound trivial).

### El nuevo pitch

> "Tu asistente se duplica. Durante el dia ella maneja todo desde una sola pantalla — mensajes, llamadas, agenda, promociones. Cuando ella cierra, el bot atiende a los pacientes que escriben tarde. Las llamadas siguen llegandole a ella, **en la misma plataforma**."

### Dato critico estrategico

Dulce confirmo que **otro medico de Torre Zafiro espera ver resultados de Mendoza** antes de implementar. Significa: 1 instalacion buena = puerta a 5 medicos del edificio. Justifica el costo de calidad del MVP.

---

## Scope — 3 tiers

### TIER 1 — MUST HAVE (11 features, sin esto no se instala Mendoza)

| # | Feature | Notas |
|---|---|---|
| 1 | **Inbox unificado** | Lista convos + detalle + responder, estados (bot/humano/cerrado), marcar leido/no-leido |
| 2 | **Bot dual mode** | Handoff bidireccional, pausar bot por conversacion, devolver al bot |
| 3 | **Llamadas WhatsApp** | Inbound al inbox, outbound con permission template, softphone basico, historial, llamada perdida visible |
| 4 | **Agenda integrada al inbox** | Ver agenda del paciente al lado, crear/reagendar desde la conversacion (ya existe, conectar) |
| 5 | **Notificaciones simples** | Sonido + badge + Web Push del browser |
| 6 | **Plantillas de respuesta rapida** | Direccion, formas de pago, horarios, requisitos pre-cita por tipo (ayuno 8h, tomar agua resonancia, etc.) |
| 7 | **Promociones del mes** | Panel + bot responde + expira + notif renovar. Diferenciador unico (Mendoza insight). |
| 8 | **Estado envio mensajes** | Palomitas WhatsApp (enviado/entregado/leido) |
| 9 | **Adjuntar archivos** | Imagen + PDF (recibir y enviar) |
| 10 | **Transcripcion automatica de audios** | Whisper API. Honduras manda muchos audios. Asistente lee texto en 5s en vez de escuchar 30s. ~$0.30/cliente/mes. |
| 11 | **Login backup asistente** | 1 asistente principal + 1 backup pasivo. Solo asegurar multi-user login. |

### TIER 2 — SHOULD HAVE (6 features, entra si llegamos antes Jul 13)

| # | Feature | Notas |
|---|---|---|
| 12 | Etiquetas + busqueda | Filtrar por nuevo/recurrente/VIP, buscar por nombre/telefono/contenido |
| 13 | Modo "fuera de oficina" | Bot 100% cuando asistente cierra, copy distinto |
| 14 | Notas privadas por paciente | "Alergico a X", "llego tarde 2 veces" |
| 15 | Sugerencia de respuesta AI | Bot ve contexto + agenda + promos → draft suggested, asistente confirma con 1 click. Reduce trabajo ~60%. Claude Haiku ~$0.50-2/cliente/mes. |
| 16 | Detector de urgencia auto | Clasificacion urgente/agendar/reagendar/consulta/queja. Filtro en inbox. |
| 17 | Historial paciente al abrir | "Ultima cita: X, proxima: Y, no-shows: Z" — contexto rapido |

### TIER 3 — POST-MVP (Julio+, iterar con feedback real)

- Broadcast/anuncios masivos (compliance Meta complejo)
- Mensaje encolado al doctor (esperar a que 3+ clinicas lo pidan)
- Reportes avanzados
- Multi-doctor avanzado en inbox
- Sync Google Calendar externo
- Cobros/links de pago (esteticas)
- App movil nativa
- Multi-canal (Instagram DM, email, SMS)

---

## Arquitectura tecnica

### Schema DB (nuevas tablas)

```sql
-- Conversaciones (entidad principal del inbox)
CREATE TABLE conversations (
  id uuid PK,
  clinic_id uuid FK,
  patient_id uuid FK (nullable - paciente puede no estar registrado todavia),
  patient_phone text NOT NULL,
  patient_name text (cache),
  status text CHECK IN ('bot_active', 'human_active', 'closed', 'pending'),
  assigned_to uuid FK users (nullable),
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  unread_count int DEFAULT 0,
  tags text[],
  urgency text CHECK IN ('low', 'normal', 'high'),
  notes text (privado, solo clinica),
  created_at, updated_at
);

-- Mensajes unificados (TODOS los inbound + outbound, no solo bot)
CREATE TABLE messages (
  id uuid PK,
  conversation_id uuid FK,
  clinic_id uuid FK,
  direction text CHECK IN ('inbound', 'outbound'),
  source text CHECK IN ('patient', 'bot', 'assistant', 'template'),
  message_type text CHECK IN ('text', 'audio', 'image', 'document', 'voice_call', 'system'),
  content text,
  transcription text (para audios),
  media_url text,
  media_mime text,
  whatsapp_message_id text UNIQUE (de Meta),
  status text CHECK IN ('pending', 'sent', 'delivered', 'read', 'failed'),
  sent_by uuid FK users (nullable, NULL si bot),
  call_duration_seconds int (para voice_call),
  call_direction text (inbound/outbound),
  metadata jsonb,
  created_at
);

-- Promociones del mes (feature #7)
CREATE TABLE promotions (
  id uuid PK,
  clinic_id uuid FK,
  title text NOT NULL,
  description text NOT NULL,
  conditions text,
  image_url text (opcional),
  keywords text[] (palabras que detecta el bot: "promo", "oferta", "descuento", etc.),
  service_type_id uuid FK (opcional, vinculada a servicio especifico),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  status text CHECK IN ('active', 'expired', 'archived', 'draft'),
  created_by uuid FK users,
  created_at, updated_at
);

-- Plantillas de respuesta rapida (feature #6)
CREATE TABLE quick_replies (
  id uuid PK,
  clinic_id uuid FK,
  category text (direccion, horarios, pago, pre_cita, post_cita, otro),
  title text NOT NULL,
  content text NOT NULL,
  service_type_id uuid FK (opcional, vinculada a tipo de cita: "ayuno antes de exam X"),
  created_at, updated_at
);
```

### Componentes nuevos

1. **Meta Cloud API webhook handler** (existe parcial, extender)
   - Persiste TODOS los inbound en `messages` (no solo los que el bot procesa)
   - Crea/actualiza `conversations` por telefono+clinica
   - Refresca `last_message_at`, `unread_count`
   - Dispara realtime event

2. **Bot dual mode controller**
   - Antes de procesar mensaje: chequea `conversations.status`
   - Si `human_active` → NO responder (silencio)
   - Si `bot_active` → procesar normal
   - Handoff: cambiar status + notificar asistente

3. **Transcripcion service** (feature #10)
   - Cuando llega audio: descargar de Meta Media API → enviar a Whisper API → guardar en `messages.transcription`
   - Async via Edge Function

4. **Calling integration** (feature #3)
   - Webhook handler para eventos de llamada (incoming, accepted, ended)
   - Almacenar en `messages` con `message_type='voice_call'`
   - UI softphone usa WebRTC para audio en browser
   - Outbound: requiere call permission template enviado antes

5. **Frontend inbox** (componente nuevo)
   - `/inbox` route
   - Lista de `conversations` ordenadas por `last_message_at` desc
   - Filtros: urgentes, agendar, todos
   - Detalle: timeline de `messages` con renderers por tipo
   - Input para responder (text/audio/file)
   - Lateral: ficha paciente (agenda + notas)

6. **Realtime** (Supabase channels)
   - Channel por clinica: `clinic:{clinic_id}`
   - Eventos: `new_message`, `message_status_update`, `conversation_updated`, `incoming_call`
   - Suscripcion en frontend al login

7. **Web Push notifications** (feature #5)
   - Service worker registra subscription
   - Edge function envia notif al recibir mensaje (si la pestana no esta focused)

### Reuso de codigo existente

- Bot V2 (Sprint 1 completado): se mantiene como motor de respuestas. Solo se agrega chequeo de `conversation.status='bot_active'` antes de responder.
- Agenda: ya existe. Solo se conecta a sidebar del detalle de conversacion.
- Recordatorios: sin cambios.
- Auth multi-user: ya existe (clinic_users), validar que cubre el caso backup asistente.

---

## Cronograma 9 semanas

| Semana | Fechas | Trabajo | Output |
|---|---|---|---|
| 1 | 19-25 May | Diseno tecnico final + schema migrations + mockups UI inbox | Doc tecnico aprobado, schema desplegado en branch |
| 2 | 26 May - 1 Jun | Backend: webhook handler persiste TODO inbound, tabla conversations/messages | Endpoints POST/GET, tests basicos |
| 3 | 2-8 Jun | Backend: bot dual mode controller, handoffs, transcripcion audios | Bot respeta `human_active`, audios transcritos |
| 4 | 9-15 Jun | Frontend: inbox UI (lista + detalle + responder) | Vista inbox funcional con datos reales |
| 5 | 16-22 Jun | Frontend: plantillas quick replies + promociones panel + notificaciones | Panel promos + plantillas + notif sonido/push |
| 6 | 23-29 Jun | Calling API: webhook eventos, softphone WebRTC, permission templates | Llamadas inbound/outbound funcionando |
| 7 | 30 Jun - 6 Jul | Dogfooding interno: Diego + Warhol responden Wilmer/Medilaser desde inbox | Lista de 10-15 bugs reales encontrados |
| 8 | 7-13 Jul | Bug fixes prioritarios + pilot Medilaser (Marleny entra al inbox) | Marleny usando inbox 1 semana sin quejas |
| 9 | 14-20 Jul | Instalacion Mendoza Torre Zafiro | MVP en produccion con cliente premium |

**Buffer:** 0. Cronograma asume 4-5h/dia consistente. Si capacidad cae, se sacrifica Tier 2 primero, luego features Tier 1 menos criticos (transcripcion saltaria a Agosto).

---

## Pricing nuevo (3 tiers)

| Plan | Precio | Para |
|---|---|---|
| **Grandfathered** | $40-75/mes (precio actual) | Los 4 clientes existentes (Wilmer, Yeni, Medilaser, Ecoclinicas) — buena fe |
| **Base** | $60/mes | Clientes nuevos desde Julio. Incluye centro atencion completo + ~50 llamadas outbound/mes |
| **Pro** | $85/mes | Clinicas multi-doctor o alto volumen. Llamadas ilimitadas, promos ilimitadas, dashboards. |

**Justificacion:** aumento por VALOR (chat + llamadas + agenda + bot + promos), no por costo. Costo variable real estimado: ~$8-13/mes. Margen ~80% a $60.

**Math business plan actualizada:** 100 clientes × $60 = $6,000 (vs 175 × $40 = $7,000). Mas alcanzable, mismo margen.

---

## Decisiones de comunicacion

| Stakeholder | Que comunicar | Cuando |
|---|---|---|
| **Dulce (Torre Zafiro)** | "Encontre que la solucion correcta es mas grande de lo que vi el sabado. Vuelvo el 14-20 Jul con centro completo, no con un parche." | 28-29 May (10 dias antes del 30 May que ella espera) |
| **Paredes (Medilaser)** | Sin accion ahora. Numero devuelto. En Jul se le ofrece pilot interno del inbox antes que clientes nuevos. | Cuando empiece dogfooding semana 7 |
| **Resto pipeline (Hernandez, Escarleth)** | NO contactar hasta tener MVP. Las 6 demos del 12-14 May quedan pausadas. | Post-instalacion Mendoza |
| **Clientes existentes** | Comunicacion proactiva en semana 7-8: "estamos lanzando una nueva version con inbox + llamadas. Para uds, sin costo adicional este ano." | Semana 7-8 (dogfooding) |

---

## Riesgos y mitigaciones

| Riesgo | Severidad | Mitigacion |
|---|---|---|
| Capacidad Diego cae a <3h/dia | CRITICO | Check-in viernes semanal. Si <20h reales, sacrificar Tier 2 primero. |
| Calling API tarifa Honduras mas alta de lo estimado | MEDIO | Confirmar en dashboard Meta semana 1. Si >$0.10/min, ajustar pricing a $70 base. |
| Pacientes con WhatsApp viejo no reciben llamadas Business Calling | MEDIO | Investigar % adopcion WhatsApp updated en Honduras. Fallback: asistente puede llamar via celular si paciente no recibe. |
| Mendoza/Dulce no espera 7 semanas y se desencanta | ALTO | Llamada 28-29 May con propuesta clara + envio de mockups visuales para que vean lo que viene. |
| Pilot Medilaser revela bugs criticos que retrasan Mendoza | ALTO | Buffer semana 8 dedicada solo a bugs. Si grave, Mendoza se mueve a 21-27 Jul. |
| Cumplimiento Meta para call permission templates es complicado | BAJO | Investigar semana 1 (task #7), tener plantilla aprobada antes de codear feature #3. |

---

## Decisiones pendientes pre-implementacion

1. **Tarifa exacta Honduras outbound** — confirmar en dashboard Meta (task #5)
2. **Call permission templates** — diseno UX + aprobacion Meta (task #7)
3. **Tier 2 alcanzable?** — re-evaluar semana 5 segun avance real
4. **Pricing comunicacion a clientes existentes** — texto del email/llamada cuando se lance
5. **Migracion clientes actuales:** ¿Wilmer y Yeni necesitan inbox desde dia 1 del MVP o pueden seguir con el bot puro?

---

## Tareas activas (ver TaskList completo)

- #4 Llamar Dulce 28-29 May reagendar Mendoza
- #5 Confirmar tarifa Honduras dashboard Meta
- #6 Disenar pricing 3 tiers (parcialmente hecho aqui)
- #7 Investigar call permission templates Honduras
- #8 Disenar feature "Promociones del mes" (parcialmente hecho aqui)
- #9 Disenar arquitectura tecnica MVP (este doc)

---

## Referencias

- Memoria: [meta-cloud-api-directo](/.claude/projects/.../memory/feedback_meta_cloud_api_directo.md)
- ICP unico: [icp-individual-fuera](/.claude/projects/.../memory/feedback_icp-individual-fuera.md)
- Hito paz mental: [hito-paz-mental](/.claude/projects/.../memory/project_hito-paz-mental.md)
- Estado bot Sprint 1: `.claude/memory/estado-dev.md`
- Plan humanizacion bot anterior: `.claude/plans/bot-humanizacion.md`
- Docs Meta Calling API: https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing/
