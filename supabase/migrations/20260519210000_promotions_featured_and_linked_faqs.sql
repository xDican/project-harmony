-- Sprint 5.1: dos columnas nuevas en promotions para "magia" del bot
--   - is_featured: marca UNA promo por org como destacada del mes (cierre soft-upsell)
--   - related_faq_ids: FAQs cuya respuesta se override por esta promo cuando esta activa

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_faq_ids UUID[] NOT NULL DEFAULT '{}';

-- Unique partial index: solo UNA featured activa por org a la vez
CREATE UNIQUE INDEX IF NOT EXISTS promotions_one_featured_per_org
  ON public.promotions(organization_id)
  WHERE is_featured = true AND status = 'active';

-- Index para query rapido de FAQ override
CREATE INDEX IF NOT EXISTS promotions_related_faqs_gin
  ON public.promotions USING GIN (related_faq_ids)
  WHERE status = 'active' AND array_length(related_faq_ids, 1) > 0;

COMMENT ON COLUMN public.promotions.is_featured IS
  'Promo destacada del mes (1 por org). El bot la menciona al cierre de flujos exitosos.';
COMMENT ON COLUMN public.promotions.related_faq_ids IS
  'FAQs cuya respuesta el bot reemplaza por esta promo cuando esta activa.';
