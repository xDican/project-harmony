# Plan técnico — Motor de Agendamiento Multi-Recurso (VALIDADO contra código)

> Creado 2 Jun 2026 (modo-dev). Validado contra el código real (3 exploradores) el mismo día.
> Decisión estratégica: ver [[motor-agendamiento-es-producto]]. El motor es el producto real (retención/foso/$150), no el inbox.
> **Fase 0 ENTREGADA + QA 14/14 el 2 Jun.** Siguiente: Fase 1.

---

## Tesis (estrella polar del scope)

Cada feature se justifica solo si reduce una de las **dos fugas** del ICP multi-recurso:
1. **Fuga de demanda:** pacientes que abandonan porque "nunca contestan" (respuesta lenta).
2. **Fuga de oferta:** recursos ociosos mientras otro está saturado (mala coordinación).

## 3 hallazgos de la revisión de código (corrigieron el plan)

1. **`service_types` está dormida.** El bot lee servicios del JSONB `whatsapp_lines.bot_service_types` (bot-handler:204), NO de la tabla; `appointments.service_type` es string libre. → **Fase 1 (prerrequisito): consolidar `service_types` como fuente única.** Sin esto, las recetas/skills colgarían de una tabla muerta.
2. **2-3 copias divergentes del algoritmo de slots** (`bot-handler` 3367-3587, `get-available-slots`, `get-available-days`). → extraer a `_shared/availability.ts` (mata duplicación), no crear una 4ta.
3. **Dos caminos de escritura de citas** (bot INSERT directo bot-handler:2624-2725 vs `create-appointment` EF). → validación de capacidad vía **trigger en DB** (decisión Diego) que protege ambos.

## Decisiones de diseño ratificadas

1. **Receta = M2M `service_resources`** (no FK único): láser necesita cabina **Y** máquina.
2. **Secuenciador = `visit_id` + una cita por procedimiento** (algoritmo de slots consecutivos, no rediseño de datos).
3. **Consumo de recursos derivado en query-time** (join `appointments → service_resources`). Sin tabla materializada.
4. **Técnicas = filas en `doctors`** (`user_id` nullable) + relabel UI "Doctor"→"Profesional".
5. **Config interna white-glove:** Diego configura cada instalación; UI en área superadmin/admin. Tablas+RLS genéricas → self-service futuro.
6. **Degradación elegante:** org sin recursos/skills → comportamiento doctor-first de hoy. No rompe clientes actuales, sin flag. (Verificado en QA caso 6.)
7. **NLP del bot diferido** hasta primer cliente real (Fase 6 = service-first estructurado, opciones numeradas).

**Anti-scope-creep (NO se hace):** proficiencia por profesional, optimización global del día, cooldown de máquina (A4.6), self-config de clínica, excepciones de horario/feriados.

---

## Fases y estado

| Fase | Qué | Est. | Estado |
|---|---|---|---|
| **0** | Schema (`resources`, `service_resources`, `professional_services` + cols + trigger capacidad) | 3-4h | ✅ **HECHO + QA 14/14** (2 Jun, prod) |
| **1** | Consolidar `service_types` (fuente única) — PRERREQUISITO, toca bot vivo | 4-6h | pendiente |
| **2** | Motor disponibilidad `_shared/availability.ts` + skill/recurso aware | 6-8h | pendiente |
| **3** | UI config interna (recursos/recetas/skills) | 5-7h | pendiente |
| **4** | Vista combinada multi-calendario + booking service-first + relabel | 8-10h | pendiente |
| **5** | Secuenciador multi-procedimiento (greedy, `visit_id`) — RIESGO #1 | 4-6h | pendiente |
| **6** | Bot service-first estructurado (sin NLP) | 4-6h | pendiente |

**Restante (1-6): ~31-43h ≈ 3-5 semanas calendario.**

### Fase 0 — ENTREGADA (detalle)
- 6 migraciones `supabase/migrations/20260602120000..120005_motor_*.sql`, aplicadas en prod vía MCP como `motor_agendamiento_multirecurso_fase0`.
- Tablas con RLS org-scoped (`get_user_organizations`/`has_role`). Trigger `validate_appointment_resource_capacity` (BEFORE INSERT/UPDATE OF appointment_at,duration_minutes,service_type_id,status) con `REVOKE EXECUTE FROM anon,authenticated`.
- **QA 14/14** (suite transaccional auto-rollback): boundary, no-sobre-bloqueo, capacidad N>1 con conteo cruzado entre servicios, multi-recurso, buffer, degradación elegante, cancelada-libera, reagenda-no-se-cuenta-a-sí-misma + reagenda-a-slot-lleno.
- Advisor: 0 ERRORs nuevos; las 3 tablas con RLS+policies OK.

### Fase 1 — plan de ejecución (siguiente sesión)
1. Regenerar `src/integrations/supabase/types.ts` (MCP `generate_typescript_types`).
2. `bot-handler:204` → leer `service_types` (por org/línea, `is_active`) en vez del JSONB. `lineServiceTypes` con `{id,name,duration_minutes}`.
3. `bot-handler:2624-2725` (`createAppointmentWithPatient`) → setear `service_type_id` (+ `service_type` nombre por compat).
4. Frontend `NuevaCita.tsx` + `lib/api.ts createAppointment` → persistir `service_type_id`.
5. Migración backfill: `appointments.service_type` (nombre) → `service_type_id` por match con `service_types.name` en la misma org (best-effort, NULL si no matchea).
6. **Verificar con Demo Bot** que sigue agendando antes de cerrar la fase.

## Reutilización (no reinventar)
- RLS helpers `get_user_organizations` / `has_role` (STABLE) — `20260213161902`.
- Trigger `set_updated_at` — `20260518120001`. Patrón tabla org-scoped — `service_types` `20260518120002`. Junction — `doctor_patients` `20260219120000`.
- Algoritmo de slots — `bot-handler` 3367-3587 (mover, no reescribir): overlap `slotStart<aptEnd && aptStart<slotEnd`, zona `America/Tegucigalpa`, `weekday%7`, co-working 3505-3531.
- Hooks frontend: `useWeeklyAgenda`, `useDoctors`, `useSingleDoctor`, `ui/calendar.tsx`.

## Infra de sesión
- **MCP Supabase** (proyecto `soxrlxvivuplezssgssq`): `apply_migration`, `execute_sql`, `deploy_edge_function`, `generate_typescript_types`. La auth OAuth es por-sesión (re-autorizar si expira).

## Verificación end-to-end (por fase)
- F1: Demo Bot agenda leyendo `service_types`; `service_type_id` poblado; backfill no rompe citas viejas; 3 clientes actuales agendan OK.
- F2: comparar slots antes/después del refactor para doctor sin recursos (idéntico = degradación); con recursos, respetan capacidad.
- F4: Dulce ve N profesionales en una pantalla; agenda service-first con auto-asignación; labels "Profesional".
- F5: visita de 2 procedimientos → 2 filas con mismo `visit_id`; cancelar afecta ambas.
- F6: paciente nuevo → consulta previa; recurrente agenda; bot da precio.
- Pruebas con Demo Bot verified + número personal de Diego ANTES de cliente real.
