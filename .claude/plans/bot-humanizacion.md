# Plan — Humanización del bot OrionCare (3 sprints)

> Creado: 2026-05-04
> Origen: análisis de 56 sesiones (V2 14-28 Abr) + diccionario de 2,357 mensajes históricos
> Diccionario fuente: `.claude/memory/diccionario-hondurenismos.md`
> Análisis fuente: `docs/analisis-bot-detalle-pacientes-14abr-28abr.md`

## Objetivo general

Que el bot procese lenguaje natural hondureño sin IA, manteniendo determinismo y bajo costo. Arquitectura de **2 capas**:

- **Capa universal** (estática, en código `_shared/honduras-intents.ts`): hondureñismos, intents top, parser de fechas/horas. ~50 frases. Estable.
- **Capa cliente** (dinámica, en DB `bot_faqs.keywords` + `bot_service_types.aliases`): vocabulario por especialidad. Crece sin deploy.

## Métricas baseline (V2 14-28 Abr, 4 clientes, 67 sesiones)

| Métrica | Baseline | Meta post Sprint 3 |
|---|---|---|
| Tasa éxito Medilaser | 31.5% | **>55%** |
| Tasa éxito Wilmer | 0% | **>40%** |
| Tasa éxito Yeni/CF | 40% | **>55%** |
| Tasa éxito agregada | 28.4% | **>50%** |
| Abandono en `cancel_confirm` | 70% | **<25%** |
| Opciones inválidas / total msgs | 22% | **<10%** |
| Confirmaciones explícitas perdidas | 8-15/quincena (Medilaser) | **0** |
| Sesiones donde bot responde FAQ incorrecto | ~5/quincena | **<1** |

## Cambios de DB consolidados (1 migración para todos los sprints)

```sql
-- Sprint 1: umbral configurable de FAQ
ALTER TABLE bot_faqs
  ADD COLUMN min_match_score numeric NOT NULL DEFAULT 1.0;

-- Sprint 2: aliases en service_types (jsonb existente, no requiere DDL)
-- Estructura nueva: { name, duration_minutes, aliases: ["sinonimo1", "sinonimo2"] }
-- La validación se hace en app, no en schema

-- Sprint 3: capturar vocabulario por defecto al crear cliente nuevo
-- (sin DDL, solo seed data por especialidad en código)
```

## Archivos involucrados (resumen)

| Archivo | Sprint | Acción |
|---|---|---|
| `supabase/functions/_shared/honduras-intents.ts` | 1 | Crear |
| `supabase/functions/_shared/datetime-parser.ts` | 2 | Crear |
| `supabase/functions/bot-handler/index.ts` | 1, 2, 3 | Modificar |
| `supabase/functions/meta-webhook/index.ts` | 1 | Modificar |
| `supabase/migrations/2026XXXX_bot_humanizacion.sql` | 1 | Crear |
| `src/pages/onboarding/StepServices.tsx` | 3 | Crear |
| `src/pages/onboarding/StepFAQs.tsx` | 3 | Crear |
| `src/pages/onboarding/OnboardingLayout.tsx` | 3 | Modificar |
| `src/lib/onboarding-templates-by-specialty.ts` | 3 | Crear |

---

# Sprint 1 — Capa universal + fixes técnicos (~9.5h)

> **Foco:** detener la sangría inmediata. Confirmaciones perdidas, abandono en cancel_confirm, botón "No puedo asistir" UX redundante, FAQs respondiendo incorrecto.

## Items

### 1.1 Crear `_shared/honduras-intents.ts` (3h)

Módulo central con 3 funciones públicas:

```ts
// Detecta intent top-level a partir de texto natural
detectIntent(text: string): {
  intent: 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'SOFT_NO'
        | 'BOOK_NEW' | 'FAQ' | 'HANDOFF' | 'ASK_MY_APPOINTMENT'
        | 'OUT_OF_SCOPE' | 'WRONG_NUMBER' | 'UNKNOWN';
  confidence: 'high' | 'medium' | 'low';
  matchedTerms: string[];      // qué keywords matchearon
  preamble?: string;             // "fíjese que..." extracted
  remainder?: string;            // texto después del preámbulo
}

// Normaliza typos comunes (sita→cita, presio→precio, etc.)
normalizeTypos(text: string): string

// Determina si el mensaje es solo un ack/cierre conversacional
isAcknowledgment(text: string): boolean
```

