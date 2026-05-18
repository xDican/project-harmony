-- Sprint 0 Migration 4/7: Tabla promotions (Promociones del mes)
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Feature diferenciador descubierto en Mendoza (estetica): publicidad rota cada 30 dias.

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  conditions TEXT,
  image_url TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'archived')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from)
);

CREATE INDEX promo_org_status_idx
  ON public.promotions(organization_id, status);
CREATE INDEX promo_validto_active_idx
  ON public.promotions(valid_to) WHERE status = 'active';
CREATE INDEX promo_service_idx
  ON public.promotions(service_type_id) WHERE service_type_id IS NOT NULL;
CREATE INDEX promo_clinic_idx
  ON public.promotions(clinic_id) WHERE clinic_id IS NOT NULL;

CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY promotions_select ON public.promotions FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY promotions_insert ON public.promotions FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY promotions_update ON public.promotions FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY promotions_delete ON public.promotions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.promotions IS
  'Promociones del mes que rotan cada ~30 dias. Sprint 0 centro de atencion 18 May 2026.';
COMMENT ON COLUMN public.promotions.keywords IS
  'Palabras adicionales que el bot detecta para sugerir esta promo (ej. "oferta", "descuento").';
