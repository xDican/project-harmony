-- ============================================================
-- Phase 3.1: superadmin_whitelist + is_superadmin()
-- RLS enabled, no client policies — service_role only
-- ============================================================
CREATE TABLE superadmin_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE superadmin_whitelist ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo service_role puede acceder

-- Seed: equipo OrionCare
INSERT INTO superadmin_whitelist (email) VALUES ('admin@orioncare.com');

-- is_superadmin(): verifica si un user_id está en la whitelist
CREATE OR REPLACE FUNCTION is_superadmin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM superadmin_whitelist sw
    JOIN auth.users au ON au.email = sw.email
    WHERE au.id = _user_id
  );
$$;
