-- Sprint 0 Migration 1/7: Helper generico set_updated_at()
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Reuso: replicado patron de update_bot_faqs_updated_at() pero generico.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger generico para mantener updated_at. Sprint 0 centro de atencion 18 May 2026.';
