-- Sprint 0 Migration 7/7: Storage bucket conversation-media + RLS por path
-- Plan: .claude/plans/ok-dise-emos-plan-de-snuggly-penguin.md
-- Path convention: {organization_id}/{conversation_id}/{filename}
-- RLS asegura que solo miembros de la org pueden acceder a su carpeta.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-media',
  'conversation-media',
  false,
  26214400, -- 25 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/aac', 'audio/x-m4a',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- SELECT: usuarios de la org pueden ver media de su org
CREATE POLICY conv_media_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'conversation-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- INSERT: usuarios de la org pueden subir a su carpeta
CREATE POLICY conv_media_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'conversation-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- UPDATE: usuarios de la org pueden actualizar metadata
CREATE POLICY conv_media_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'conversation-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

-- DELETE: solo admin puede borrar
CREATE POLICY conv_media_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'conversation-media'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

COMMENT ON POLICY conv_media_select ON storage.objects IS
  'conversation-media: read solo media de orgs del usuario. Sprint 0.';
