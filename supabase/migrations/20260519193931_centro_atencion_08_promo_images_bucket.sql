-- Sprint 5 Migration 1/1: Storage bucket promo-images + RLS por org_id
-- Path convention: {organization_id}/promo-{uuid}.{ext}
-- Privado, max 5MB, solo imagenes (jpeg/png/webp).

-- Meta WhatsApp NO acepta WebP en mensajes image (error 131053 "Media upload error").
-- Restringimos a JPG/PNG para que el bot siempre pueda enviar las promos al paciente.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promo-images',
  'promo-images',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drops idempotentes para que la migration se pueda re-aplicar sin error
-- (algunas policies pudieron haber sido creadas via SQL directo antes).
DROP POLICY IF EXISTS promo_images_select ON storage.objects;
DROP POLICY IF EXISTS promo_images_insert ON storage.objects;
DROP POLICY IF EXISTS promo_images_update ON storage.objects;
DROP POLICY IF EXISTS promo_images_delete ON storage.objects;

-- SELECT: usuarios de la org pueden ver imagenes de su org
CREATE POLICY promo_images_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'promo-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- INSERT: usuarios de la org pueden subir a su carpeta
CREATE POLICY promo_images_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'promo-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- UPDATE: usuarios de la org pueden actualizar metadata
CREATE POLICY promo_images_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'promo-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- DELETE: solo admin puede borrar
CREATE POLICY promo_images_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'promo-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

COMMENT ON POLICY promo_images_select ON storage.objects IS
  'promo-images: read solo imagenes de orgs del usuario. Sprint 5 centro atencion.';
