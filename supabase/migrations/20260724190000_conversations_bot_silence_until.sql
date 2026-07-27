-- Coexistence: silencio automático del bot cuando el humano responde desde
-- la WhatsApp Business App del celular (echo), hasta medianoche del mismo día.
-- Plan: sesión 24 Jul 2026, fix de meta-webhook handleMessageEcho.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS bot_silenced_until TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.conversations.bot_silenced_until IS
  'Fin de la ventana de silencio AUTOMATICO del bot (Coexistence: humano respondió desde el teléfono físico, hasta medianoche Honduras del mismo día). NULL = sin silencio automático activo, o el status human_active actual es un takeover MANUAL indefinido desde el inbox (nunca auto-expira). Ver _shared/conversations.ts: silenceForPhysicalReply / checkAndExpireBotSilence.';