**Frases del diccionario a incluir (50 core):**
- CONFIRM: 15 (ahí estaré, primero dios, listo, sale pues, etc.)
- RESCHEDULE: 8 (no puedo asistir, no podre, mañana no puedo, etc.)
- CANCEL: 4 (cancelar, ya no, prefiero cancelar, etc.)
- SOFT_NO: 8 (yo aviso, ahí veo, lo pienso, cuando me decida, etc.)
- HANDOFF: 5 (secretaria, hablar con doctor, persona, etc.)
- BOOK_NEW: 3 (agendar, quiero cita, necesito cita)
- ASK_MY_APPOINTMENT: 4 (cuándo es mi cita, me confirma cuando, etc.)
- OUT_OF_SCOPE: 3 (video llamada, foto receta, virtual)

**Tests** (en `_shared/honduras-intents.test.ts`):
- 30+ frases reales del diccionario con intent esperado
- Casos límite: "siempre voy" (=CONFIRM, no RESCHEDULE), "yo aviso" (=SOFT_NO, no CONFIRM)
- Preámbulos: "fíjese que mañana no puedo" → preamble="fíjese que" + remainder="mañana no puedo" → intent=RESCHEDULE

### 1.2 Aplicar detector en handlers (2h)

Modificar 4 lugares en `bot-handler/index.ts`:

**`handleGreeting` (línea 549):** reemplazar el bloque de keyword matching directo (líneas 580-594) con `detectIntent(messageText)`. Mapear intents top a flujos:
- CONFIRM en greeting con cita pendiente → marcar appointment.status='confirmada' + responder "Confirmada con la Dra. X. Nos vemos [fecha]."
- RESCHEDULE → `startRescheduleFlow`
- BOOK_NEW → `startBookingFlow`
- HANDOFF → `handleHandoffToSecretary`
- FAQ → `searchFAQ`
- ASK_MY_APPOINTMENT → mostrar próxima cita activa
- SOFT_NO → escalación + nota "el paciente no está seguro"
- OUT_OF_SCOPE → mensaje claro + handoff
- WRONG_NUMBER → "Entendido, no le escribiremos más. ¿Es número equivocado? Saludos."

**`handleMainMenu` (línea 676):** mismo patrón. Reemplaza keyword matching con `detectIntent`.

**`handleCancelConfirm` (línea ~2000):** acepta CONFIRM/CANCEL/RESCHEDULE como texto libre además de números.

**`handleDirectReschedule` (línea 464):** **cambio clave** — en vez de retornar `nextState: 'cancel_confirm'` con menú de 3 opciones, ir directo a `booking_select_day` (flujo reagendar) con copy humano:

```
Antes:
"¿Que desea hacer con su cita? 1.Reagendar 2.Cancelar 3.Volver"

Después:
"Entendido, busquemos otra fecha para su cita con la Dra. Alejandra.
Si prefiere cancelar definitivamente, escriba *cancelar*.

📅 Seleccione la semana:
1. Esta semana
2. Próxima semana"
```

Y agregar check en `handleBookingSelectDay/Hour/Confirm`: si input incluye keyword CANCEL del detector → ejecutar cancelación.

### 1.3 Migración DB: umbral FAQ (30min)

```sql
ALTER TABLE bot_faqs
  ADD COLUMN min_match_score numeric NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN bot_faqs.min_match_score IS
  'Minimum match score for searchFAQ to return this FAQ. Default 1.0 = at least 1 keyword exact match. Set lower to allow fuzzier matches.';
```

### 1.4 Ajustar `searchFAQ` con umbral (30min)

