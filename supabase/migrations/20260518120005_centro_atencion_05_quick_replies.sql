-- Sprint 0 Migration 5/7: Tabla quick_replies (Plantillas de respuesta rapida)
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Plantillas que la asistente inserta con 1 click (direccion, horarios, pre-cita, etc.).

CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  category TEXT NOT NULL
    CHECK (category IN ('direccion', 'horarios', 'pago', 'pre_cita', 'post_cita', 'otro')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX qr_org_active_cat_idx
  ON public.quick_replies(organization_id, is_active, category);
CREATE INDEX qr_service_idx
  ON public.quick_replies(service_type_id) WHERE service_type_id IS NOT NULL;
CREATE INDEX qr_clinic_idx
  ON public.quick_replies(clinic_id) WHERE clinic_id IS NOT NULL;

CREATE TRIGGER quick_replies_set_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY quick_replies_select ON public.quick_replies FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY quick_replies_insert ON public.quick_replies FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY quick_replies_update ON public.quick_replies FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY quick_replies_delete ON public.quick_replies FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.quick_replies IS
  'Plantillas de respuesta rapida para la asistente. Sprint 0 centro de atencion 18 May 2026.';
COMMENT ON COLUMN public.quick_replies.category IS
  'direccion, horarios, pago, pre_cita (requisitos previos), post_cita (cuidados), otro.';
