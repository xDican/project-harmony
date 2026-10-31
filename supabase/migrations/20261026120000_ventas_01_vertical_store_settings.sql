-- PatPat Live (ventas por WhatsApp desde lives de TikTok) — Fase 1, migracion 1/3.
-- Plan: .claude/plans/quiet-petting-charm.md (Fase 0 cerrada con Diego, 26 Oct 2026).
-- Nuevo rubro 'ventas' + configuracion de tienda por organizacion. Todo lo
-- configurable (prefijo de codigo, tiempo de reserva, datos de pago/entrega)
-- vive aqui y no hardcodeado.

ALTER TABLE public.organizations DROP CONSTRAINT organizations_vertical_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_vertical_check
  CHECK (vertical IN ('clinica', 'bienes_raices', 'ventas'));

CREATE TABLE public.store_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Una letra, sin I ni O (se confunden con 1 y 0 al leer el codigo en pantalla)
  code_prefix text NOT NULL DEFAULT 'A' CHECK (code_prefix ~ '^[A-HJ-NP-Z]$'),
  reservation_minutes integer NOT NULL DEFAULT 30 CHECK (reservation_minutes > 0),
  payment_instructions text,
  pickup_address text,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.store_settings IS
  'Configuracion de tienda por organizacion (vertical ventas / PatPat Live). Editable solo por admin.';

CREATE TRIGGER store_settings_set_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_settings_select ON public.store_settings FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY store_settings_insert ON public.store_settings FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

CREATE POLICY store_settings_update ON public.store_settings FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );
