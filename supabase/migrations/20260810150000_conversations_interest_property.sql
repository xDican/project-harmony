-- Integracion bot-handler/meta-webhook con propiedades (piloto Bruno).
-- Fase 1 (10 Ago 2026, sesion aparte de la del catalogo). Mismo patron
-- exacto que conversations.interest_service_type_id (medicina): "en que
-- esta interesado este lead", persistido a nivel conversacion.

ALTER TABLE public.conversations
  ADD COLUMN interest_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.conversations.interest_property_id IS
  'Propiedad de interes del lead (bienes raices) — mismo patron que interest_service_type_id (medicina). Se fija cuando se matchea un codigo (referral de Meta o texto plano).';
