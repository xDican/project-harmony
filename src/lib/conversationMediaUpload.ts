/**
 * conversationMediaUpload — sube archivos al bucket conversation-media desde
 * el frontend para envio outbound.
 *
 * Sprint 4 (Centro de Atencion).
 *
 * Path convention para outbound: `{orgId}/{convId}/outbound-{uuid}.{ext}`.
 * `inbox-send` valida que el path empiece con `${organization_id}/` y bypasea
 * RLS con service role para descargar. El RLS de Storage permite upload al
 * org-folder del usuario.
 *
 * Validacion cliente (segunda barrera ya existe en bucket policy):
 *   - Tamaño max 25 MB (26214400 bytes)
 *   - MIME whitelist (image/jpeg|png|webp|gif, audio/*, application/pdf)
 *
 * Retorna `{ path, mime, kind }` donde `kind` es el `message_type` que espera
 * inbox-send (image | audio | document).
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "conversation-media";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

type MediaKind = "image" | "audio" | "document";

const ALLOWED_MIMES: Record<string, { kind: MediaKind; ext: string }> = {
  // Imagen
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  // Audio
  "audio/ogg": { kind: "audio", ext: "ogg" },
  "audio/mpeg": { kind: "audio", ext: "mp3" },
  "audio/mp4": { kind: "audio", ext: "m4a" },
  "audio/webm": { kind: "audio", ext: "webm" },
  "audio/aac": { kind: "audio", ext: "aac" },
  "audio/x-m4a": { kind: "audio", ext: "m4a" },
  // Documento
  "application/pdf": { kind: "document", ext: "pdf" },
};

export interface UploadConversationMediaArgs {
  orgId: string;
  conversationId: string;
  file: File;
}

export interface UploadConversationMediaResult {
  /** Path dentro del bucket `conversation-media` */
  path: string;
  /** MIME type del archivo subido */
  mime: string;
  /** Tipo logico para inbox-send (image | audio | document) */
  kind: MediaKind;
}

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

/**
 * Genera un UUID aleatorio (preferir crypto.randomUUID, fallback manual).
 */
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback simple (no para crypto seguro, solo unicidad razonable)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function uploadConversationMedia(
  args: UploadConversationMediaArgs,
): Promise<UploadConversationMediaResult> {
  const { orgId, conversationId, file } = args;

  if (!orgId) {
    throw new MediaUploadError("Sin organización activa. Volvé a iniciar sesión.");
  }
  if (!conversationId) {
    throw new MediaUploadError("Conversación no válida.");
  }

  // Tamaño
  if (file.size === 0) {
    throw new MediaUploadError("El archivo está vacío.");
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new MediaUploadError(
      `El archivo pesa ${mb} MB. El máximo permitido es 25 MB.`,
    );
  }

  // MIME
  const mime = file.type || "";
  const def = ALLOWED_MIMES[mime];
  if (!def) {
    throw new MediaUploadError(
      `Tipo de archivo no permitido (${mime || "desconocido"}). Solo imagen, PDF o audio.`,
    );
  }

  const path = `${orgId}/${conversationId}/outbound-${generateUuid()}.${def.ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    console.error("[conversationMediaUpload] upload failed:", error);
    throw new MediaUploadError(
      `No se pudo subir el archivo: ${error.message}`,
    );
  }

  return {
    path: data.path,
    mime,
    kind: def.kind,
  };
}

/**
 * Lista de extensiones aceptadas para input file `accept` por categoria.
 */
export const FILE_ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  document: "application/pdf",
  audio: "audio/ogg,audio/mpeg,audio/mp4,audio/webm,audio/aac,audio/x-m4a",
} as const;
