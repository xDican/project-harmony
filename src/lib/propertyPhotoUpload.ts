/**
 * propertyPhotoUpload — sube fotos al bucket property-photos.
 *
 * Piloto bienes raices Bruno (10 Ago 2026). Clon de promoImageUpload.ts,
 * adaptado a N fotos por propiedad en vez de 1 sola imagen.
 *
 * Path convention: `{orgId}/property-{uuid}.{ext}`.
 * Validacion cliente (segunda barrera ya existe en bucket policy):
 *   - Tamaño max 5 MB
 *   - MIME whitelist (image/jpeg|png)
 *
 * El path se guarda en `properties.photos` (array — orden = orden de
 * display, primer elemento = foto de portada).
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "property-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Meta WhatsApp solo acepta JPG/PNG en mensajes image confiablemente
// (WebP da error 131053) — el bot eventualmente envia estas fotos a leads.
const ALLOWED_MIMES: Record<string, { ext: string }> = {
  "image/jpeg": { ext: "jpg" },
  "image/png": { ext: "png" },
};

export interface UploadPropertyPhotoArgs {
  orgId: string;
  file: File;
}

export interface UploadPropertyPhotoResult {
  /** Path dentro del bucket `property-photos` */
  path: string;
  /** MIME type del archivo subido */
  mime: string;
}

export class PropertyPhotoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyPhotoUploadError";
  }
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function uploadPropertyPhoto(
  args: UploadPropertyPhotoArgs,
): Promise<UploadPropertyPhotoResult> {
  const { orgId, file } = args;

  if (!orgId) {
    throw new PropertyPhotoUploadError("Sin organización activa. Volvé a iniciar sesión.");
  }

  if (file.size === 0) {
    throw new PropertyPhotoUploadError("La foto está vacía.");
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new PropertyPhotoUploadError(
      `La foto pesa ${mb} MB. El máximo permitido es 5 MB.`,
    );
  }

  const mime = file.type || "";
  const def = ALLOWED_MIMES[mime];
  if (!def) {
    throw new PropertyPhotoUploadError(
      `Tipo de imagen no permitido (${mime || "desconocido"}). Solo JPG o PNG.`,
    );
  }

  const path = `${orgId}/property-${generateUuid()}.${def.ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    console.error("[propertyPhotoUpload] upload failed:", error);
    throw new PropertyPhotoUploadError(
      `No se pudo subir la foto: ${error.message}`,
    );
  }

  return { path: data.path, mime };
}

/**
 * Genera signed URL para mostrar una foto del bucket (1h de validez).
 */
export async function getPropertyPhotoSignedUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) {
    console.warn("[propertyPhotoUpload] signed url failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Borra una foto del bucket. Solo admin pasa la policy DELETE.
 */
export async function deletePropertyPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.warn("[propertyPhotoUpload] delete failed:", error.message);
    // No lanzar — el flujo principal no debe fallar por esto
  }
}
