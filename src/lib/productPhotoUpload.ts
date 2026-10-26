/**
 * productPhotoUpload — sube fotos al bucket product-photos (PatPat Live).
 *
 * Clon de propertyPhotoUpload.ts. Path: `{orgId}/product-{uuid}.{ext}`.
 * Validación cliente (la bucket policy es la segunda barrera):
 *   - Tamaño máx 5 MB
 *   - MIME jpeg/png (Meta rechaza WebP con error 131053 al enviar la foto)
 *
 * El path se guarda en `products.photos` (primer elemento = portada).
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "product-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIMES: Record<string, { ext: string }> = {
  "image/jpeg": { ext: "jpg" },
  "image/png": { ext: "png" },
};

export interface UploadProductPhotoArgs {
  orgId: string;
  file: File;
}

export interface UploadProductPhotoResult {
  /** Path dentro del bucket `product-photos` */
  path: string;
  mime: string;
}

export class ProductPhotoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPhotoUploadError";
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

export async function uploadProductPhoto(
  args: UploadProductPhotoArgs,
): Promise<UploadProductPhotoResult> {
  const { orgId, file } = args;

  if (!orgId) {
    throw new ProductPhotoUploadError("Sin organización activa. Volvé a iniciar sesión.");
  }
  if (file.size === 0) {
    throw new ProductPhotoUploadError("La foto está vacía.");
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ProductPhotoUploadError(
      `La foto pesa ${mb} MB. El máximo permitido es 5 MB.`,
    );
  }

  const mime = file.type || "";
  const def = ALLOWED_MIMES[mime];
  if (!def) {
    throw new ProductPhotoUploadError(
      `Tipo de imagen no permitido (${mime || "desconocido"}). Solo JPG o PNG.`,
    );
  }

  const path = `${orgId}/product-${generateUuid()}.${def.ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: mime, upsert: false });

  if (error) {
    console.error("[productPhotoUpload] upload failed:", error);
    throw new ProductPhotoUploadError(`No se pudo subir la foto: ${error.message}`);
  }

  return { path: data.path, mime };
}

/** Signed URL para mostrar una foto del bucket (1h de validez). */
export async function getProductPhotoSignedUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) {
    console.warn("[productPhotoUpload] signed url failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/** Borra una foto del bucket. Solo admin pasa la policy DELETE. */
export async function deleteProductPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    // No lanzar: el flujo principal no debe fallar por esto
    console.warn("[productPhotoUpload] delete failed:", error.message);
  }
}
