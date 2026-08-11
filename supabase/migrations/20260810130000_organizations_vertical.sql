-- Rubro de organizacion (clinica / bienes raices) — piloto Bruno, 10 Ago 2026.
-- Fase 0 cerrada en conversacion con Diego: fijo para siempre (sin UI de
-- cliente para cambiarlo, solo SQL directo). DEFAULT 'clinica' hace backfill
-- automatico de las orgs existentes (todas clinicas hoy).
-- Memoria: project_rubro-organizacion-onboarding.md

ALTER TABLE public.organizations
  ADD COLUMN vertical text NOT NULL DEFAULT 'clinica'
  CHECK (vertical IN ('clinica', 'bienes_raices'));

COMMENT ON COLUMN public.organizations.vertical IS
  'Rubro de la organizacion, fijado al crearse. Inmutable en la practica (sin UI de cliente). Piloto bienes raices Bruno, 10 Ago 2026.';
