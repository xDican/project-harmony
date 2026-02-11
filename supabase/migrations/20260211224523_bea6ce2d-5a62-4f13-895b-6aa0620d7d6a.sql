
CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  access_token text NOT NULL,
  token_type text DEFAULT 'bearer',
  expires_at timestamptz,
  waba_id text,
  phone_number_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own connection"
  ON public.meta_connections FOR SELECT
  USING (doctor_id = public.current_doctor_id());
