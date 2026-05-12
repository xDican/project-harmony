# Playbook — Análisis del bot de WhatsApp

> Método reproducible para auditar el bot y producir acciones concretas.
> **Creado:** 14 Abr 2026 (primera ejecución exitosa)
> **Output esperado:** dos reportes (`docs/analisis-bot-flujo-a.md` y `docs/analisis-bot-flujo-b.md`) con máximo 5 micro-ajustes cada uno.

## Objetivo

Hacer al bot más útil y simple para el paciente, y que las FAQs funcionen como autoservicio real. Cada análisis termina en acciones concretas, no en un reporte descriptivo.

## Los 2 flujos

- **Flujo A (reactivo):** paciente con cita responde a notificación (confirmation, reminder_24h, reminder_followup, reminder_3d). Acciones: confirmar, reagendar, cancelar.
- **Flujo B (proactivo):** paciente escribe desde cero al número. Caminos: agendar, consultar FAQ, pedir humano.

## Fuente de datos única

`bot_conversation_logs` ya captura: `state_before`, `state_after`, `intent_detected`, `user_message`, `bot_response`, `response_time_ms`, `patient_phone`, `organization_id`. No instrumentar nada nuevo.

Tablas relacionadas:
- `message_logs` — notificaciones outbound (tipos: confirmation, reminder_24h, reminder_followup, reminder_3d, patient_confirmed, appointment_released)
- `bot_faqs` — inventario (question, keywords array, is_active)
- `bot_sessions` — sesiones vivas
- `organizations` — join por organization_id

## Gotchas conocidos

1. **`intent='confirm'` NO existe en bot_conversation_logs** — las confirmaciones por botón se procesan en `meta-webhook` (líneas 335–360) y NO se loggean. Para medir confirmaciones hay que cruzar con `message_logs.type='patient_confirmed'` o `appointments.status='confirmada'`. Hay un ajuste propuesto para corregir esto (ver reporte Flujo A #1).
2. **`intent='cancel'` prácticamente no aparece post-notificación** — el botón "Cancelar" se mezcla con reagendamiento, va al state `cancel_confirm` pero a veces registra intent='reschedule'. Diseñar queries para contemplar ambos.
3. **Teléfonos**: `message_logs.to_phone` y `bot_conversation_logs.patient_phone` están normalizados igual. Cruzar directo por `to_phone = patient_phone`.
4. **Ventana sugerida:** Flujo A → 15 días (volumen alto). Flujo B → 30 días (volumen bajo, necesita más tiempo).
5. **Clínicas test a ignorar:** Pinares Clinic, OrionCareEditado, "123!!…". Filtrar por lista blanca: Medilaser, Dr. Wilmer Guevara, Ecoclinicas, Consultorio Familiar y Centro de Diagnostico por Imagen.

## Fase 1 — Flujo A

### Q1: ¿Qué hacen los pacientes con la notificación?
Cruzar `message_logs` outbound (confirmation/reminder_*) con:
- `message_logs` outbound type='patient_confirmed' → **confirmó** (botón)
- `bot_conversation_logs` primer inbound con intent='reschedule' → **reagendó**
- `bot_conversation_logs` primer inbound con intent='cancel' OR state='cancel_confirm' → **canceló**
- `bot_conversation_logs` state_after='handoff_secretary' → **handoff**
- `message_logs` outbound type='appointment_released' → **cita liberada**
- Nada de lo anterior → **sin respuesta**

Ventana: 48h post-notificación. Agrupar por tipo de notificación.

### Q2: Drop-off en reagendamiento
Sesiones que entran a reschedule/booking_* y medir quién pasa cada estado:
`reschedule_list → booking_select_week → day → hour → confirm → completed`
Usar `BOOL_OR` por `session_id`.

### Q3: Handoffs
`WHERE state_after='handoff_secretary'` + mostrar `user_message` + `state_before` + clinica. Clusterizar manualmente en: (a) flujo intencional "opción 4", (b) FAQ sin match + "opción 2", (c) bots externos/spam, (d) misses del bot (paciente con necesidad real mal interpretada).

## Fase 2 — Flujo B

### Q1: Funnel del booking
Filtrar sesiones que empezaron con `state_before='greeting'`. Por cada sesión, flags `BOOL_OR` para cada estado del funnel:
`greeting → main_menu → booking_select_doctor/service → day → hour → (ask_name) → confirm → completed`

Reportar también: cuántos van a FAQ, cuántos a handoff directo ("4"), cuántos a reagendar.

### Q2: Preguntas que el bot NO entiende
**Dos sub-queries:**
- a) `state_before='faq_search' AND bot_response ILIKE '%no encontramos%'` — FAQs sin match
- b) `state_after='handoff_secretary' AND state_before IN ('faq_search','greeting')` — escalamientos

Clusterizar mensajes manualmente en: precios, ubicación, servicios específicos, horarios, intención de agendar mal redirigida, saludos/ruido.

**Sub-query crítica también:** FAQs con match **incorrecto** (bot responde algo que no tiene que ver). Para encontrarlas: `state_before='faq_search' AND intent_detected='faq' AND bot_response NOT ILIKE '%no encontramos%'` — revisar manualmente si la respuesta es coherente con la pregunta. Este hallazgo es el más impactante.

### Q3: Inventario de FAQs
- Listar FAQs activas por clínica con sus `keywords` arrays
- Identificar: (a) FAQs sin keywords (nunca matchean), (b) duplicadas, (c) clínicas sin FAQs configuradas
- Cruzar gap vs mensajes de Q2: ¿qué temas pregunta la gente que no están cubiertos?

## Estructura del reporte (ambas fases)

1. **Datos duros** — tablas con números absolutos y porcentajes
2. **Hallazgos** — 3 viñetas como máximo por pregunta
3. **Micro-ajustes propuestos** — máximo 5, con: problema, solución, impacto, esfuerzo estimado, archivo afectado con línea aproximada
4. **Decisiones pendientes** — preguntas abiertas para el fundador
5. **Siguiente paso recomendado** — cuál ajuste implementar primero y por qué

## Reglas del análisis

- **Lead con el dato más sorprendente**, no con contexto. "31% confirma" > "Haremos un análisis del flujo A".
- **Cada micro-ajuste tiene costo estimado** (minutos u horas). Sin eso, no es accionable.
- **Nunca más de 5 ajustes.** Si aparecen más, ranking forzado.
- **Ajustes que desbloqueen visibilidad van primero.** Ej: logging de confirmaciones fue #1 porque sin eso, los otros ajustes no se pueden validar.
- **Separar "flujo intencional" de "fallo del bot"** en handoffs. No todo handoff es problema.
- **Respuesta incorrecta > "no sé"** es un bug, no una feature. Documentar casos específicos con texto real del paciente.

## Cadencia sugerida

- **Ejecución completa:** mensual. Toma ~2 horas de SQL + 1 hora de consolidación.
- **Ejecución acotada:** semanal, solo Q1 Flujo A (la que más volumen tiene y la que debería cambiar con cada ajuste implementado).
- **Después de cada ajuste implementado:** medir con una mini-query puntual en la ventana post-cambio (15 días) y comparar con baseline.

## Evolución del playbook

Cada ejecución debería dejar aprendizajes aquí mismo. Ejemplos de cosas a evolucionar:
- Si aparece un nuevo tipo de notificación → agregar a Q1
- Si aparece un nuevo estado del bot → revisar si impacta el funnel
- Si se implementa el ajuste de logging de confirmaciones → rehacer Q1 usando intent='confirm' directamente (más preciso que el workaround con patient_confirmed)
