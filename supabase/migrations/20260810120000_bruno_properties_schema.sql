-- Piloto bienes raices Bruno — Fase 1: tabla properties + property_id en appointments
-- Fase 0: memoria persistente project_piloto-bienes-raices-bruno.md
-- Plan: .claude/plans/piped-marinating-honey.md

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text NOT NULL,
  title text NOT NULL,
  property_type text NOT NULL,
  zone text,
  price numeric,
  currency text NOT NULL DEFAULT 'HNL',
  bedrooms integer,
  bathrooms numeric(3,1),
  size_varas numeric,
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'disponible'
    CHECK (status IN ('disponible','reservada','vendida','inactiva')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

COMMENT ON TABLE public.properties IS
  'Catalogo de propiedades para piloto bienes raices (Bruno, 8 Ago 2026). Org-scoped, mismo patron que service_types.';

-- Autogenerar codigo secuencial por organizacion (COD-101, COD-102, ...)
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.code IS NULL THEN
    SELECT COALESCE(MAX(substring(code from 'COD-(\d+)')::integer), 100) + 1
    INTO next_num
    FROM public.properties
    WHERE organization_id = NEW.organization_id;
    NEW.code := 'COD-' || next_num;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_generate_code
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.generate_property_code();

CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY properties_select ON public.properties FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY properties_insert ON public.properties FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY properties_update ON public.properties FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY properties_delete ON public.properties FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Visita = cita normal + propiedad opcional (sin motor de agenda nuevo)
ALTER TABLE public.appointments
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX idx_appointments_property_id ON public.appointments(property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX idx_properties_org_status ON public.properties(organization_id, status);
