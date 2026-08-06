-- El bucket conversation-media no aceptaba mime types de video -- bug encontrado
-- en vivo (6 Ago) al correr el backfill: un video real de Orthos (3 Ago, no
-- expirado) fallo en el paso de subida a Storage por este motivo.

UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  allowed_mime_types,
  ARRAY['video/mp4', 'video/3gpp']
)
WHERE id = 'conversation-media'
  AND NOT (allowed_mime_types @> ARRAY['video/mp4']);
