/**
 * promoImageUpload — sube imagenes al bucket promo-images.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Path convention: `{orgId}/promo-{uuid}.{ext}`.
 * Validacion cliente (segunda barrera ya existe en bucket policy):
 *   - Tamaño max 5 MB
 *   - MIME whitelist (image/jpeg|png|webp)
 *
 * Retorna `{ path, mime }` — el path se guarda en `promotions.image_url`.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "promo-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Meta WhatsApp solo acepta JPG/PNG en mensajes image confiablemente.
// WebP devuelve error 131053 "Media upload error" cuando el bot intenta
// enviarla al paciente. Restringimos al subir para evitar el problema.
const ALLOWED_MIMES: Record<string, { ext: string }> = {
  "image/jpeg": { ext: "jpg" },
  "image/png": { ext: "png" },
};

export interface UploadPromoImageArgs {
  orgId: string;
  file: File;
}

export interface UploadPromoImageResult {
  /** Path dentro del bucket `promo-images` */
  path: string;
  /** MIME type del archivo subido */
  mime: string;
}

export class PromoImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoImageUploadError";
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

export async function uploadPromoImage(
  args: UploadPromoImageArgs,
): Promise<UploadPromoImageResult> {
  const { orgId, file } = args;

  if (!orgId) {
    throw new PromoImageUploadError("Sin organización activa. Volvé a iniciar sesión.");
  }

  if (file.size === 0) {
    throw new PromoImageUploadError("La imagen está vacía.");
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new PromoImageUploadError(
      `La imagen pesa ${mb} MB. El máximo permitido es 5 MB.`,
    );
  }

  const mime = file.type || "";
  const def = ALLOWED_MIMES[mime];
  if (!def) {
    throw new PromoImageUploadError(
      `Tipo de imagen no permitido (${mime || "desconocido"}). Solo JPG o PNG.`,
    );
  }

  const path = `${orgId}/promo-${generateUuid()}.${def.ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    console.error("[promoImageUpload] upload failed:", error);
    throw new PromoImageUploadError(
      `No se pudo subir la imagen: ${error.message}`,
    );
  }

  return { path: data.path, mime };
}

/**
 * Genera signed URL para mostrar una imagen del bucket (1h de validez).
 * Usado en la lista de promociones para mostrar el preview sin exponer
 * el bucket publico.
 */
export async function getPromoImageSignedUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) {
    console.warn("[promoImageUpload] signed url failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Borra una imagen del bucket. Solo admin pasa la policy DELETE.
 */
export async function deletePromoImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.warn("[promoImageUpload] delete failed:", error.message);
    // No lanzar — el flujo principal de borrar promo no debe fallar por esto
  }
}
