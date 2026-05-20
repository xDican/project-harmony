-- Backfill citas huerfanas creadas por bot-handler (rama createAppointment
-- omitia appointment_at en el INSERT). 144 filas confirmadas al momento de
-- planear la migracion. Reconstruir usando date + time como hora Honduras
-- (UTC-6, sin DST).

UPDATE appointments
SET appointment_at = ((date::text || 'T' || time::text) || '-06:00')::timestamptz
WHERE appointment_at IS NULL
  AND date IS NOT NULL
  AND time IS NOT NULL;

-- Defensa en profundidad: prohibir futuras inserciones sin appointment_at.
-- Si una rama nueva omite la columna, el INSERT fallara con 23502 en lugar
-- de propagar dato corrupto en silencio.
ALTER TABLE appointments
  ALTER COLUMN appointment_at SET NOT NULL;
