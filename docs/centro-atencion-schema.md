# Centro de Atencion — Schema DB

> Sprint 0 — MVP Centro de Atencion. Creado: 18 May 2026.
> Plan: `.claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md`.
> Plan sprints: `.claude/plans/centro-atencion-sprints.md`.

## Resumen

Sprint 0 introduce **4 tablas nuevas** y **extiende 1 tabla existente** (`message_logs`). Tambien crea un **storage bucket** privado para media y una **funcion helper** generica para `updated_at`.

Migrations aplicadas (orden estricto por dependencias FK):

| # | Archivo | Que hace |
|---|---|---|
| 1 | `20260518120001_*_helper_set_updated_at.sql` | Funcion generica `set_updated_at()` para triggers |
| 2 | `20260518120002_*_service_types.sql` | Tabla `service_types` + migracion JSONB |
| 3 | `20260518120003_*_conversations.sql` | Tabla `conversations` (entidad del inbox) |
| 4 | `20260518120004_*_promotions.sql` | Tabla `promotions` (FK a service_types) |
| 5 | `20260518120005_*_quick_replies.sql` | Tabla `quick_replies` (FK a service_types) |
| 6 | `20260518120006_*_message_logs_extend.sql` | ALTER `message_logs` con 9 columnas |
| 7 | `20260518120007_*_storage_bucket.sql` | Bucket `conversation-media` + RLS |

## ERD (relaciones)

```
                    ┌──────────────────┐
                    │  organizations   │
                    │  (existente)     │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────────────────────┐
        │                    │                                    │
        │                    │                                    │
┌───────▼────────┐  ┌────────▼─────────┐                  ┌───────▼──────────┐
│    clinics     │  │  whatsapp_lines  │                  │      users       │
│  (existente)   │  │   (existente)    │                  │   (existente)    │
│                │  │                  │                  │                  │
│                │  │ bot_service_     │                  │                  │
│                │  │   types JSONB    │                  │                  │
│                │  │  (legacy)        │                  │                  │
└───┬────────────┘  └──┬───────────────┘                  └───┬──────────────┘
    │                  │                                      │
    │                  │ (migrada a)                          │ assigned_to/sent_by
    │                  ▼                                      │
    │            ┌─────────────────────────────────┐         │
    └───────────►│         service_types ★          │         │
                 │  organization_id, clinic_id,     │         │
                 │  whatsapp_line_id,               │         │
                 │  name, display_name, aliases[],  │         │
                 │  duration_minutes                │         │
                 └────┬─────────────────┬───────────┘         │
                      │                 │                     │
        ┌─────────────▼──┐   ┌──────────▼───────┐             │
        │  promotions ★  │   │ quick_replies ★  │             │
        │                │   │                  │             │
        │  service_type_id, clinic_id,          │             │
        │  title, description, valid_from/to,   │             │
        │  status, keywords[]                   │             │
        └────────────────┘   └──────────────────┘             │
                                                              │
                  ┌──────────────────┐    ┌────────────────┐  │
                  │  patients         │    │ conversations ★│  │
                  │  (existente)      │◄───┤                │  │
                  │  patient_id NULL  │    │ whatsapp_line, │◄─┘
                  └───────────────────┘    │ patient_phone, │
                                           │ patient_id NULL,│
                                           │ status, urgency,│
                                           │ assigned_to    │
                                           └───┬────────────┘
                                               │
                                               │ (1-to-many)
                                               ▼
                                  ┌─────────────────────────┐
                                  │  message_logs           │
                                  │  (existente, EXTENDIDA) │
                                  │                         │
                                  │  + conversation_id      │
                                  │  + source               │
                                  │  + message_type         │
                                  │  + transcription        │
                                  │  + media_url/mime       │
                                  │  + call_duration_*      │
                                  │  + call_direction       │
                                  │  + sent_by              │
                                  └─────────────────────────┘

★ = tabla nueva creada en Sprint 0
```

## Detalle por tabla

### `service_types` (nueva)

Normaliza `whatsapp_lines.bot_service_types` JSONB. Cada servicio (botox, resonancia, limpieza dental) es un row.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| organization_id | UUID NOT NULL FK | -> organizations |
| clinic_id | UUID NULL FK | -> clinics (opcional, multi-clinica) |
| whatsapp_line_id | UUID NULL FK | -> whatsapp_lines (origen del dato) |
| name | TEXT NOT NULL | clave normalizada lowercase: "botox" |
| display_name | TEXT NOT NULL | mostrar al usuario: "Botox" |
| aliases | TEXT[] DEFAULT {} | sinonimos: ["botulina"] |
| duration_minutes | INTEGER NULL | preserva el dato del JSONB |
| is_active | BOOLEAN DEFAULT true | |
| display_order | INTEGER DEFAULT 0 | |
| created_at, updated_at | TIMESTAMPTZ | trigger |

