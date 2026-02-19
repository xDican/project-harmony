-- Migration: Add doctor_patients junction table
-- Purpose: Allow patients to belong to the organization rather than a single doctor.
--          A junction table controls which doctors see which patients.
--          Any doctor in the org can schedule any org patient (auto-link created).

-- 1) Create doctor_patients junction table
CREATE TABLE IF NOT EXISTS public.doctor_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doctor_patients_unique UNIQUE (doctor_id, patient_id)
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor ON public.doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient ON public.doctor_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_org ON public.doctor_patients(organization_id);

-- 2) Enable RLS + policies
ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;

-- Admin/secretary: full access
CREATE POLICY "Admin and secretary can manage doctor_patients"
ON public.doctor_patients
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'secretary'::app_role)
);

-- Doctors: can see their own links
CREATE POLICY "Doctors can view own patient links"
ON public.doctor_patients
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  AND doctor_id = public.current_doctor_id()
);

-- Doctors: can create their own links
CREATE POLICY "Doctors can insert own patient links"
ON public.doctor_patients
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor'::app_role)
  AND doctor_id = public.current_doctor_id()
);

-- 3) Migrate existing data: seed junction from patients.doctor_id
INSERT INTO public.doctor_patients (doctor_id, patient_id, organization_id)
SELECT p.doctor_id, p.id, p.organization_id
FROM public.patients p
WHERE p.doctor_id IS NOT NULL
  AND p.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4) Make patients.doctor_id nullable (patients now belong to org, not a single doctor)
ALTER TABLE public.patients ALTER COLUMN doctor_id DROP NOT NULL;

-- 5) Update patients RLS: replace appointment-based doctor visibility with doctor_patients-based
DROP POLICY IF EXISTS "All authenticated can view patients" ON public.patients;

CREATE POLICY "All authenticated can view patients"
ON public.patients
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'secretary'::app_role) OR
  (public.has_role(auth.uid(), 'doctor'::app_role) AND EXISTS (
    SELECT 1 FROM public.doctor_patients dp
    WHERE dp.patient_id = patients.id
      AND dp.doctor_id = public.current_doctor_id()
  ))
);
