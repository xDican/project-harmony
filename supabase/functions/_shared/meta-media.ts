/**
 * Meta Cloud API media + Supabase Storage helpers.
 * Sprint 2 MVP Centro de Atencion.
 *
 * Flow inbound:
 *   1. resolveMetaMediaUrl(mediaId, token) → URL temporal Meta (vigencia ~5 min)
 *   2. downloadMetaMediaBytes(url, token) → bytes
 *   3. uploadToStorage(...) → path en conversation-media + URL publica firmada
 *
 * Flow outbound:
 *   1. Asistente sube archivo a Storage (frontend usa supabase-js)
 *   2. downloadFromStorage(path) → bytes
 *   3. uploadMetaMedia(bytes, mime, phoneNumberId, token) → mediaId
 *   4. messaging-gateway envia con type=image/audio/document + id=mediaId
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const META_GRAPH_VERSION = "v21.0";
const STORAGE_BUCKET = "conversation-media";

/**
 * Mapping MIME → extension de archivo.
 * Usado para nombrar el objeto en Storage.
 */
const MIME_TO_EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export function extFromMime(mime: string | null | undefined): string {
  if (!mime) return "bin";
  // Strip codecs / charset params: "audio/ogg; codecs=opus" → "audio/ogg"
  const clean = mime.split(";")[0].trim().toLowerCase();
  return MIME_TO_EXT[clean] ?? "bin";
}

/**
 * Extrae el mediaId numerico del placeholder `meta-media:1234567890`.
 * Retorna null si el formato es inesperado.
 */
export function parseMediaIdFromPlaceholder(placeholder: string): string | null {
  if (!placeholder) return null;
  const prefix = "meta-media:";
  if (!placeholder.startsWith(prefix)) return null;
  const id = placeholder.slice(prefix.length).trim();
  return id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// INBOUND: Meta → bytes → Storage
// ---------------------------------------------------------------------------

/**
 * Llama a Meta Graph API para obtener URL temporal del media.
 * GET https://graph.facebook.com/v21.0/{media-id}
 */
export async function resolveMetaMediaUrl(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string; fileSize?: number } | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[meta-media] resolveMetaMediaUrl failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (!data.url || !data.mime_type) {
      console.error("[meta-media] resolveMetaMediaUrl: missing url/mime in response", data);
      return null;
    }

    return {
      url: data.url as string,
      mimeType: data.mime_type as string,
      fileSize: data.file_size as number | undefined,
    };
  } catch (e) {
    console.error("[meta-media] resolveMetaMediaUrl exception:", e);
    return null;
  }
}

/**
 * Descarga el blob desde la URL temporal de Meta.
 * La URL requiere el mismo Bearer token (es CDN protegido).
 */
export async function downloadMetaMediaBytes(
  url: string,
  accessToken: string,
): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error("[meta-media] downloadMetaMediaBytes failed:", res.status);
      return null;
    }

    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (e) {
    console.error("[meta-media] downloadMetaMediaBytes exception:", e);
    return null;
  }
}

export interface UploadToStorageArgs {
  bytes: Uint8Array;
  mime: string;
  orgId: string;
  convId: string;
  messageLogId: string;
}

/**
 * Sube bytes a Supabase Storage bucket `conversation-media`.
 * Path convention: `{org_id}/{conv_id}/{message_log_id}.{ext}`.
 *
 * Bucket es privado. Para servir el archivo al frontend usar `createSignedUrl`
 * o leer via cliente con JWT del user (RLS valida ownership por path).
 *
 * Retorna el path para guardar en `message_logs.media_url`.
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  args: UploadToStorageArgs,
): Promise<{ path: string } | null> {
  const ext = extFromMime(args.mime);
  const path = `${args.orgId}/${args.convId}/${args.messageLogId}.${ext}`;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, args.bytes, {
        contentType: args.mime,
        upsert: true,
      });

    if (error) {
      console.error("[meta-media] uploadToStorage failed:", error.message, { path });
      return null;
    }

    return { path: data.path };
  } catch (e) {
    console.error("[meta-media] uploadToStorage exception:", e);
    return null;
  }
}

/**
 * Descarga bytes desde Storage (para outbound media o reproceso).
 * Usa el cliente con service_role pasado.
 */
export async function downloadFromStorage(
  supabase: SupabaseClient,
  path: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(path);

    if (error || !data) {
      console.error("[meta-media] downloadFromStorage failed:", error?.message);
      return null;
    }

    const buffer = await data.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      mime: data.type || "application/octet-stream",
    };
  } catch (e) {
    console.error("[meta-media] downloadFromStorage exception:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// OUTBOUND: bytes → Meta Media API → mediaId
// ---------------------------------------------------------------------------

/**
 * Sube bytes a Meta Cloud API para obtener un mediaId reutilizable.
 * POST https://graph.facebook.com/v21.0/{phone-number-id}/media
 *
 * Retorna el mediaId que despues se usa en /messages con type=image/audio/document.
 */
export async function uploadMetaMedia(
  bytes: Uint8Array,
  mime: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<{ mediaId: string } | null> {
  try {
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mime);

    const ext = extFromMime(mime);
    const blob = new Blob([bytes], { type: mime });
    formData.append("file", blob, `upload.${ext}`);

    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[meta-media] uploadMetaMedia failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (!data.id) {
      console.error("[meta-media] uploadMetaMedia: no id in response", data);
      return null;
    }

    return { mediaId: data.id as string };
  } catch (e) {
    console.error("[meta-media] uploadMetaMedia exception:", e);
    return null;
  }
}

/**
 * Genera signed URL para servir el archivo de Storage al frontend.
 * Expira en `expiresIn` segundos (default 1 hora).
 */
export async function createSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      console.error("[meta-media] createSignedUrl failed:", error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error("[meta-media] createSignedUrl exception:", e);
    return null;
  }
}
