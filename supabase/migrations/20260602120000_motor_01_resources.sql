-- Motor de Agendamiento Multi-Recurso — Migration 1/6: tabla resources
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- Recursos finitos fungibles (equipos, cabinas, salas). Patron espejo de service_types.
-- La CANTIDAD es lo que hace cumplir la restriccion ("3 laser != 5 citas simultaneas").

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'equipment',  -- 'equipment' | 'room'
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS resources_org_active_idx
  ON public.resources(organization_id, is_active);

DROP TRIGGER IF EXISTS resources_set_updated_at ON public.resources;
CREATE TRIGGER resources_set_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (patron org-scoped verbatim de service_types)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resources_select ON public.resources;
CREATE POLICY resources_select ON public.resources FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS resources_insert ON public.resources;
CREATE POLICY resources_insert ON public.resources FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS resources_update ON public.resources;
CREATE POLICY resources_update ON public.resources FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
DROP POLICY IF EXISTS resources_delete ON public.resources;
CREATE POLICY resources_delete ON public.resources FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.resources IS
  'Recursos finitos fungibles (equipos, cabinas, salas). quantity = unidades disponibles. Motor multi-recurso 2 Jun 2026.';
