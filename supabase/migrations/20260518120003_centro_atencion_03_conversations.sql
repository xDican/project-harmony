-- Sprint 0 Migration 3/7: Tabla conversations (entidad principal del inbox)
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- UNIQUE(whatsapp_line_id, patient_phone): una conversacion por linea+paciente.

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_line_id UUID NOT NULL REFERENCES public.whatsapp_lines(id) ON DELETE CASCADE,
  patient_phone TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  status TEXT NOT NULL DEFAULT 'bot_active'
    CHECK (status IN ('bot_active', 'human_active', 'closed', 'pending')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_inbound_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_line_id, patient_phone)
);

CREATE INDEX conv_org_status_lastmsg_idx
  ON public.conversations(organization_id, status, last_message_at DESC);
CREATE INDEX conv_assigned_idx
  ON public.conversations(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX conv_patient_idx
  ON public.conversations(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX conv_unread_idx
  ON public.conversations(organization_id, unread_count) WHERE unread_count > 0;
CREATE INDEX conv_urgency_idx
  ON public.conversations(organization_id, urgency) WHERE urgency = 'high';

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON public.conversations FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY conversations_insert ON public.conversations FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY conversations_update ON public.conversations FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY conversations_delete ON public.conversations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.conversations IS
  'Conversaciones WhatsApp del inbox. Sprint 0 centro de atencion 18 May 2026.';
COMMENT ON COLUMN public.conversations.status IS
  'bot_active: bot atiende. human_active: humano tomo. closed: archivada. pending: sin asignar.';
COMMENT ON COLUMN public.conversations.assigned_to IS
  'Usuario (asistente) asignada a la conversacion cuando status=human_active.';