**Indices:**
- `(organization_id, is_active)` para listing activos
- `(clinic_id)` parcial
- `(whatsapp_line_id)` parcial
- `UNIQUE(organization_id, name)`

**Migracion data:** la migration extrae cada `{name, duration_minutes}` del JSONB, normaliza name a lowercase, y inserta. Filtra rows sin name. `ON CONFLICT DO NOTHING` para idempotencia. El JSONB queda intacto (bot-handler dejara de leerlo en Sprint 1).

### `conversations` (nueva)

Entidad principal del inbox. **UNIQUE(whatsapp_line_id, patient_phone)** garantiza 1 conversacion por linea+paciente.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID NOT NULL FK | |
| whatsapp_line_id | UUID NOT NULL FK | |
| patient_phone | TEXT NOT NULL | paciente puede no estar registrado |
| patient_id | UUID NULL FK | -> patients (NULL si nuevo) |
| patient_name | TEXT NULL | cache, llenar cuando se sabe |
| status | TEXT NOT NULL DEFAULT 'bot_active' | bot_active, human_active, closed, pending |
| assigned_to | UUID NULL FK | -> users (asistente que tomo) |
| last_message_at | TIMESTAMPTZ DEFAULT now() | para ordenar inbox |
| last_inbound_at | TIMESTAMPTZ NULL | ultimo inbound del paciente |
| unread_count | INTEGER DEFAULT 0 | mensajes sin leer |
| tags | TEXT[] DEFAULT {} | etiquetas custom |
| urgency | TEXT DEFAULT 'normal' | low/normal/high |
| notes | TEXT NULL | privado de la clinica |
| created_at, updated_at | TIMESTAMPTZ | trigger |

**Indices:**
- `(organization_id, status, last_message_at DESC)` para listar inbox
- `(assigned_to)` parcial para "mis conversaciones"
- `(patient_id)` parcial
- `(organization_id, unread_count > 0)` parcial para no leidos
- `(organization_id, urgency = 'high')` parcial para urgentes

### `promotions` (nueva)

Promociones del mes. Diferenciador descubierto en Mendoza.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID NOT NULL FK | |
| clinic_id | UUID NULL FK | |
| service_type_id | UUID NULL FK | -> service_types (filtrar por servicio) |
| title | TEXT NOT NULL | "Botox 30% off este mayo" |
| description | TEXT NOT NULL | |
| conditions | TEXT NULL | "valido hasta agotar existencias" |
| image_url | TEXT NULL | path en storage |
| keywords | TEXT[] DEFAULT {} | triggers extra: "oferta", "descuento" |
| valid_from, valid_to | DATE NOT NULL | CHECK valid_to >= valid_from |
| status | TEXT DEFAULT 'draft' | draft, active, expired, archived |
| created_by | UUID NULL FK | -> users |
| created_at, updated_at | TIMESTAMPTZ | trigger |

### `quick_replies` (nueva)

Plantillas de respuesta rapida (direccion, horarios, requisitos pre-cita).

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| organization_id | UUID NOT NULL FK | |
| clinic_id | UUID NULL FK | |
| service_type_id | UUID NULL FK | -> service_types (ej: "requisitos resonancia") |
| category | TEXT NOT NULL | direccion/horarios/pago/pre_cita/post_cita/otro |
| title | TEXT NOT NULL | "Direccion clinica" |
| content | TEXT NOT NULL | el texto a enviar |
| display_order | INTEGER DEFAULT 0 | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | trigger |

### `message_logs` (EXTENDIDA)

ALTER agrega 9 columnas nullable. NO rompe queries existentes (recordatorios, templates). Query inbox: `WHERE conversation_id IS NOT NULL`.

| Columna nueva | Tipo | Notas |
|---|---|---|
| conversation_id | UUID NULL FK | -> conversations (NULL para recordatorios legacy) |
| source | TEXT NULL CHECK | patient/bot/assistant/template/system |
| message_type | TEXT NOT NULL DEFAULT 'text' CHECK | text/audio/image/document/voice_call/system |
| transcription | TEXT NULL | Whisper la llenara en Sprint 2 |
| media_url | TEXT NULL | path en storage o URL Meta |
| media_mime | TEXT NULL | "image/jpeg", "audio/ogg" |
| call_duration_seconds | INTEGER NULL | para voice_call |
| call_direction | TEXT NULL CHECK | inbound/outbound |
| sent_by | UUID NULL FK | -> users (cuando source=assistant) |

