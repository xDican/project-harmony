-- ============================================================================
-- MIGRACIÓN CRÍTICA: Arquitectura user_roles con enum app_role
-- Esta migración implementa el sistema de roles seguro para prevenir
-- escalamiento de privilegios
-- ============================================================================

-- 1. Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'secretary', 'doctor');

-- 2. Crear tabla user_roles con RLS
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Crear función security definer para verificar roles
-- Previene recursión infinita en RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Políticas RLS para user_roles (explicit deny + read own)
CREATE POLICY "Deny client inserts on user_roles"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on user_roles"
ON public.user_roles
FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Deny client deletes on user_roles"
ON public.user_roles
FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 5. Migrar datos existentes de users.role a user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.users
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- ACTUALIZAR TODAS LAS RLS POLICIES EXISTENTES
-- Reemplazar current_user_role() por has_role()
-- ============================================================================

-- TABLA: appointments (eliminar duplicados y actualizar)
DROP POLICY IF EXISTS "appointments_select_admin_secretary" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_doctor_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_admin_secretary" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_admin_secretary" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_doctor_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_admin" ON public.appointments;
DROP POLICY IF EXISTS "admin or secretary manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "doctor can read own appointments" ON public.appointments;
DROP POLICY IF EXISTS "doctor can update own appointments" ON public.appointments;

-- Políticas consolidadas para appointments
CREATE POLICY "Admin and secretary can manage appointments"
ON public.appointments
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Doctors can view own appointments"
ON public.appointments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role) AND 
  doctor_id = public.current_doctor_id()
);

CREATE POLICY "Doctors can update own appointments"
ON public.appointments
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role) AND 
  doctor_id = public.current_doctor_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'doctor'::app_role) AND 
  doctor_id = public.current_doctor_id()
);

-- TABLA: doctor_schedules
DROP POLICY IF EXISTS "admin manage doctor_schedules" ON public.doctor_schedules;

CREATE POLICY "Admin can manage doctor_schedules"
ON public.doctor_schedules
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- TABLA: doctors
DROP POLICY IF EXISTS "doctors_update_admin" ON public.doctors;
DROP POLICY IF EXISTS "admin or secretary manage doctors" ON public.doctors;

CREATE POLICY "Admin and secretary can manage doctors"
ON public.doctors
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
);

-- TABLA: patients
DROP POLICY IF EXISTS "patients_select_by_roles" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_admin_secretary" ON public.patients;
DROP POLICY IF EXISTS "patients_update_admin_secretary" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_admin" ON public.patients;
DROP POLICY IF EXISTS "admin or secretary manage patients" ON public.patients;
DROP POLICY IF EXISTS "doctor can read own patients" ON public.patients;

-- Políticas consolidadas para patients
CREATE POLICY "Admin and secretary can manage patients"
ON public.patients
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "All authenticated can view patients"
ON public.patients
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role) OR
  (public.has_role(auth.uid(), 'doctor'::app_role) AND EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patients.id 
      AND a.doctor_id = public.current_doctor_id()
  ))
);

-- TABLA: secretaries
DROP POLICY IF EXISTS "secretaries_update_admin" ON public.secretaries;
DROP POLICY IF EXISTS "admin or secretary read secretaries" ON public.secretaries;
DROP POLICY IF EXISTS "admin or secretary manage secretaries" ON public.secretaries;

CREATE POLICY "Admin and secretary can view secretaries"
ON public.secretaries
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Admin can manage secretaries"
ON public.secretaries
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- TABLA: users
DROP POLICY IF EXISTS "Admin can see all users" ON public.users;

CREATE POLICY "Admin can see all users"
ON public.users
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Agregar política DENY explícita a users
CREATE POLICY "Deny client modifications to users"
ON public.users
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- 6. Eliminar función antigua current_user_role()
DROP FUNCTION IF EXISTS public.current_user_role();

-- 7. Mantener columna role en users por compatibilidad temporal (deprecada)
-- NO la eliminamos todavía para evitar romper código existente
-- Se eliminará en una futura migración después de verificar que todo funciona

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- Siguiente paso: Actualizar Edge Functions y frontend para usar user_roles
-- ============================================================================