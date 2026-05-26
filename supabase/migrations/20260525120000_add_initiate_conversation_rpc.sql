CREATE OR REPLACE FUNCTION public.initiate_conversation(
  p_organization_id UUID,
  p_patient_phone TEXT,
  p_patient_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_line_id UUID;
  v_phone TEXT;
  v_conv RECORD;
  v_user_orgs UUID[];
BEGIN
  -- 1) Validar pertenencia del caller a la org
  SELECT array_agg(org_id) INTO v_user_orgs
  FROM (SELECT organization_id AS org_id FROM org_members WHERE user_id = auth.uid()) sub;

  IF NOT (p_organization_id = ANY(COALESCE(v_user_orgs, '{}'::UUID[]))) THEN
    -- Fallback: check superadmin_whitelist
    IF NOT EXISTS (SELECT 1 FROM superadmin_whitelist WHERE user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Usuario no pertenece a la organizacion';
    END IF;
  END IF;

  -- 2) Buscar linea WhatsApp activa para la org
  SELECT id INTO v_line_id
  FROM whatsapp_lines
  WHERE organization_id = p_organization_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_line_id IS NULL THEN
    RAISE EXCEPTION 'No hay linea WhatsApp activa para esta organizacion';
  END IF;

  -- 3) Normalizar telefono: strip non-digits, prepend +504 si <=8 digitos
  v_phone := regexp_replace(p_patient_phone, '[^0-9]', '', 'g');
  IF length(v_phone) <= 8 THEN
    v_phone := '504' || v_phone;
  END IF;
  v_phone := '+' || v_phone;

  -- 4) Upsert conversation
  INSERT INTO conversations (
    organization_id,
    whatsapp_line_id,
    patient_phone,
    patient_name,
    status,
    last_message_at
  ) VALUES (
    p_organization_id,
    v_line_id,
    v_phone,
    p_patient_name,
    'bot_active',
    now()
  )
  ON CONFLICT (whatsapp_line_id, patient_phone)
  DO UPDATE SET
    patient_name = COALESCE(EXCLUDED.patient_name, conversations.patient_name),
    updated_at = now()
  RETURNING * INTO v_conv;

  RETURN json_build_object(
    'id', v_conv.id,
    'organization_id', v_conv.organization_id,
    'whatsapp_line_id', v_conv.whatsapp_line_id,
    'patient_phone', v_conv.patient_phone,
    'patient_name', v_conv.patient_name,
    'status', v_conv.status,
    'last_message_at', v_conv.last_message_at
  );
END;
$$;
