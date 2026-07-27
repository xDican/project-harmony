-- Agrupar mensajes fragmentados antes de invocar al bot (debounce).
-- Fase 0 con Diego 27 Jul: pacientes escriben en ráfagas de varios mensajes
-- cortos en vez de uno (23% de los mensajes reales de Hanoy llegan a <12s del
-- anterior) — sin esto el bot responde fragmento por fragmento, incoherente y
-- desperdiciando llamadas LLM. Piloto: solo líneas con sdr_mode_enabled=true.

-- ============================================================
-- 1. bot_message_debounce: buffer por (línea, paciente)
-- ============================================================
CREATE TABLE public.bot_message_debounce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_line_id UUID NOT NULL REFERENCES public.whatsapp_lines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_phone TEXT NOT NULL,
  patient_id UUID NULL REFERENCES public.patients(id) ON DELETE SET NULL,
  conversation_id UUID NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  messages TEXT[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_line_id, patient_phone)
);

COMMENT ON TABLE public.bot_message_debounce IS
  'Buffer transitorio de mensajes fragmentados por (línea, paciente) mientras bot-debounce-processor espera silencio antes de invocar al bot. Fila vive segundos; se borra sola al procesar (claim_bot_debounce_row). Solo service role la toca.';

ALTER TABLE public.bot_message_debounce ENABLE ROW LEVEL SECURITY;
-- Sin policies de cliente a propósito — plomería interna del bot, service role only.

-- ============================================================
-- 2. enqueue_bot_debounce_message: agrega un fragmento, atómico
-- ============================================================
-- xmax = 0 tras un INSERT ... ON CONFLICT indica si la fila se CREÓ ahora
-- (is_new_claim=true → este caller es dueño de la espera, debe disparar el
-- processor) o si ya existía y solo se le agregó el mensaje (is_new_claim=false
-- → alguien más ya está esperando, no disparar un processor nuevo).
CREATE OR REPLACE FUNCTION public.enqueue_bot_debounce_message(
  p_whatsapp_line_id UUID,
  p_organization_id UUID,
  p_patient_phone TEXT,
  p_patient_id UUID,
  p_conversation_id UUID,
  p_message TEXT
) RETURNS TABLE(debounce_id UUID, is_new_claim BOOLEAN)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_is_new BOOLEAN;
BEGIN
  INSERT INTO public.bot_message_debounce (
    whatsapp_line_id, organization_id, patient_phone, patient_id, conversation_id,
    messages, last_message_at, claimed_at
  ) VALUES (
    p_whatsapp_line_id, p_organization_id, p_patient_phone, p_patient_id, p_conversation_id,
    ARRAY[p_message], now(), now()
  )
  ON CONFLICT (whatsapp_line_id, patient_phone) DO UPDATE
    SET messages = public.bot_message_debounce.messages || p_message,
        last_message_at = now(),
        patient_id = COALESCE(public.bot_message_debounce.patient_id, EXCLUDED.patient_id),
        conversation_id = COALESCE(public.bot_message_debounce.conversation_id, EXCLUDED.conversation_id)
  RETURNING public.bot_message_debounce.id, (xmax = 0) INTO v_id, v_is_new;

  RETURN QUERY SELECT v_id, v_is_new;
END;
$$;

COMMENT ON FUNCTION public.enqueue_bot_debounce_message(UUID, UUID, TEXT, UUID, UUID, TEXT) IS
  'Agrega un fragmento de mensaje al buffer de debounce. is_new_claim=true = este caller creó la fila y debe disparar bot-debounce-processor fire-and-forget; false = ya hay un processor esperando, solo se acumuló el texto.';

-- ============================================================
-- 3. claim_bot_debounce_row: toma posesión atómica para procesar
-- ============================================================
-- Borra la fila SOLO si last_message_at sigue siendo el que el processor
-- observó por última vez — si no devuelve fila, un mensaje nuevo llegó justo
-- en ese instante y el processor debe volver a esperar (cierra la carrera sin
-- perder mensajes: nunca se borra una fila con contenido no visto).
CREATE OR REPLACE FUNCTION public.claim_bot_debounce_row(
  p_id UUID,
  p_expected_last_message_at TIMESTAMPTZ
) RETURNS SETOF public.bot_message_debounce
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.bot_message_debounce
  WHERE id = p_id AND last_message_at = p_expected_last_message_at
  RETURNING *;
$$;

COMMENT ON FUNCTION public.claim_bot_debounce_row(UUID, TIMESTAMPTZ) IS
  'Intento atómico de tomar y borrar la fila para procesarla. Vacío = llegó un mensaje nuevo desde la última lectura del processor, debe re-chequear en vez de proceder.';

-- ============================================================
-- 4. Cron de seguridad: barre filas abandonadas cada minuto
-- ============================================================
-- Si bot-debounce-processor falla a mitad de camino (fetch fire-and-forget que
-- nunca llegó, crash), una fila puede quedar sin nadie procesándola y el
-- paciente se queda sin respuesta. claimed_at > tope de 20s + margen de sobra.
SELECT cron.schedule(
  'bot-debounce-sweep-stuck',
  '* * * * *', -- cada minuto
  $$
  select net.http_post(
    url := 'https://soxrlxvivuplezssgssq.supabase.co/functions/v1/bot-debounce-processor',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U'
    ),
    body := '{}'::jsonb
  );
  $$
);
