-- Coexistence — estado de sincronizacion de historial por linea.
--
-- Al vincular un numero via coexistence (QR scan), el cliente puede compartir
-- su historial: Meta inyecta 5-15 min de mensajes historicos via webhook.
-- Estas columnas permiten:
--   - sync_in_progress: la linea esta recibiendo el flood de historial (badge UI + gate de routing).
--   - last_historical_webhook_at: ultimo mensaje historico recibido (debounce del watchdog:
--     no hay evento history_sync_completed de Meta; si pasan >5 min sin updates, el sync termino).

ALTER TABLE public.whatsapp_lines
  ADD COLUMN IF NOT EXISTS sync_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_historical_webhook_at TIMESTAMPTZ;

COMMENT ON COLUMN public.whatsapp_lines.sync_in_progress IS
  'Coexistence: TRUE mientras la linea recibe el flood de historial post-QR-scan. Lo apaga el watchdog tras 5 min sin mensajes historicos.';
COMMENT ON COLUMN public.whatsapp_lines.last_historical_webhook_at IS
  'Coexistence: timestamp del ultimo mensaje historico recibido. Debounce para detectar fin de sync.';
