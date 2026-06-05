# Plan — Optimización de tiempos de carga de calendario y horarios

> Planificado 5 Jun 2026 (sesión modo-dev). **NO implementado aún** — documentado para
> ejecutar en la próxima sesión. Diego decidió no arrancar para no quedarse sin tokens a
> media tarea. Empezar por el Caso #1.

## Context

Diego percibe que cargar el calendario (días) y los horarios (slots) en "Nueva Cita"
"toma bastante tiempo". El diagnóstico (validado contra el código) es que el motor de
disponibilidad `_shared/availability.ts` ejecuta **muchas queries en serie que son
independientes entre sí**: para el ICP (multi-doctor + varios servicios), abrir Nueva
Cita y elegir una fecha dispara ~20 round-trips DB secuenciales (~10-50ms c/u desde una
edge function). El objetivo es bajar eso a 2-3 olas paralelas (~2-3x) **sin cambiar el
resultado del cálculo** (output byte-idéntico).

Tres casos, en orden de ROI/seguridad. **Arrancamos por el #1** (mayor ahorro, cero
cambio de comportamiento). #2 y #3 quedan diseñados para ejecutarse después con números
en mano.

Hechos validados en exploración (para no duplicar):
- `@tanstack/react-query` ya está instalado (v5.83.0) y `QueryClientProvider` configurado
  en `src/App.tsx` (`staleTime: 30s`, `refetchOnWindowFocus: false`), pero **ningún hook
  usa `useQuery` aún** → #3 no choca con nada.
- El backend re-valida disponibilidad al insertar: `create-appointment/index.ts:275-292`
  (slot ocupado → 409) + trigger de capacidad Fase 0 (`:371-377`). **Esto garantiza que
  ningún caché del front pueda causar doble-reserva** — solo, en raro caso de carrera, un
  mensaje "horario ya ocupado". La misma carrera ya existe hoy sin caché.
- Patrón de timing ya existe en `bot-handler` (`Date.now()`), prefijo de log `[fn]`,
  constante `BUILD` en respuestas.

---

## CASO #1 — Paralelizar el motor con `Promise.all` (behavior-preserving) ← EMPEZAMOS AQUÍ

Transformar awaits en serie **independientes** en `Promise.all`. El cálculo es
determinístico salvo `DateTime.now()` (filtro "slots pasados de hoy"); todos los
ensamblados que importan usan `.some()` (solape) o sumas (`+=`), insensibles al orden,
**siempre que los `Set`/`Map` acumuladores se reconstruyan iterando el array de input
(`doctorIds`/`serviceTypeIds`/`dates`), no el orden de resolución de las promesas.**

### Archivos y transformaciones (orden de menor → mayor riesgo)

**Archivo principal:** `supabase/functions/_shared/availability.ts`
(consumidores que se benefician sin tocarse: `get-visit-days`, `get-available-slots`, y
el `bot-handler` vía `getAvailableSlotsForDate`).

1. **`loadCandidateRecipe` (~228)** — base reusada por 3/4/5. Las 2 queries
   (`service_types.buffer_minutes` + `service_resources`) dependen solo de `serviceTypeId`
   → `Promise.all([stQuery, srQuery])`. Sin trampas.

2. **`get-visit-slots/index.ts` (~57-83)** — tras `resolveVisitContext` (va primero, sus
   early-returns dependen del ctx), `loadVisitDayState` y la query `doctorLoad` dependen
   solo del ctx (doctorLoad NO usa `state`) → `Promise.all([loadVisitDayState(...),
   doctorLoadQuery])`. Mantener init `doctorLoad[id]=0` en orden de `allDoctorIds`.

3. **`getAvailableSlotsForDate` (~307)** — alto tráfico (bot + get-available-slots).
   `loadSchedules` PRIMERO con su early-return `if (schedules.length===0) return []` (NO
   paralelizar: evita queries siguientes). Después, dos cadenas independientes en
   `Promise.all`: cadena `recipe→consumers` (interna secuencial; en modo base no ejecuta
   queries) y cadena `cowork→appointments` (interna secuencial). Conservar ambas ramas
   resourceAware/base idénticas.

