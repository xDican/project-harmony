-- Motor de Agendamiento Multi-Recurso — Migration 4/6: extender service_types
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- buffer_minutes = limpieza entre pacientes (Skin Medic = 10; default 0 = clientes actuales sin buffer).
-- price = precio pre-establecido (el bot puede darlo, B5.4).
-- requires_prior_consult = paciente nuevo debe ver al doctor primero (regla A3.4 Skin Medic).

ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS requires_prior_consult BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.service_types.buffer_minutes IS
  'Minutos de limpieza/setup entre pacientes que ocupan cabina+profesional (no la maquina). Default 0.';
COMMENT ON COLUMN public.service_types.requires_prior_consult IS
  'Si true, paciente nuevo debe agendar consulta con doctor antes de este procedimiento.';