`bot-handler/index.ts:2403`:

```ts
// Antes:
return bestScore > 0 ? bestMatch : null;

// Después:
const threshold = bestMatch?.min_match_score ?? 1.0;
return bestScore >= threshold ? bestMatch : null;
```

Esto fuerza al menos 1 keyword exacto. Si nada matchea bien, el bot responde "No tengo esa información. ¿Quiere hablar con la secretaria?" en vez de devolver FAQ aleatorio.

### 1.5 Bug `user_message=""` + dedupe handoffs (1h)

En `bot-handler/index.ts` `processMessage`:
```ts
// Al inicio del handler
if (!input.messageText || input.messageText.trim().length === 0) {
  // Sticker, audio, ubicación, otro contenido sin texto
  return {
    message: 'Recibí su mensaje pero no puedo procesar audios/imágenes/ubicaciones aún. Si necesita ayuda, escriba *secretaria*.',
    requiresInput: false,
    nextState: session.state,
    sessionComplete: false
  };
}
```

Y agregar dedupe de handoffs en `handleHandoffToSecretary`: si la última transición a `handoff_secretary` fue hace <5 segundos, no enviar segunda notificación.

### 1.6 Logging botón "Confirmar" (1h)

Pendiente desde 14 Abr. En `meta-webhook/index.ts:335-360` (flujo legacy de confirmación), agregar:
```ts
await supabase.from('bot_conversation_logs').insert({
  session_id: null, // legacy flow no tiene session
  organization_id: lineOrgId,
  patient_phone: fromPhone,
  user_message: body,
  bot_response: '✅ Cita confirmada',
  state_before: 'reminder_button',
  state_after: 'confirmed',
  intent: 'confirm_via_template',
  appointment_id: appointment.id,
});
```

Esto da observabilidad: cuántos pacientes confirman vía botón (hoy invisible en el dashboard del bot).

### 1.7 Bug logging de button_replies que van al bot (1h)

**Sintoma confirmado en investigación 4 May:**
- 23 mensajes "No puedo asistir" en `bot_conversation_logs` (V2 14-28 Abr)
- **0 mensajes contraparte en `message_logs`** (búsqueda flexible por phone+timestamp ±2 min)
- Históricamente: solo 2 inbounds "No puedo asistir" en toda la vida de message_logs vs 60 en bot_conversation_logs
- Confirmado por Diego: ambos templates (`recordatorio_v2_300326`, `recordatorio_sin_confirmar_300326`) tienen el botón "No puedo asistir" en Meta Business Manager

**Hipótesis:**
- `meta-webhook/index.ts:234-247` llama `logMessage` antes de `routeToBotHandler`, pero algo lo está saltando o fallando silenciosamente
- Posibilidades a investigar:
  - Duplicate detection (línea 200-210) disparándose erróneamente
  - `logMessage` fallando silently sin throw
  - `provider_message_id` colisión o NULL
  - Race condition entre webhook retries de Meta

**Acción:**
1. **Diagnóstico (30min):** agregar logs detallados antes/después de `logMessage` en ramas botEnabled. Deploy y verificar en Supabase logs cuál camino se está tomando. Cruzar con un test real (Diego presiona botón "No puedo asistir" en su WhatsApp con cita activa).
2. **Fix (30min):** según hallazgo:
   - Si es duplicate detection: ajustar lógica
   - Si es logMessage failing: agregar try/catch + retry con backoff
   - Si es race condition: usar upsert por `provider_message_id`

**Por qué importa:**
- Sin esto, el dashboard de adopción del bot está mintiendo (subreporta cancelaciones intent)
- Imposible medir impacto real del Sprint 1 en este botón si las respuestas no se loggean
- El mismo bug puede estar afectando otros button_replies (Reagendar via template, etc.)

**Validación post-fix:**
```sql
-- Después del fix, este número debe acercarse al de bot_conversation_logs
SELECT COUNT(*)
FROM message_logs
WHERE direction='inbound'
  AND raw_payload->'interactive'->'button_reply'->>'title' = 'No puedo asistir'
  AND created_at >= 'YYYY-MM-DD'; -- desde fecha del fix
```

