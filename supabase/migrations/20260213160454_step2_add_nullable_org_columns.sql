-- STEP 2: Add nullable columns to existing tables (additive, zero risk)

-- Add organization_id (nullable) to existing tables
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.secretaries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.calendars(id);
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.calendars(id);
ALTER TABLE public.message_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.message_logs ADD COLUMN IF NOT EXISTS whatsapp_line_id UUID REFERENCES public.whatsapp_lines(id);
ALTER TABLE public.meta_oauth_states ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_doctors_org ON public.doctors(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_org ON public.patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_cal ON public.appointments(calendar_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_org ON public.message_logs(organization_id);
