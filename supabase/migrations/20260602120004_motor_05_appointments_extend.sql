-- Motor de Agendamiento Multi-Recurso — Migration 5/6: extender appointments
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- service_type_id = FK real al catalogo (coexiste con la columna service_type TEXT legacy por compat).
-- visit_id = agrupa N procedimientos de una misma visita (secuenciador). NULL = cita simple.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visit_id UUID;

CREATE INDEX IF NOT EXISTS appointments_service_type_idx
  ON public.appointments(service_type_id) WHERE service_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS appointments_visit_idx
  ON public.appointments(visit_id) WHERE visit_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.service_type_id IS
  'FK al catalogo service_types. La columna service_type (TEXT) queda como display/legacy.';
COMMENT ON COLUMN public.appointments.visit_id IS
  'Agrupa procedimientos consecutivos de una misma visita (secuenciador multi-procedimiento). NULL = cita simple.';
