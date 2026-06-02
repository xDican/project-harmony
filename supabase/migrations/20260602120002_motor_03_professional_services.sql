-- Motor de Agendamiento Multi-Recurso — Migration 3/6: professional_services (SKILL MATRIX)
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- M2M doctor(profesional)<->servicio. Que procedimientos puede ejecutar cada profesional.
-- Las tecnicas son filas en `doctors` con user_id NULL (reuso, sin tabla nueva).

CREATE TABLE IF NOT EXISTS public.professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT professional_services_unique UNIQUE (doctor_id, service_type_id)
);

CREATE INDEX IF NOT EXISTS professional_services_doctor_idx ON public.professional_services(doctor_id);
CREATE INDEX IF NOT EXISTS professional_services_service_idx ON public.professional_services(service_type_id);
CREATE INDEX IF NOT EXISTS professional_services_org_active_idx ON public.professional_services(organization_id, is_active);

DROP TRIGGER IF EXISTS professional_services_set_updated_at ON public.professional_services;
CREATE TRIGGER professional_services_set_updated_at
  BEFORE UPDATE ON public.professional_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_services_select ON public.professional_services;
CREATE POLICY professional_services_select ON public.professional_services FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS professional_services_insert ON public.professional_services;
CREATE POLICY professional_services_insert ON public.professional_services FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS professional_services_update ON public.professional_services;
CREATE POLICY professional_services_update ON public.professional_services FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS professional_services_delete ON public.professional_services;
CREATE POLICY professional_services_delete ON public.professional_services FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.professional_services IS
  'Skill matrix: que servicios puede ejecutar cada profesional (doctor o tecnica). Motor multi-recurso 2 Jun 2026.';
