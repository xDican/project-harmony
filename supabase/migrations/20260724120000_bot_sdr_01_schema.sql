-- Bot SDR híbrido — Fase 1: schema + RLS
-- Plan: .claude/plans/atomic-sauteeing-hummingbird.md (Fase 0 en memory/project_bot-sdr-hibrido.md)
-- Alcance: flags de precio público y modo SDR, embudo de lead en conversations,
-- propuestas de FAQ con aprobación, telemetría de llamadas LLM.

-- ============================================================
-- 1. service_types: visibilidad de precio para el bot SDR
-- ============================================================
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS price_is_public BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.service_types.price_is_public IS
  'true = el bot SDR cotiza el precio exacto al lead; false = responde "se determina en la evaluación". Eje independiente de requires_prior_consult (regla de agendamiento).';

-- ============================================================
-- 2. whatsapp_lines: switch del modo SDR por línea
-- ============================================================
ALTER TABLE public.whatsapp_lines
  ADD COLUMN IF NOT EXISTS sdr_mode_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.whatsapp_lines.sdr_mode_enabled IS
  'Modo SDR (capa LLM para leads en lenguaje libre). bot_enabled sigue controlando el bot clásico; sdr_mode_enabled solo actúa si bot_enabled=true (validado en app/edge, no constraint).';

-- ============================================================
-- 3. conversations: embudo del lead
-- ============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS lead_stage TEXT NULL
    CHECK (lead_stage IS NULL OR lead_stage IN
      ('nuevo','calificando','cotizado','agendado','seguimiento','handoff','perdido')),
  ADD COLUMN IF NOT EXISTS interest_service_type_id UUID NULL
    REFERENCES public.service_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_stage_updated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.conversations.lead_stage IS
  'Etapa del embudo SDR. NULL = la conversación no es lead (paciente existente o línea sin SDR). Transiciones las escribe el backend (bot-handler/inbox), sin trigger.';

CREATE INDEX IF NOT EXISTS conv_lead_stage_idx
  ON public.conversations(organization_id, lead_stage)
  WHERE lead_stage IS NOT NULL;

-- ============================================================
-- 4. bot_faq_proposals: gaps detectados → FAQ con aprobación humana
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bot_faq_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_line_id UUID NULL REFERENCES public.whatsapp_lines(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (length(question) >= 5 AND length(question) <= 500),
  suggested_answer TEXT NULL
    CHECK (suggested_answer IS NULL OR (length(suggested_answer) >= 10 AND length(suggested_answer) <= 2000)),
  evidence_count INTEGER NOT NULL DEFAULT 1,
  last_asked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_faq_id UUID NULL REFERENCES public.bot_faqs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bot_faq_proposals IS
  'Preguntas que el bot SDR no pudo responder (gaps). El pipeline (service role) las inserta y deduplica; admin/secretary de la org aprueban → se materializa en bot_faqs vía approve_faq_proposal().';

CREATE INDEX IF NOT EXISTS faq_prop_org_status_idx
  ON public.bot_faq_proposals(organization_id, status)
  WHERE status = 'pending';

CREATE TRIGGER bot_faq_proposals_set_updated_at
  BEFORE UPDATE ON public.bot_faq_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bot_faq_proposals ENABLE ROW LEVEL SECURITY;

-- Sin policy de INSERT: solo el pipeline del bot (service role) crea propuestas.
CREATE POLICY bot_faq_proposals_select ON public.bot_faq_proposals FOR SELECT
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role))
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );
CREATE POLICY bot_faq_proposals_update ON public.bot_faq_proposals FOR UPDATE
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role))
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role))
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );
CREATE POLICY bot_faq_proposals_delete ON public.bot_faq_proposals FOR DELETE
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role))
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

-- ============================================================
-- 5. approve_faq_proposal: materializa la FAQ de forma atómica
-- ============================================================
-- SECURITY INVOKER a propósito: corre bajo la RLS del usuario (org + rol ya
-- limitados por las policies de bot_faq_proposals y bot_faqs).
CREATE OR REPLACE FUNCTION public.approve_faq_proposal(
  p_proposal_id UUID,
  p_final_answer TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_proposal public.bot_faq_proposals%ROWTYPE;
  v_answer TEXT;
  v_faq_id UUID;
BEGIN
  SELECT * INTO v_proposal
  FROM public.bot_faq_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND: la propuesta no existe o no es visible para este usuario'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_proposal.status <> 'pending' THEN
    RAISE EXCEPTION 'PROPOSAL_ALREADY_REVIEWED: la propuesta ya fue % ', v_proposal.status
      USING ERRCODE = 'P0003';
  END IF;

  v_answer := COALESCE(p_final_answer, v_proposal.suggested_answer);
  IF v_answer IS NULL THEN
    RAISE EXCEPTION 'PROPOSAL_NO_ANSWER: la propuesta no tiene respuesta sugerida; pase una respuesta final'
      USING ERRCODE = 'P0004';
  END IF;

  -- keywords vacíos: el modo SDR lee FAQs semánticamente; para el bot clásico
  -- el admin puede agregar keywords después en la UI de FAQs existente.
  INSERT INTO public.bot_faqs (organization_id, question, answer, keywords, scope_priority, is_active)
  VALUES (v_proposal.organization_id, v_proposal.question, v_answer, '{}', 3, true)
  RETURNING id INTO v_faq_id;

  UPDATE public.bot_faq_proposals
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      created_faq_id = v_faq_id
  WHERE id = p_proposal_id;

  RETURN v_faq_id;
END;
$$;

COMMENT ON FUNCTION public.approve_faq_proposal(UUID, TEXT) IS
  'Aprueba una propuesta de FAQ del bot SDR: crea la fila en bot_faqs y marca la propuesta como approved, en una sola transacción. Rechazar es un UPDATE simple de status (no necesita función).';

-- ============================================================
-- 6. llm_call_logs: telemetría de llamadas LLM (costos + benchmark)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.llm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,        -- 'intent' | 'reply' | 'distill' | 'benchmark'
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NULL,
  tokens_out INTEGER NULL,
  latency_ms INTEGER NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.llm_call_logs IS
  'Log de llamadas a LLM del bot SDR (costos, latencia, benchmark Fase 2). RLS sin policies a propósito: solo service role escribe/lee; los clientes no ven esta tabla.';

CREATE INDEX IF NOT EXISTS llm_logs_org_created_idx
  ON public.llm_call_logs(organization_id, created_at);

ALTER TABLE public.llm_call_logs ENABLE ROW LEVEL SECURITY;
