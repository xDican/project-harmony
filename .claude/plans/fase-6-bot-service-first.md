# Fase 6 — Bot service-first estructurado (el diferenciador)

> Creado 3 Jun 2026 (modo-dev). Cierra el Motor de Agendamiento Multi-Recurso.
> Decisiones Diego (3 Jun): (1) **auto-asigna el menos cargado, SIN paso de elegir profesional**
> (bot maximo control + ataca fuga de oferta); (2) **alcance = nucleo + consulta previa + precio**
> (cierra la linea de verificacion F6 completa).

## Tesis

El bot hoy es **professional-first** (doctor → servicio → semana → dia → hora) con todo el
downstream clavado a un solo `doctorId`. Fase 6 lo invierte a **service-first**: el paciente
elige el SERVICIO, el bot calcula los profesionales calificados (skill matrix
`professional_services` + fallback a todos = degradacion), muestra disponibilidad **combinada**
(union resource-aware via Fase 2B) y al elegir hora **auto-asigna el menos cargado**. Replica en
el bot lo que la plataforma ya hace en `NuevaCita`/`combinedAvailability.ts` (Fase 4).

## De-risk

Los 4 clientes reales son lineas de **1 doctor** → para ellos no cambia nada visible (nunca ven
paso de doctor; combined degrada a 1 profesional; service-first con 1 servicio = auto-select
silencioso = identico a hoy). El cambio de orden solo afecta orgs **multi-profesional** = el ICP
+ la org de prueba (Diego + Lizzy con skills). Riesgo a produccion actual ≈ cero.

## Arquitectura (minima invasion)

La logica combinada solo afecta la **enumeracion** semana/dia/hora. Una vez que el paciente elige
hora, el bot **auto-asigna** y setea `session.context.doctorId/doctorName/calendarId` → de ahi
todo el downstream (confirmar/nombre/INSERT/re-validacion) queda **single-doctor sin cambios**.

El flujo legacy professional-first (org SIN servicios) se mantiene **intacto** como fallback; solo
se agrega la rama service-first arriba en `startBookingFlow`.

### Toques (bot-handler/index.ts)

1. **Carga de servicios (~220):** el select de `service_types` agrega `price, requires_prior_consult`;
   `lineServiceTypes` lleva esos campos.
2. **`startBookingFlow`:** limpiar `combinedMode/qualifiedDoctors/combinedSlotDoctors/availableDoctors/
   selectedServicePrice`. Si `lineServiceTypes.length >= 1` → `startServiceFirstFlow`. Si no → flujo
   professional-first de siempre (degradacion).
3. **`startServiceFirstFlow` (nuevo):** 1 servicio → auto-select → `resolveServiceAndContinue`.
   2+ → menu de servicios (`booking_select_service`). `bookingTotalSteps = 4 + (2+? 1:0)`.
4. **`handleBookingSelectService` (reescrito):** valida seleccion → `resolveServiceAndContinue`.
5. **`resolveServiceAndContinue` (nuevo):**
   - **Consulta previa:** si `service.requires_prior_consult` && paciente NUEVO (`isNewPatient`) →
     ofrece los servicios con `requires_prior_consult=false` (las consultas) para agendar la consulta
     primero; si no hay ninguno → handoff. (Al elegir la consulta vuelve por el mismo handler y, como
     no requiere prior, procede.)
   - `getQualifiedDoctorsForService` (port de `combinedAvailability.getQualifiedDoctors`, org-level).
   - 0 calificados → handoff. 1 → single-doctor (set doctorId/Name/calendarId, `combinedMode=false`).
     2+ → `combinedMode=true`, guarda `qualifiedDoctors`.
   - Guarda `selectedServicePrice`.
   - Va a `handleBookingSelectWeek`.
6. **Helpers combinados (nuevos, fan-out + merge sobre `qualifiedDoctors`, calendarId undefined):**
   `getCombinedDaysInWeek`, `getCombinedWeeks`, `getCombinedSlotsForDate` (→ `Map<time, doctorId[]>`).
   Reusan los enumeradores single-doctor existentes por profesional.
7. **Branch `combinedMode` en:** `handleBookingSelectWeek` (weeks), `handleBookingSelectDay` (days),
   `showHourSlots` (slots + guarda `combinedSlotDoctors`).
8. **Auto-asignacion en `handleBookingSelectHour`** (al elegir slot): `freeIds =
   combinedSlotDoctors[selectedTime]` → `getDoctorLoadForDate` → `pickLeastLoaded` → set
   `doctorId/doctorName/calendarId` (resuelve primer calendario activo del doctor, o null).
9. **Precio en confirmacion:** linea `💵 Lps. {price}` si `selectedServicePrice` seteado.
10. **`isNewPatient` (nuevo):** `findPatientByPhone` null → nuevo; o sin citas no-canceladas en el org.
11. **Reschedule (~3053):** agregar `delete combinedMode/qualifiedDoctors/combinedSlotDoctors`
    (reschedule siempre single-doctor, mismo doctor de la cita).

### Numeracion de pasos

`getStepNumbers` ya deriva offset de `availableDoctors`(>1) y `availableServiceTypes`(>=2). En
service-first NO se setea `availableDoctors` → hasMultiDoc=false. 1 servicio → total 4; 2+ → total 5.
Combinado no agrega paso visible (auto-asignacion es invisible).

## Degradacion garantizada

- Org sin servicios → professional-first legacy intacto (clientes actuales).
- Servicio sin skills declarados → fallback a todos los doctores del org (no bloquea).
- Servicio sin receta/buffer → slots identicos al modo base (Fase 2B ya lo garantiza).
- 1 doctor calificado → single-doctor, sin auto-asignacion.

## Anti-scope-creep

NO se hace: elegir profesional especifico (auto-asigna y punto), NLP, precio ad-hoc fuera de
confirmacion ("¿cuanto cuesta?" sigue siendo FAQ), reagendar combinado (reschedule = mismo doctor).

## Verificacion (QA con Diego, org prueba OrionCare: Diego + Lizzy con skill de Consulta general)

1. **Service-first multi-profesional:** elegir servicio → ver dias/horas COMBINADOS (union) → al
   elegir hora, confirma con UN profesional auto-asignado (el menos cargado). Coincide con el calculo
   de la plataforma (mismas piezas).
2. **Resource-aware:** con Cabina cap=1 ocupada, la hora saturada NO aparece (igual que QA Fase 4).
3. **Degradacion 1 doctor:** Demo Bot (1 doctor) agenda igual que siempre, sin paso de profesional.
4. **Consulta previa:** paciente NUEVO elige servicio con `requires_prior_consult=true` → bot ofrece
   la consulta primero. Paciente recurrente → agenda directo el procedimiento.
5. **Precio:** servicio con `price` → aparece en confirmacion.
6. **tsc --noEmit OK** + deploy bot-handler.
