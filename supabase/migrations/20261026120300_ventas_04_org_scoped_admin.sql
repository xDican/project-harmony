-- PatPat Live — Fase 1, migracion 4/4: admin acotado a la organizacion.
-- Hallazgo en verificacion: public.has_role(uid, 'admin') mira org_members de
-- CUALQUIER organizacion, asi que un usuario admin en la org A y secretary en
-- la org B pasaria el chequeo de admin sobre la org B. Las politicas de
-- escritura de ventas validan el rol dentro de la propia org con is_org_admin().
-- (Las tablas existentes del repo siguen con has_role; no se tocan aqui.)

CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid()
      AND organization_id = _org
      AND role = 'admin'::public.app_role
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;

ALTER POLICY store_settings_insert ON public.store_settings
  WITH CHECK (public.is_org_admin(organization_id));
ALTER POLICY store_settings_update ON public.store_settings
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

ALTER POLICY products_insert ON public.products
  WITH CHECK (public.is_org_admin(organization_id));
ALTER POLICY products_update ON public.products
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
ALTER POLICY products_delete ON public.products
  USING (public.is_org_admin(organization_id));

ALTER POLICY orders_delete ON public.orders
  USING (public.is_org_admin(organization_id));

ALTER POLICY product_photos_insert ON storage.objects
  WITH CHECK (
    bucket_id = 'product-photos'
    AND public.is_org_admin((storage.foldername(name))[1]::uuid)
  );
ALTER POLICY product_photos_update ON storage.objects
  USING (
    bucket_id = 'product-photos'
    AND public.is_org_admin((storage.foldername(name))[1]::uuid)
  );
ALTER POLICY product_photos_delete ON storage.objects
  USING (
    bucket_id = 'product-photos'
    AND public.is_org_admin((storage.foldername(name))[1]::uuid)
  );