## Resultados esperados Sprint 1

| Métrica | Baseline | Esperado |
|---|---|---|
| Tasa éxito Medilaser | 31.5% | **45-50%** (+14-19 pp) |
| Tasa éxito Wilmer | 0% | **30-40%** (FAQs limpieza/manchas) |
| Tasa éxito Yeni/CF | 40% | **55%** |
| Abandono cancel_confirm | 70% | **30%** |
| Confirmaciones perdidas | 8-15/qna | **0-2** |
| FAQs respondidas incorrectamente | 5/qna | **<1** |
| Mensajes vacíos generando handoff duplicado | 4-6/qna | **0** |
| Inbounds "No puedo asistir" loggeados en `message_logs` | 0 (de ~23/qna recibidos) | **>20/qna** |

## Riesgos Sprint 1

- **`min_match_score=1.0` rompe FAQs activas** que dependían de score 0.25-0.75 para matchear. **Mitigación:** auditar las 7 FAQs activas de Wilmer y agregar keywords reales antes de subir umbral. Para Medilaser/Yeni/Eco, hacer lo mismo.
- **Falsos positivos del detector** ("siempre voy ese lunes" interpretado como reschedule). **Mitigación:** tests unitarios con casos del dataset real, documentar reglas culturales en código.
- **Pérdida de UX en `cancel_confirm`** si paciente realmente quería cancelar definitivo. **Mitigación:** keyword "cancelar" disponible en cualquier paso de booking_*, con confirmación explícita antes de ejecutar.

## Plan de medición Sprint 1

Después de deploy, esperar 14 días. Correr el mismo SQL del baseline contra ventana 5-19 May (o 11-25 May según deploy). Comparar columna por columna.

Si tasa Wilmer sigue 0%: ir a investigar FAQs antes de Sprint 2 (problema es vocabulario, no UX).
Si abandono cancel_confirm sigue >50%: revisar copy y considerar estrechar a 2 opciones (Reagendar/Cancelar) con confirmación.

---

# Sprint 2 — Conversación con fechas y disponibilidad (~8h)

> **Foco:** que el bot maneje "para el viernes", "a las 9", "17 de abril" como pacientes lo hablan. Cuando la fecha pedida no existe, ofrecer las más cercanas.

## Items

### 2.1 Crear `_shared/datetime-parser.ts` (4h)

Parser determinístico de fecha y hora en español hondureño. NO usar `Date.parse` (es inconsistente con español). Usar `luxon` (ya está en el proyecto).

```ts
// Parsea fecha relativa o absoluta a DateTime
parseDate(text: string, refDate: DateTime): DateTime | null
// Ejemplos:
//   "mañana" → refDate + 1 día
//   "el viernes" → próximo viernes
//   "17 de abril" → 17 abril del año actual o próximo
//   "para el lunes 27" → próximo lunes 27
//   "próxima semana" → +7 días
//   "el 30 de este mes" → día 30 del mes actual

// Parsea hora natural a string HH:MM
parseTime(text: string): string | null
// Ejemplos:
//   "a las 9" → "09:00"
//   "9 de la mañana" → "09:00"
//   "3:00 pm" → "15:00"
//   "después de las 12" → "12:00"
//   "temprano" → "08:00" (default)
//   "al mediodía" → "12:00"

// Combinado: extrae fecha+hora si están en el texto
parseDateTime(text: string, refDate: DateTime): { date?: DateTime; time?: string }
```

**Tests críticos:**
- "para el 14 de mayo preferiblemente" → 2026-05-14
- "siempre el lunes 27" → 2026-04-27 (no reschedule, mantiene fecha)
- "mañana a las 9:30" → tomorrow + "09:30"
- "después de las 12" → "12:00"
- Casos ambiguos: "a las 3" → "15:00" si hora actual >12, sino sin hora (escalar)

### 2.2 "Buscar slot más cercano" (2h)

