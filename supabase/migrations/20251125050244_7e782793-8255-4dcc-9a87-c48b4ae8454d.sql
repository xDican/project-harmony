-- Migration: Allow admins to read all user roles
-- Description: Admins need to see all user roles in the users list

-- Add policy for admins to read all roles
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
