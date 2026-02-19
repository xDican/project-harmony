-- Step 13.1: Create bot_faqs table for configurable FAQ system
-- Supports doctor-level, clinic-level, and org-level FAQs with priority

CREATE TABLE IF NOT EXISTS public.bot_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant scoping
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,

  -- Scope priority: 1=doctor, 2=clinic, 3=org (lower = higher priority)
  scope_priority INTEGER NOT NULL DEFAULT 3,

  -- FAQ content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Array of keywords for fuzzy search

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (
    (scope_priority = 1 AND doctor_id IS NOT NULL AND clinic_id IS NULL) OR
    (scope_priority = 2 AND clinic_id IS NOT NULL AND doctor_id IS NULL) OR
    (scope_priority = 3 AND doctor_id IS NULL AND clinic_id IS NULL)
  ),
  CHECK (LENGTH(question) >= 5 AND LENGTH(question) <= 500),
  CHECK (LENGTH(answer) >= 10 AND LENGTH(answer) <= 2000)
);

-- Indexes for performance
CREATE INDEX idx_bot_faqs_org_id ON public.bot_faqs(organization_id);
CREATE INDEX idx_bot_faqs_clinic_id ON public.bot_faqs(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX idx_bot_faqs_doctor_id ON public.bot_faqs(doctor_id) WHERE doctor_id IS NOT NULL;
CREATE INDEX idx_bot_faqs_scope_priority ON public.bot_faqs(scope_priority);
CREATE INDEX idx_bot_faqs_is_active ON public.bot_faqs(is_active) WHERE is_active = true;
CREATE INDEX idx_bot_faqs_keywords ON public.bot_faqs USING GIN(keywords);

-- RLS Policies
ALTER TABLE public.bot_faqs ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin/secretary can see org FAQs, doctors see their own + clinic + org
CREATE POLICY "bot_faqs_select_org" ON public.bot_faqs
FOR SELECT TO authenticated
USING (
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
  OR
  (
    has_role(auth.uid(), 'doctor'::app_role)
    AND (
      -- Doctor's own FAQs
      doctor_id = current_doctor_id()
      OR
      -- Clinic FAQs for doctor's clinics (via calendar_doctors)
      (clinic_id IN (
        SELECT c.clinic_id FROM public.calendars c
        JOIN public.calendar_doctors cd ON cd.calendar_id = c.id
        WHERE cd.doctor_id = current_doctor_id()
      ))
      OR
      -- Org FAQs
      (doctor_id IS NULL AND clinic_id IS NULL AND organization_id IN (SELECT get_user_organizations(auth.uid())))
    )
  )
);

-- INSERT: Admin/secretary can create org/clinic FAQs, doctors can create their own
CREATE POLICY "bot_faqs_insert_org" ON public.bot_faqs
FOR INSERT TO authenticated
WITH CHECK (
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
  OR
  (
    has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = current_doctor_id()
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
);

-- UPDATE: Same rules as INSERT
CREATE POLICY "bot_faqs_update_org" ON public.bot_faqs
FOR UPDATE TO authenticated
USING (
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
  OR
  (
    has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = current_doctor_id()
  )
)
WITH CHECK (
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
  OR
  (
    has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = current_doctor_id()
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
);

-- DELETE: Same rules as UPDATE
CREATE POLICY "bot_faqs_delete_org" ON public.bot_faqs
FOR DELETE TO authenticated
USING (
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
  OR
  (
    has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = current_doctor_id()
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_bot_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bot_faqs_updated_at_trigger
BEFORE UPDATE ON public.bot_faqs
FOR EACH ROW
EXECUTE FUNCTION update_bot_faqs_updated_at();

-- Insert default FAQs for existing organizations
INSERT INTO public.bot_faqs (organization_id, scope_priority, question, answer, keywords, display_order)
SELECT
  id AS organization_id,
  3 AS scope_priority,
  '¿Cuál es el horario de atención?' AS question,
  'Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM. Para emergencias fuera de horario, por favor comuníquese con nuestra línea de emergencias.' AS answer,
  ARRAY['horario', 'atención', 'horas', 'emergencia'] AS keywords,
  1 AS display_order
FROM public.organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.bot_faqs (organization_id, scope_priority, question, answer, keywords, display_order)
SELECT
  id AS organization_id,
  3 AS scope_priority,
  '¿Cómo puedo cancelar mi cita?' AS question,
  'Puede cancelar su cita a través de este mismo chat seleccionando la opción "Reagendar o Cancelar" en el menú principal. También puede llamarnos directamente.' AS answer,
  ARRAY['cancelar', 'cita', 'reagendar', 'cambiar'] AS keywords,
  2 AS display_order
FROM public.organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.bot_faqs (organization_id, scope_priority, question, answer, keywords, display_order)
SELECT
  id AS organization_id,
  3 AS scope_priority,
  '¿Aceptan seguros médicos?' AS question,
  'Sí, aceptamos la mayoría de los seguros médicos. Por favor contacte a nuestra secretaria para verificar su plan específico.' AS answer,
  ARRAY['seguro', 'médico', 'plan', 'cobertura', 'pago'] AS keywords,
  3 AS display_order
FROM public.organizations
ON CONFLICT DO NOTHING;
