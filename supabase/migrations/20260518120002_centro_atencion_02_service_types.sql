-- Sprint 0 Migration 2/7: Tabla service_types + migracion JSONB de whatsapp_lines
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Normaliza whatsapp_lines.bot_service_types (JSONB) a tabla con FK.
-- El JSONB queda intacto (sera el bot-handler quien deje de leerlo en Sprint 1).

CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  whatsapp_line_id UUID REFERENCES public.whatsapp_lines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX service_types_org_active_idx
  ON public.service_types(organization_id, is_active);
CREATE INDEX service_types_clinic_idx
  ON public.service_types(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX service_types_line_idx
  ON public.service_types(whatsapp_line_id) WHERE whatsapp_line_id IS NOT NULL;

CREATE TRIGGER service_types_set_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_types_select ON public.service_types FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY service_types_insert ON public.service_types FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY service_types_update ON public.service_types FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY service_types_delete ON public.service_types FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Migracion data: JSONB whatsapp_lines.bot_service_types -> service_types
-- JSONB shape detectado: [{name: "X", duration_minutes: N}]
-- name LIKE display_name; aliases vacio inicialmente.
INSERT INTO public.service_types
  (organization_id, clinic_id, whatsapp_line_id, name, display_name, duration_minutes, display_order)
SELECT
  wl.organization_id,
  wl.clinic_id,
  wl.id AS whatsapp_line_id,
  LOWER(TRIM(elem->>'name')) AS name,
  TRIM(elem->>'name') AS display_name,
  NULLIF((elem->>'duration_minutes')::TEXT, '')::INTEGER AS duration_minutes,
  (idx - 1) AS display_order
FROM public.whatsapp_lines wl,
  LATERAL jsonb_array_elements(wl.bot_service_types) WITH ORDINALITY AS t(elem, idx)
WHERE wl.bot_service_types IS NOT NULL
  AND jsonb_array_length(wl.bot_service_types) > 0
  AND TRIM(elem->>'name') <> ''
ON CONFLICT (organization_id, name) DO NOTHING;

COMMENT ON TABLE public.service_types IS
  'Tipos de servicio por clinica (botox, resonancia, etc.). Sprint 0 centro de atencion. Migrado desde whatsapp_lines.bot_service_types JSONB.';
