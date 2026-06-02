-- Motor de Agendamiento Multi-Recurso — Migration 2/6: service_resources (la RECETA)
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- M2M servicio<->recurso. Un servicio puede requerir N recursos (ej: laser = cabina + maquina laser).
-- Patron junction espejo de doctor_patients (incluye organization_id para RLS directa).

CREATE TABLE IF NOT EXISTS public.service_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_resources_unique UNIQUE (service_type_id, resource_id)
);

CREATE INDEX IF NOT EXISTS service_resources_service_idx ON public.service_resources(service_type_id);
CREATE INDEX IF NOT EXISTS service_resources_resource_idx ON public.service_resources(resource_id);
CREATE INDEX IF NOT EXISTS service_resources_org_idx ON public.service_resources(organization_id);

-- RLS
ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_resources_select ON public.service_resources;
CREATE POLICY service_resources_select ON public.service_resources FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS service_resources_insert ON public.service_resources;
CREATE POLICY service_resources_insert ON public.service_resources FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS service_resources_update ON public.service_resources;
CREATE POLICY service_resources_update ON public.service_resources FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS service_resources_delete ON public.service_resources;
CREATE POLICY service_resources_delete ON public.service_resources FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.service_resources IS
  'Receta: que recursos (y cuantas unidades) consume cada servicio. Motor multi-recurso 2 Jun 2026.';