Nueva función en `bot-handler/index.ts`:

```ts
async function findNearestAvailableSlot(
  doctorId: string,
  preferredDate: DateTime,
  preferredTime: string | null,
  durationMinutes: number,
  supabase: SupabaseClient
): Promise<{ exact: Slot | null; alternatives: Slot[] }>
```

Lógica:
1. Buscar slot exacto en `preferredDate` + `preferredTime`
2. Si no existe, buscar 3 slots más cercanos (±3 días)
3. Retornar `{ exact, alternatives }`

Integrar en `handleGreeting` cuando intent=BOOK_NEW + fecha extraída por datetime-parser:
```
Paciente: "hay cita para limpieza el viernes 9 de mayo en la mañana?"

Bot:
"Sí, tenemos limpieza el viernes 9 de mayo en la mañana.

Horarios disponibles:
1. 9:00 AM
2. 10:30 AM
3. 11:30 AM

¿Cuál le sirve?"
```

Si no hay slot exacto:
```
"Para limpieza, el viernes 9 ya está completo. Le ofrezco:

1. Jueves 8 — 2:00 PM
2. Sábado 10 — 9:00 AM
3. Lunes 12 — 11:00 AM

¿Cuál prefiere?"
```

### 2.3 Match servicios con aliases (1h)

Estructura nueva de `bot_service_types`:
```json
[
  {
    "name": "Limpieza Dental",
    "duration_minutes": 60,
    "aliases": ["limpieza", "profilaxis", "lavado de dientes", "limpieza profunda"]
  },
  {
    "name": "Citologia",
    "duration_minutes": 15,
    "aliases": ["papanicolau", "papanicolaou", "pap", "examen ginecologico"]
  }
]
```

Función nueva `matchServiceFromText(text, serviceTypes)`: busca primero en `name`, luego en `aliases`. Caso-insensitive, sin tildes.

Integrar en `handleBookingSelectService` y en `handleGreeting` cuando hay BOOK_NEW + término detectado.

### 2.4 Validar duplicado de cita (1h)

En `handleGreeting` cuando intent=BOOK_NEW, antes de iniciar booking flow:

```ts
const existing = await findActiveAppointment(patientPhone, organizationId);
if (existing) {
  return {
    message: `Ya tiene una cita ${existing.dateLabel} a las ${existing.timeLabel} con ${existing.doctorName}.

¿Qué desea hacer?

1. Reagendar la cita
2. Agendar OTRA cita adicional
3. Cancelar la cita actual`,
    nextState: 'duplicate_appointment_confirm', // estado nuevo
    // ...
  };
}
```

Esto previene casos como M31 que terminó con 2 citas duplicadas.

## Resultados esperados Sprint 2

| Métrica | Post Sprint 1 | Post Sprint 2 |
|---|---|---|
| Opciones inválidas en `booking_select_day` | 4/qna | **<1** |
| Opciones inválidas en `booking_select_hour` | 3/qna | **<1** |
| Sesiones que mencionan fecha y agendan exitosamente | 30% | **>70%** |
| Citas duplicadas creadas accidentalmente | 1-2/qna | **0** |
| Tasa éxito agregada | ~50% | **>60%** |

## Riesgos Sprint 2

- **Parser de fechas falla en casos ambiguos** ("el 9" sin contexto). **Mitigación:** si el parser tiene low confidence, retornar null y caer a flujo numerado.
- **Alias colisionan** ("limpieza" en una clínica = "Limpieza dental", en otra = "Limpieza facial"). **Mitigación:** scope cliente — aliases viven por clínica/línea, nunca cruzados.
- **Migración de bot_service_types** existentes sin aliases. **Mitigación:** seed inicial: para cada servicio existente, tomar el `name` como único alias y deployar. Cliente puede agregar más después en UI.

## Plan de medición Sprint 2

Después de 14 días: comparar opciones inválidas en booking_* + sesiones que llegan a `completed` desde greeting con fecha extraída.

