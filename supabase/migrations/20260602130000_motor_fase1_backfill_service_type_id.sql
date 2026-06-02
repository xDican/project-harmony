-- Motor de Agendamiento Multi-Recurso — Fase 1: backfill appointments.service_type_id
-- Consolida service_types como fuente unica de tipos de servicio.
-- Match best-effort por nombre canonico (LOWER+TRIM) dentro de la misma org.
-- Sin match -> queda NULL (historicos / servicios removidos de la config; ej. test org
-- con formato viejo "Consulta general (30 mins)" y servicios descontinuados).
-- Idempotente: solo toca filas con service_type_id NULL.
--
-- Nota: el UPDATE dispara el trigger validate_appointment_resource_capacity
-- (BEFORE UPDATE OF service_type_id). A esta fecha no hay service_resources
-- configurados, por lo que el trigger degrada (loop de 0 iteraciones) y no rechaza.

UPDATE public.appointments a
SET service_type_id = st.id
FROM public.service_types st
WHERE a.service_type_id IS NULL
  AND a.service_type IS NOT NULL
  AND TRIM(a.service_type) <> ''
  AND st.organization_id = a.organization_id
  AND st.name = LOWER(TRIM(a.service_type));