4. **`loadVisitDayState` (~414)** — 3 niveles:
   - Nivel 0: `Promise.all([ Promise.all(doctorIds.map(d => Promise.all([loadSchedules,
     loadCoworkDoctorIds]))), Promise.all(serviceTypeIds.map(loadCandidateRecipe)) ])`.
   - Nivel 1: `Promise.all([apptsQuery(allCoworkIds), loadResourceConsumers(recipeResourceIds)])`.
   - **Trampa:** re-llenar `windowsByDoctor`/`coworkByDoctor`/`allCoworkIds`/`serviceMeta`/
     `recipeResourceIds` iterando los resultados **en orden de `doctorIds`/`serviceTypeIds`**
     (`.map` lo preserva) para que `[...allCoworkIds]`/`[...recipeResourceIds]` queden
     idénticos. Ensamblado final de `occupiedByDoctor` sin cambios.

5. **`loadVisitRangeState` (~621)** — mismo patrón a nivel rango. `Promise.all` del bloque
   doctores (`loadCoworkDoctorIds` + `loadSchedulesAllDows`) y bloque servicios
   (`loadCandidateRecipe`); luego `Promise.all` de las 2 queries de rango (appts por
   `allCoworkIds`; dayAppts por org+receta). Preservar guards `allCoworkIds.size>0` /
   `recipeResourceIds.size>0` (si vacío, `Promise.resolve({data:[]})`, no construir query).
   Misma regla de reducción en orden de input (incluido `schedByDoctorDow`).

6. **`resolveVisitContext` (~778)** — compartida por get-visit-slots y get-visit-days
   (mayor riesgo → al final). Las 3 queries (servicios, doctores `.order(name)`, skills)
   filtran por inputs del request, no por el resultado de servicios → `Promise.all`.
   **Trampa crítica:** hoy hay early-returns escalonados (`svcErr`→500, org-check→400,
   `docErr`→500). Tras el `Promise.all` hay que **replicar esos chequeos en el MISMO orden**
   (svcRes.error → org-check → docRes.error) para producir el mismo `fatal`/`emptyReason`.
   Único efecto: trabajo DB extra en paths de error (raros), sin cambio de output.

### Fuera de alcance del #1 (deferido, explícito)
- **Loops propios de `bot-handler`** (`getCombinedSlotsForDate`, `getAvailableDaysInWeek`,
  `getCombinedDaysInWeek` — serial por doctor/día): multiplicador extra para el bot, pero
  tocar el bot exige su propio E2E y la queja de Diego es la plataforma. El #1 ya acelera
  cada `getAvailableSlotsForDate` que el bot llama (vía punto 3, seguro). Los loops del bot
  quedan como follow-up opcional.
- **Deduplicar la lógica propia de `get-available-days`** (reimplementa loadSchedules/
  loadCowork): refactor arquitectónico aparte, no es performance pura.

---

## CASO #2 — Logs de timing (medir antes/después)

Instrumentar con el patrón `Date.now()` ya usado en `bot-handler`, prefijo `[fn]`.
- En `get-visit-slots`, `get-visit-days`, `get-available-slots`, `get-available-days`:
  medir el bloque de carga DB (`const t0 = Date.now()` … `console.log("[fn] availability
  Nms")`). Agregar campo `timingMs` en la respuesta JSON, **gated por el flag `debug`** que
  `get-available-days` ya soporta (no romper el shape para clientes).
