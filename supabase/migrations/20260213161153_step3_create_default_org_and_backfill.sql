-- STEP 3: Create default org + backfill data (data migration)
DO $$
DECLARE
  _org_id uuid;
  _clinic_id uuid;
  _admin_user_id uuid;
BEGIN
  -- Find an admin user to be the owner
  SELECT user_id INTO _admin_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;

  -- Create the default organization
  INSERT INTO public.organizations (name, slug, owner_user_id)
  VALUES ('OrionCare', 'orioncare', _admin_user_id)
  RETURNING id INTO _org_id;

  -- Create default clinic
  INSERT INTO public.clinics (organization_id, name)
  VALUES (_org_id, 'Clínica Principal')
  RETURNING id INTO _clinic_id;

  -- Create a calendar per doctor and link them
  INSERT INTO public.calendars (organization_id, clinic_id, name)
  SELECT _org_id, _clinic_id, 'Agenda de ' || d.name
  FROM public.doctors d;

  INSERT INTO public.calendar_doctors (calendar_id, doctor_id)
  SELECT c.id, d.id
  FROM public.doctors d
  JOIN public.calendars c ON c.name = 'Agenda de ' || d.name
    AND c.organization_id = _org_id;

  -- Backfill organization_id on all existing tables
  UPDATE public.doctors SET organization_id = _org_id WHERE organization_id IS NULL;
  UPDATE public.secretaries SET organization_id = _org_id WHERE organization_id IS NULL;
  UPDATE public.patients SET organization_id = _org_id WHERE organization_id IS NULL;
  UPDATE public.appointments SET organization_id = _org_id WHERE organization_id IS NULL;
  UPDATE public.message_logs SET organization_id = _org_id WHERE organization_id IS NULL;
  UPDATE public.meta_oauth_states SET organization_id = _org_id WHERE organization_id IS NULL;

  -- Backfill calendar_id on appointments (match via doctor -> calendar_doctors)
  UPDATE public.appointments a
  SET calendar_id = cd.calendar_id
  FROM public.calendar_doctors cd
  WHERE cd.doctor_id = a.doctor_id AND a.calendar_id IS NULL;

  -- Backfill calendar_id on doctor_schedules
  UPDATE public.doctor_schedules ds
  SET calendar_id = cd.calendar_id
  FROM public.calendar_doctors cd
  WHERE cd.doctor_id = ds.doctor_id AND ds.calendar_id IS NULL;

  -- Migrate user_roles -> org_members
  INSERT INTO public.org_members (organization_id, user_id, role, doctor_id, secretary_id)
  SELECT _org_id, ur.user_id, ur.role, u.doctor_id, u.secretary_id
  FROM public.user_roles ur
  JOIN public.users u ON u.id = ur.user_id
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

END $$;
