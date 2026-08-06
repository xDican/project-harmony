-- Agrega 'sticker' y 'video' como message_type validos en message_logs.
-- Bug real (6 Ago): stickers nunca se detectaban (caian a 'text' con body null,
-- burbuja vacia en el inbox); video se remapeaba a 'document' desde Sprint 1.
-- El bucket conversation-media ya acepta image/webp (formato nativo de stickers),
-- no requiere cambios de Storage.

ALTER TABLE public.message_logs
  DROP CONSTRAINT message_logs_message_type_check,
  ADD CONSTRAINT message_logs_message_type_check
    CHECK (message_type IN ('text', 'audio', 'image', 'document', 'video', 'sticker', 'voice_call', 'system'));

COMMENT ON COLUMN public.message_logs.message_type IS
  'text default. audio/image/document/video/sticker para multimedia. voice_call para llamadas WhatsApp.';
