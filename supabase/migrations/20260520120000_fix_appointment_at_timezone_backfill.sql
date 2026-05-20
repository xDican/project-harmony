-- Backfill: corregir appointment_at desfasado 6h en histórico de citas.
--
-- Contexto: create-appointment y update-appointment (versiones <= 19 May 2026)
-- construían appointment_at como `${date}T${time}` sin offset. Postgres lo
-- interpretaba como UTC en lugar de hora Honduras (UTC-6), guardando todas
-- las citas 6h corridas al pasado en hora real.
--
-- Las edge functions ya están parcheadas (offset -06:00 explícito). Esta
-- migración corrige el histórico solo en filas donde appointment_at coincide
-- EXACTAMENTE con el patrón corrupto (date+time interpretado como UTC), lo
-- que excluye filas ya correctas o construidas por otra ruta.
--
-- Honduras no observa horario de verano, así que el offset -06:00 es constante.

UPDATE appointments
SET appointment_at = ((date::text || 'T' || time::text) || '-06:00')::timestamptz
WHERE date IS NOT NULL
  AND time IS NOT NULL
  AND appointment_at IS NOT NULL
  AND appointment_at = ((date::text || 'T' || time::text) || '+00:00')::timestamptz;
