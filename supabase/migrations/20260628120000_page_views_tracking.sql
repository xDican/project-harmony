-- Tracking sencillo de navegacion: 1 fila por vista de pagina de un usuario autenticado.
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  path text NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_org_created_idx ON public.page_views (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_user_created_idx ON public.page_views (user_id, created_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Cada usuario autenticado solo puede registrar SUS propias vistas
CREATE POLICY page_views_insert_own ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Los admins pueden leer las vistas de su propia organizacion (para un futuro dashboard interno)
CREATE POLICY page_views_select_org_admin ON public.page_views
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  );
