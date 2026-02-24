CREATE OR REPLACE FUNCTION public.find_or_create_patient(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_doctor_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient RECORD;
  v_org_id UUID;
  v_is_existing BOOLEAN := FALSE;
BEGIN
  v_org_id := p_organization_id;
  IF v_org_id IS NULL AND p_doctor_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM doctors WHERE id = p_doctor_id;
  END IF;

  IF p_phone IS NOT NULL AND p_phone <> '' AND v_org_id IS NOT NULL THEN
    SELECT * INTO v_patient
    FROM patients
    WHERE phone = p_phone
      AND organization_id = v_org_id
    LIMIT 1;
  END IF;

  -- Use FOUND (set by SELECT INTO) instead of v_patient.id IS NOT NULL
  IF FOUND THEN
    v_is_existing := TRUE;
  ELSE
    INSERT INTO patients (name, phone, email, notes, doctor_id, organization_id)
    VALUES (p_name, p_phone, p_email, p_notes, p_doctor_id, v_org_id)
    RETURNING * INTO v_patient;
  END IF;

  IF p_doctor_id IS NOT NULL AND v_patient.id IS NOT NULL AND v_org_id IS NOT NULL THEN
    INSERT INTO doctor_patients (doctor_id, patient_id, organization_id)
    VALUES (p_doctor_id, v_patient.id, v_org_id)
    ON CONFLICT (doctor_id, patient_id) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'id', v_patient.id,
    'name', v_patient.name,
    'phone', v_patient.phone,
    'email', v_patient.email,
    'notes', v_patient.notes,
    'created_at', v_patient.created_at,
    'is_existing', v_is_existing
  );
END;
$$;