**Indices nuevos:**
- `(conversation_id)` parcial
- `(conversation_id, created_at DESC)` parcial — query timeline conversacion
- `(message_type)` parcial — filtrar no-text

## Helper: `set_updated_at()`

Funcion generica que se aplica como trigger BEFORE UPDATE en las 4 tablas nuevas. No se aplica a `bot_faqs` (esa tiene la suya). Reemplaza el patron especifico-por-tabla por uno generico reusable.

## Storage bucket: `conversation-media`

- **Privado** (public=false)
- **Limite tamaño:** 25 MB por archivo
- **MIME types permitidos:** imagenes (jpeg/png/webp/gif), audios (ogg/mpeg/mp4/webm/aac/m4a), PDFs
- **Path convention:** `{organization_id}/{conversation_id}/{filename}`
- **RLS:** 4 policies (select/insert/update/delete) basadas en path foldername[1] = organization_id del usuario

## RLS pattern (igual para las 4 tablas nuevas)

```
SELECT: organization_id IN get_user_organizations(auth.uid())
INSERT: organization_id IN get_user_organizations(auth.uid())  (WITH CHECK)
UPDATE: organization_id IN ... (USING + WITH CHECK)
DELETE: has_role(auth.uid(), 'admin'::app_role)
```

**Helpers reusados** (existen en main desde 13 Feb 2026):
- `public.get_user_organizations(uuid)` — retorna SETOF UUID de las orgs activas del user
- `public.has_role(uuid, app_role)` — boolean si user tiene rol en cualquier org
- `public.has_org_role(uuid, uuid, app_role)` — boolean si user tiene rol en org especifica

**Service role bypasa RLS:** las edge functions (`bot-handler`, futuros `inbox-*`) usan `SUPABASE_SERVICE_ROLE_KEY` que omite RLS. Validar este path en Sprint 1.

## Decisiones tomadas

1. **Extender `message_logs` vs crear tabla `messages` nueva:** extender. Recordatorios y conversaciones conviven. Menos duplicacion de logica de webhook.
2. **Crear tabla `service_types` ahora:** normalizar `bot_service_types` JSONB. JSONB queda intacto para que bot-handler no rompa hasta Sprint 1.
3. **Storage bucket en Sprint 0:** Sprint 1-2 lo usan sin re-trabajar.
4. **NO migrar data historica de `message_logs` a conversaciones:** mensajes viejos sin `conversation_id`. Pure forward-only.
5. **`set_updated_at()` generica:** reemplazo del patron especifico-por-tabla.

## Verificacion post-apply

```sql
-- Estructura
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('service_types','conversations','promotions','quick_replies');
-- esperado: 4 rows

-- Columnas nuevas message_logs
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='message_logs'
  AND column_name IN ('conversation_id','source','message_type','transcription',
                      'media_url','media_mime','call_duration_seconds',
                      'call_direction','sent_by');
-- esperado: 9 rows

-- Service types migrados
SELECT COUNT(*) FROM public.service_types;
-- esperado: >= 18 (suma de bot_service_types JSONB)

-- RLS habilitada
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('service_types','conversations','promotions','quick_replies');
-- esperado: rowsecurity=true para los 4

-- Policies count
SELECT tablename, COUNT(*) FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('service_types','conversations','promotions','quick_replies')
GROUP BY tablename;
-- esperado: 4 policies por tabla = 16 total

-- Storage bucket
SELECT id FROM storage.buckets WHERE id='conversation-media';
-- esperado: 1 row
```

## Riesgos / things to watch

1. **Migracion JSONB → service_types puede crear nombres duplicados** si dos lineas de la misma org tienen el mismo `name`. `ON CONFLICT DO NOTHING` evita el error pero pierde la segunda ocurrencia. Investigar post-apply si hay datos perdidos.
2. **Trigger `set_updated_at()` con SECURITY DEFINER:** revisado, no expone privilegios — solo escribe `now()` en NEW.
3. **`message_logs.message_type` con DEFAULT 'text':** rows existentes obtienen 'text'. Correcto para mensajes legacy.
4. **Storage bucket RLS por path UUID parsing:** si el `name` (path) no inicia con UUID valido, `foldername[1]::uuid` falla. Validar que el frontend siempre genera path correcto en Sprint 1-2.

## Proximos pasos (Sprint 1)

- Extender `bot-handler/index.ts` para persistir TODOS los inbound en `message_logs` con `conversation_id` lleno
- Helper `getOrCreateConversation(line, phone)` en `_shared/`
- Helper `persistInboundMessage`/`persistOutboundMessage`
- Bot dual mode: chequear `conversations.status` antes de responder
- Endpoint `inbox-send` para responder desde plataforma