- Bump de la constante `BUILD` en cada función para confirmar el deploy.
- Sirve para A/B (antes/después del #1) y para detectar si el *cold start* de la edge
  function domina (eso el #1 no lo arregla).

---

## CASO #3 — Caché React Query en el front (opcional, decidir con números del #2)

`useAppointmentComposer.ts`: reemplazar los `useEffect` crudos de días/slots por `useQuery`
(reusando los wrappers `getVisitDays`/`getVisitSlots`/`getAvailableDays`/`getAvailableSlots`
de `src/lib/api*.ts`). Query keys por inputs, ej.:
`['composer-days', path, doctorId, serviceTypeIds, monthKey, calendarId, orgId]` y
`['composer-slots', path, dateKey, ...]`.

Manejo de staleness (la BD es la fuente de verdad; el 409 ya evita doble-reserva):
- **`staleTime` corto para slots (~15s)** + `refetchOnWindowFocus: true` (override del
  default global en estas queries) → la ventana de dato viejo es mínima.
- **Invalidar las queries de disponibilidad tras una reserva exitosa** (`submit()` →
  `queryClient.invalidateQueries`) para que la propia cita se refleje al instante.
- (Opcional avanzado, probablemente innecesario) suscripción Realtime a `appointments`
  para invalidar ante cualquier cita nueva.
- Aplicar primero a `NuevaCita`; `RescheduleModal` mismo patrón como follow-up.

---

## Verificación

**Caso #1 (output byte-idéntico — lo esencial):**
- `deno check` sobre cada función modificada (debe quedar type-clean salvo el falso
  positivo preexistente de `_shared/meta-media.ts`).
- **A/B en prod sobre datos reales** (vía Supabase MCP / invocación directa): para fechas
  FUTURAS (neutraliza `DateTime.now()`), comparar `JSON.stringify` de la respuesta ANTES vs
  DESPUÉS en: get-visit-slots y get-visit-days (org prueba OrionCare con Diego+Lizzy +
  varios servicios), get-available-slots (cliente single-doctor). Deben ser idénticas.
- Casos a cubrir: modo base vs resource-aware; receta vacía vs con recursos; cowork
  multi-doctor; servicio de otra org (fatal 400); servicio sin profesionales (emptyReason);
  rango con citas en fechas distintas (loadVisitRangeState).
- E2E ya existente de Fase 5/6 (agendar visita real) debe seguir pasando — lo corre Diego
  logueado.

**Caso #2:** confirmar en `get_logs` (MCP) que aparecen los `[fn] ...ms` y comparar
promedios antes/después del #1. Confirmar BUILD nuevo en la respuesta.

**Caso #3:** `tsc --noEmit` OK; prueba manual de re-navegación (volver a un mes/fecha ya
visto = instantáneo) + verificar que tras agendar, los slots se refrescan (invalidación).

---

## Tiempos de desarrollo (implementación Claude + verificación + QA)

> El grueso del #1 NO es escribir el código (es rápido), es la verificación A/B de output
> idéntico (crítica en un hot path).

**Caso #1 — paralelización del motor**
| Sub-paso | Esfuerzo |
|---|---|
| Punto 1 `loadCandidateRecipe` | ~10 min |
| Punto 2 `get-visit-slots` index | ~15 min |
| Punto 3 `getAvailableSlotsForDate` (early-return + 2 ramas) | ~30 min |
| Punto 4 `loadVisitDayState` (map→reduce, 2 niveles) | ~45 min |
| Punto 5 `loadVisitRangeState` (mismo patrón, mayor) | ~45 min |
| Punto 6 `resolveVisitContext` (trampa orden de errores) | ~30 min |
| Harness A/B + corrida en prod (fechas futuras) | ~60-90 min |
| `deno check` + deploy + smoke | ~20 min |
| **Subtotal #1** | **~4-5 h** (≈ 1 sesión) |

**Caso #2 — logs de timing:** ~30-45 min (mismo deploy del #1).
**Caso #3 — caché React Query:** ~1.5-2.5 h (`RescheduleModal` follow-up: +30-45 min).
**Total los 3:** ~6-8 h ≈ **1.5-2 sesiones**. El #1 (lo que ataca la lentitud) cabe en **1 sesión**.

Riesgo: el A/B del #1 podría destapar una diferencia sutil de orden a corregir (por eso el
harness con fechas futuras es no-negociable). Si el #2 muestra que el *cold start* domina,
el #3 puede no valer la pena → ahorro de ~2 h.

## Orden de ejecución
1. **Caso #1** completo (puntos 1→6 en ese orden de riesgo) + `deno check` + A/B en prod.
2. **Caso #2** en el mismo deploy del #1 (o justo antes, para baseline) — medir.
3. Con números, decidir si el **Caso #3** vale la pena.

Deploy: `npx supabase functions deploy <fn> --project-ref soxrlxvivuplezssgssq` (bundlea
`_shared` + type-check). Afectadas por el #1: `get-visit-slots get-visit-days
get-available-slots` (+ `get-available-days` y `bot-handler` si se redeploya por el cambio
compartido — verificar que el bundle del shared no rompe el bot).
