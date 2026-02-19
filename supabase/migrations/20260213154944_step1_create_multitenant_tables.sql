-- STEP 1: Create new multi-tenant tables (additive only, zero risk)

-- 1a. organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  phone TEXT,
  email TEXT,
  country_code TEXT DEFAULT '+504',
  timezone TEXT DEFAULT 'America/Tegucigalpa',
  billing_type TEXT DEFAULT 'organization',
  is_active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. clinics
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1c. org_members
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  secretary_id UUID REFERENCES public.secretaries(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id, role)
);

-- 1d. calendars
CREATE TABLE public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1e. calendar_doctors (many-to-many)
CREATE TABLE public.calendar_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(calendar_id, doctor_id)
);

-- 1f. whatsapp_lines
CREATE TABLE public.whatsapp_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id),
  label TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  provider TEXT DEFAULT 'twilio',
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_from TEXT,
  twilio_messaging_service_sid TEXT,
  twilio_template_confirmation TEXT,
  twilio_template_reminder TEXT,
  twilio_template_reschedule TEXT,
  meta_waba_id TEXT,
  meta_phone_number_id TEXT,
  meta_access_token TEXT,
  bot_enabled BOOLEAN DEFAULT false,
  bot_greeting TEXT,
  default_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1g. whatsapp_line_doctors
CREATE TABLE public.whatsapp_line_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_line_id UUID NOT NULL REFERENCES public.whatsapp_lines(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  UNIQUE(whatsapp_line_id, doctor_id, calendar_id)
);

-- 1h. bot_sessions
CREATE TABLE public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_line_id UUID NOT NULL REFERENCES public.whatsapp_lines(id),
  patient_phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'greeting',
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(whatsapp_line_id, patient_phone)
);

-- Enable RLS on all new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_line_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_org_members_user ON public.org_members(user_id);
CREATE INDEX idx_org_members_org ON public.org_members(organization_id);
CREATE INDEX idx_clinics_org ON public.clinics(organization_id);
CREATE INDEX idx_calendars_org ON public.calendars(organization_id);
CREATE INDEX idx_calendar_doctors_cal ON public.calendar_doctors(calendar_id);
CREATE INDEX idx_calendar_doctors_doc ON public.calendar_doctors(doctor_id);
CREATE INDEX idx_whatsapp_lines_org ON public.whatsapp_lines(organization_id);
CREATE INDEX idx_whatsapp_lines_phone ON public.whatsapp_lines(phone_number);
CREATE INDEX idx_bot_sessions_line_phone ON public.bot_sessions(whatsapp_line_id, patient_phone);
CREATE INDEX idx_bot_sessions_expires ON public.bot_sessions(expires_at);