Caso de prueba específico: tomar Y5 (Kristel) — paciente que tardó 3 días reagendando para el lunes 27. ¿Una sesión nueva similar lo logra en <2 minutos?

---

# Sprint 3 — Onboarding y polish (~9h)

> **Foco:** que clientes nuevos lleguen con el bot funcionando en lenguaje natural sin Diego configurando manualmente. Polish para casos largos de cola (preámbulos, terceros, out-of-scope).

## Items

### 3.1 Onboarding paso "Servicios y vocabulario" (4h)

Nuevo step `StepServices.tsx` entre Médico y Horario.

UI:
- Tabla de servicios con columnas: Nombre, Duración, "¿Cómo le dicen los pacientes?" (input chips para aliases)
- Botón "Agregar servicio"
- Templates por especialidad: si el doctor tiene `specialty.name="Dermatología"`, sugerir 5 servicios típicos (Consulta dermatológica, Procedimientos láser, Botox, Eliminación de tatuajes, Tratamiento manchas) con aliases pre-poblados.
- Mismo patrón para Odontología, Ginecología, Medicina general, etc.

Tabla `onboarding-templates-by-specialty.ts` con seeds. ~10 especialidades cubiertas.

### 3.2 Onboarding paso "FAQs core" (3h)

Nuevo step `StepFAQs.tsx` después de Servicios.

UI:
- Lista de 6-8 FAQs sugeridas según especialidad:
  - "¿Cuánto cuesta la consulta?" (todos)
  - "¿Dónde están ubicados?" (todos)
  - "¿Qué horario tienen?" (todos)
  - "¿Aceptan tarjeta / transferencia?" (todos)
  - "¿Atienden niños?" (algunos)
  - "¿Aceptan seguro?" (algunos)
  - + 2 específicas de especialidad (precio servicios principales)
- Cada FAQ tiene `question`, `answer` (vacío para llenar), keywords pre-poblados
- Validación: no permitir guardar FAQ sin keywords (forzar al menos 3)

### 3.3 Mejora UX FAQs existente (1h)

En la UI actual de FAQs (post-onboarding):
- Auto-generar keywords iniciales desde la pregunta (split palabras + remover stopwords)
- Warning visual rojo si una FAQ tiene `keywords: []`
- Tooltip explicando que sin keywords, el bot no puede encontrarla

### 3.4 Preámbulos (extraer info después de "fíjese que…") (1h)

Ya implementado parcialmente en Sprint 1 (`detectIntent` retorna `{ preamble, remainder }`). Aquí lo aplicamos en handlers:

```ts
const result = detectIntent(messageText);
const textToProcess = result.remainder ?? messageText;

// Procesar textToProcess, no messageText original
```

Esto convierte "fíjese que mañana no puedo" → procesa "mañana no puedo" → extrae fecha + intent.

### 3.5 Out-of-scope handling (30min)

Cuando `detectIntent` retorna `OUT_OF_SCOPE`:
```
"Esa solicitud requiere atención humana — la secretaria le responderá en cuanto pueda. ¿Es algo urgente?"
```
Y escalar.

### 3.6 Info de terceros ("para mi hijo Jonathan") (30min)

En `handleBookingAskName` aceptar también el nombre del paciente real cuando viene precedido de "para":
- "para mi hijo Jonathan" → patientName = "Jonathan", relación = "hijo"
- "para mi mamá" → preguntar nombre

Guardar en `appointments.notes` quien agendó vs quien atiende.

## Resultados esperados Sprint 3

| Métrica | Post Sprint 2 | Post Sprint 3 |
|---|---|---|
| Tiempo onboarding cliente nuevo | manual ~2h | **wizard ~30min** |
| % clientes nuevos con vocabulario configurado al activar | 0% | **>90%** |
| Tasa éxito clientes NUEVOS desde día 1 | ~10% | **>40%** |
| Mensajes con preámbulo procesados correctamente | 30% | **>80%** |
| Out-of-scope manejados claramente | 0% | **100%** |

## Riesgos Sprint 3

