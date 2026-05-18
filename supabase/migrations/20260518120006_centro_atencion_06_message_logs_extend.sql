-- Sprint 0 Migration 6/7: Extender message_logs con campos del inbox
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Decision: extender la tabla existente en vez de crear `messages` nueva.
-- Recordatorios y mensajes de conversacion conviven. Queries inbox: WHERE conversation_id IS NOT NULL.
-- Todas las columnas nullable para no romper inserts existentes.

ALTER TABLE public.message_logs
  ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN source TEXT
    CHECK (source IN ('patient', 'bot', 'assistant', 'template', 'system')),
  ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'audio', 'image', 'document', 'voice_call', 'system')),
  ADD COLUMN transcription TEXT,
  ADD COLUMN media_url TEXT,
  ADD COLUMN media_mime TEXT,
  ADD COLUMN call_duration_seconds INTEGER,
  ADD COLUMN call_direction TEXT
    CHECK (call_direction IN ('inbound', 'outbound')),
  ADD COLUMN sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX ml_conv_idx
  ON public.message_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX ml_conv_created_idx
  ON public.message_logs(conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;
CREATE INDEX ml_message_type_idx
  ON public.message_logs(message_type) WHERE message_type != 'text';

COMMENT ON COLUMN public.message_logs.conversation_id IS
  'FK a conversations. NULL para recordatorios/templates fuera de conversacion (legacy). Sprint 0.';
COMMENT ON COLUMN public.message_logs.source IS
  'patient: inbound del paciente. bot: respuesta automatica. assistant: humano. template: template enviada. system: evento sistema.';
COMMENT ON COLUMN public.message_logs.message_type IS
  'text default. audio/image/document para multimedia. voice_call para llamadas WhatsApp.';
COMMENT ON COLUMN public.message_logs.transcription IS
  'Texto transcrito de audio (Whisper). Sprint 2 lo poblara.';
COMMENT ON COLUMN public.message_logs.sent_by IS
  'Usuario que envio el mensaje cuando source=assistant. NULL si bot/system.';
