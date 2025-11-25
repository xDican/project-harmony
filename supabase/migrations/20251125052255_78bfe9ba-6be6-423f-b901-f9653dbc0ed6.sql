-- Migración: Convertir estados de citas de inglés a español y preparar para "no_asistio"
-- Actualiza todos los registros existentes en la tabla appointments

UPDATE appointments 
SET status = CASE 
  WHEN status = 'scheduled' THEN 'agendada'
  WHEN status = 'confirmed' THEN 'confirmada'
  WHEN status = 'canceled' OR status = 'cancelled' THEN 'cancelada'
  WHEN status = 'completed' THEN 'completada'
  WHEN status = 'pending' THEN 'agendada'
  ELSE status
END
WHERE status IN ('scheduled', 'confirmed', 'canceled', 'cancelled', 'completed', 'pending');