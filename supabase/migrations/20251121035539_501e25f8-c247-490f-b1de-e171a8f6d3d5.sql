-- Add RLS policy to allow admins to update doctors
CREATE POLICY "doctors_update_admin"
ON public.doctors
FOR UPDATE
TO authenticated
USING (current_user_role() = 'admin')
WITH CHECK (current_user_role() = 'admin');