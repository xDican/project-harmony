-- Sprint 6 — Calling API WhatsApp
-- 1) Extiende message_logs para registrar lifecycle de llamadas (inbound + outbound).
-- 2) Crea tabla call_permissions para trackear el permission state per conversation.
--
-- El message_type='voice_call' ya esta soportado por el CHECK de Sprint 1.
-- raw_payload (jsonb) se usa para guardar SDP + metadata cruda de cada evento.

-- ============================================================================
-- 1) message_logs — call lifecycle fields
-- ============================================================================

ALTER TABLE public.message_logs
  ADD COLUMN IF NOT EXISTS call_id_meta TEXT,
  ADD COLUMN IF NOT EXISTS call_status TEXT,
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ;

-- Estados validos del lifecycle de una llamada Meta Cloud API.
-- ringing   = call.connect inbound llego, esperando respuesta de la asistente
-- accepted  = asistente apreto "atender", SDP answer enviado (pre_accept + accept ok)
-- rejected  = asistente apreto "rechazar"
-- missed    = no se contesto en ventana, Meta lo cerro
-- connected = media flow activo
-- ended     = call.terminate normal (cualquier lado colgo)
-- failed    = error de Meta o network
ALTER TABLE public.message_logs
  DROP CONSTRAINT IF EXISTS message_logs_call_status_check;
ALTER TABLE public.message_logs
  ADD CONSTRAINT message_logs_call_status_check
  CHECK (call_status IS NULL OR call_status IN
    ('ringing','accepted','rejected','missed','connected','ended','failed'));

CREATE INDEX IF NOT EXISTS idx_message_logs_calls_by_org
  ON public.message_logs (organization_id, call_status, created_at DESC)
  WHERE message_type = 'voice_call';

-- Para UPDATEar filas existentes cuando llegan eventos terminate/permission de la misma call.
CREATE INDEX IF NOT EXISTS idx_message_logs_call_id_meta
  ON public.message_logs (call_id_meta)
  WHERE call_id_meta IS NOT NULL;

COMMENT ON COLUMN public.message_logs.call_id_meta IS
  'Meta Cloud API call_id (distinto del wamid de mensajes). Une eventos connect/terminate de la misma llamada.';
COMMENT ON COLUMN public.message_logs.call_status IS
  'Estado lifecycle de la llamada. Ver CHECK constraint para valores validos.';

-- ============================================================================
-- 2) call_permissions — trackea el permission state per conversation
-- ============================================================================
-- Cuando un negocio quiere llamar OUTBOUND a un paciente, Meta requiere permission
-- previo via mensaje interactivo type='call_permission_request'. El webhook recibe
-- evento permission_update con 'accepted' o 'rejected' y un expiration_timestamp.
-- Esta tabla persiste ese estado para que la UI sepa cuando habilitar el boton
-- "Llamar" vs "Solicitar permiso".

CREATE TABLE IF NOT EXISTS public.call_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('granted','rejected','expired','revoked')),
  granted_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  source          TEXT NOT NULL DEFAULT 'call_permission_request',
  raw_event       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo necesitamos el ultimo permission por conversation para el UI check.
CREATE INDEX IF NOT EXISTS idx_call_permissions_conv_recent
  ON public.call_permissions (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_permissions_org_status
  ON public.call_permissions (organization_id, status, expires_at);

-- RLS: org-scoped lectura/escritura, igual que el resto del inbox.
ALTER TABLE public.call_permissions ENABLE ROW LEVEL SECURITY;

-- Patron consistente con conversations / message_logs.
DROP POLICY IF EXISTS call_permissions_select_own_org ON public.call_permissions;
CREATE POLICY call_permissions_select_own_org ON public.call_permissions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

DROP POLICY IF EXISTS call_permissions_insert_own_org ON public.call_permissions;
CREATE POLICY call_permissions_insert_own_org ON public.call_permissions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_organizations(auth.uid())));

DROP POLICY IF EXISTS call_permissions_update_own_org ON public.call_permissions;
CREATE POLICY call_permissions_update_own_org ON public.call_permissions
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

-- service_role (edge functions) puede hacer cualquier cosa, ya cubierto por BYPASS RLS.

-- ============================================================================
-- 3) Realtime: habilitar replicacion para call_permissions
-- ============================================================================
-- Para que useRealtimeInbox pueda suscribirse a updates.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'call_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_permissions;
  END IF;
END $$;

COMMENT ON TABLE public.call_permissions IS
  'Permission lifecycle per conversation for business-initiated WhatsApp calls. One row per Meta permission_update event.';
