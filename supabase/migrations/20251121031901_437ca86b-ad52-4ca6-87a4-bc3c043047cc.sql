-- Create secretaries table to store secretary profile information
CREATE TABLE IF NOT EXISTS public.secretaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.secretaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for secretaries table
CREATE POLICY "secretaries_select_all_auth"
  ON public.secretaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "secretaries_update_admin"
  ON public.secretaries
  FOR UPDATE
  TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Add secretary_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS secretary_id UUID REFERENCES public.secretaries(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_secretary_id ON public.users(secretary_id);