- **Onboarding más largo = más fricción de activación.** **Mitigación:** los pasos Servicios/FAQs son opcionales con templates muy buenos por defecto; el cliente puede saltar y configurar después.
- **Templates por especialidad incorrectos** para nichos raros (urólogo, neurocirujano). **Mitigación:** tener fallback genérico + permitir editar todo.

## Plan de medición Sprint 3

Activar 1-2 clientes nuevos POST-Sprint 3 con onboarding completo. Comparar tasa de éxito de bot en sus primeras 4 semanas vs Wilmer/Eco (que arrancaron sin vocabulario configurado).

---

# Mapping a Tiers originales

| Tier original | Sprint que lo cubre | Item específico |
|---|---|---|
| T1 #1 — Confirmación explícita en greeting/main_menu | Sprint 1 | 1.2 |
| T1 #2 — `cancel_confirm` acepta texto libre | Sprint 1 | 1.2 |
| T1 #3 — Bug `user_message=""` | Sprint 1 | 1.5 |
| T1 #4 — Logging botón "Confirmar" | Sprint 1 | 1.6 |
| T2 #5 — Botón "No puedo asistir" UX | Sprint 1 | 1.2 (handleDirectReschedule) |
| T2 #6 — Intent `consultar_mi_cita` | Sprint 1 | 1.2 (intent ASK_MY_APPOINTMENT) |
| T2 #7 — FAQ matching umbral | Sprint 1 | 1.3 + 1.4 |
| T3 #8 — Parser fechas naturales | Sprint 2 | 2.1 + 2.2 |
| T3 #9 — Detectar out-of-scope | Sprint 3 | 3.5 |
| T3 #10 — Validar duplicado de cita | Sprint 2 | 2.4 |

**Cero items se pierden.** Todos quedan cubiertos en una arquitectura coherente.

---

# Cronograma sugerido

| Semana | Sprint | Status |
|---|---|---|
| 5-11 May | Sprint 1 (~9.5h, 3 sesiones) | pendiente |
| 12-18 May | medición Sprint 1 (no codear) | — |
| 19-25 May | Sprint 2 (~8h, 2-3 sesiones) | pendiente |
| 26 May - 1 Jun | medición Sprint 2 + ajustes | — |
| 2-8 Jun | Sprint 3 (~9h, 3-4 sesiones) | pendiente |
| 9-15 Jun | medición Sprint 3 + cliente nuevo de prueba | — |

**Total tiempo dev:** ~26.5h en 6 semanas. Compatible con 4-5h/día y restricciones familiares.

# Tracking

Métricas se miden con SQL en `bot_conversation_logs` (script de baseline ya validado en plan). Diego puede correrlo cualquier día con:

```sql
-- Plantilla de medición (cambiar fechas)
WITH sessions AS (
  SELECT
    session_id,
    organization_id,
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
FROM sessions s
JOIN organizations o ON o.id = s.organization_id
WHERE o.id IN (
  'c7234d61-1586-42ae-bc0a-db8abb96a75c', -- Wilmer
  '1eec1734-9cc0-4e2c-ae67-31aab1393df8', -- Medilaser
  'a182a362-62e4-45f4-84c7-f76c0735390c', -- Yeni/CF
  '7daa9810-13d2-44f9-bbf6-a7ea4f57ab74'  -- Ecoclinicas
)
GROUP BY o.name;
```

Resultados de cada medición se anotan al final de este plan (sección "Bitácora de medición") para tener historial.

# Bitácora de medición

## Baseline (V2 14-28 Abr 2026)

| Cliente | Sesiones | Éxito | Abandono cancel_confirm |
|---|---|---|---|
| Medilaser | 54 | 31.5% | 62.5% |
| Wilmer | 6 | 0% | 100% |
| Yeni/CF | 5 | 40% | 100% |
| Ecoclinicas | 2 | 0% | — |

## Post Sprint 1 (pendiente)

## Post Sprint 2 (pendiente)

## Post Sprint 3 (pendiente)
