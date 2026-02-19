-- STEP 4: Add new DB functions and update existing ones

-- New function: org-scoped role check
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
      AND is_active = true
  );
$$;

-- New function: get all orgs for a user
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT organization_id FROM public.org_members
  WHERE user_id = _user_id AND is_active = true;
$$;

-- Update has_role to read from org_members (backward compatible)
-- This works because org_members has the SAME data as user_roles after Step 3
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  );
$$;

-- Update current_doctor_id to use org_members
CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.doctor_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = u.id
        AND om.role = 'doctor'::app_role
        AND om.is_active = true
    );
$$;
