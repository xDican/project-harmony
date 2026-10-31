-- Piloto bienes raices Bruno: Storage bucket property-photos + RLS por org_id
-- Clon del patron de promo-images (20260519193931_centro_atencion_08_promo_images_bucket.sql)
-- Path convention: {organization_id}/property-{uuid}.{ext}
-- Privado, max 5MB, solo imagenes (jpeg/png) — Meta WhatsApp da error 131053
-- con WebP en mensajes image, y el bot eventualmente envia estas fotos a leads.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS property_photos_select ON storage.objects;
DROP POLICY IF EXISTS property_photos_insert ON storage.objects;
DROP POLICY IF EXISTS property_photos_update ON storage.objects;
DROP POLICY IF EXISTS property_photos_delete ON storage.objects;

CREATE POLICY property_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY property_photos_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY property_photos_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY property_photos_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-photos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

COMMENT ON POLICY property_photos_select ON storage.objects IS
  'property-photos: read solo fotos de orgs del usuario. Piloto bienes raices Bruno, 10 Ago 2026.';
