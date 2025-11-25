-- Migration: Fix current_doctor_id() function to use user_roles table
-- Description: Update the function to use user_roles instead of the deprecated users.role column
-- Using CREATE OR REPLACE to avoid dependency issues with RLS policies

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.doctor_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = u.id
        AND ur.role = 'doctor'::app_role
    );
$function$;

COMMENT ON FUNCTION public.current_doctor_id() IS 'Returns the doctor_id for the current authenticated user if they have the doctor role in user_roles table';
