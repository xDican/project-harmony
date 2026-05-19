/**
 * promotionsApi — CRUD tipado sobre la tabla `promotions`.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Usa supabase-js directo. RLS cubre todo el envelope de seguridad
 * (SELECT/INSERT/UPDATE por org members, DELETE solo admin). CHECK
 * constraint valida `valid_to >= valid_from` y los valores de status.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Promotion = Database["public"]["Tables"]["promotions"]["Row"];
export type PromotionInsert =
  Database["public"]["Tables"]["promotions"]["Insert"];
export type PromotionUpdate =
  Database["public"]["Tables"]["promotions"]["Update"];

export type PromotionStatus = "draft" | "active" | "expired" | "archived";

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  expired: "Expirada",
  archived: "Archivada",
};

export interface ListPromotionsOptions {
  /** Filtra por status. Si omitido, retorna todos. */
  status?: PromotionStatus;
  /** Filtra a las que expiran en los proximos N dias. Solo aplica a status='active'. */
  expiringWithinDays?: number;
}

/**
 * Lista promociones de una org con filtros opcionales.
 * Orden: valid_to ASC (mas urgente primero), luego created_at DESC.
 */
export async function listPromotions(
  organizationId: string,
  opts: ListPromotionsOptions = {},
): Promise<Promotion[]> {
  let query = supabase
    .from("promotions")
    .select("*")
    .eq("organization_id", organizationId);

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  if (typeof opts.expiringWithinDays === "number") {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + opts.expiringWithinDays);
    query = query
      .eq("status", "active")
      .gte("valid_to", today)
      .lte("valid_to", horizon.toISOString().slice(0, 10));
  }

  const { data, error } = await query
    .order("valid_to", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron cargar las promociones: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Calcula el status inicial al crear una promo segun la fecha de hoy.
 *   - valid_to < today  → expired (raro al crear, pero posible)
 *   - valid_from > today → draft (programada para futuro)
 *   - en rango → active
 */
export function computeInitialStatus(
  validFrom: string,
  validTo: string,
): PromotionStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (validTo < today) return "expired";
  if (validFrom > today) return "draft";
  return "active";
}

export async function createPromotion(
  input: Omit<PromotionInsert, "status"> & { status?: PromotionStatus },
): Promise<Promotion> {
  const status =
    input.status ?? computeInitialStatus(input.valid_from, input.valid_to);

  const { data, error } = await supabase
    .from("promotions")
    .insert({ ...input, status })
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo crear la promocion: ${error.message}`);
  }
  return data;
}

export async function updatePromotion(
  id: string,
  patch: PromotionUpdate,
): Promise<Promotion> {
  const { data, error } = await supabase
    .from("promotions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar la promocion: ${error.message}`);
  }
  return data;
}

export async function archivePromotion(id: string): Promise<Promotion> {
  return updatePromotion(id, { status: "archived" });
}

export async function reactivatePromotion(
  id: string,
  newValidTo: string,
): Promise<Promotion> {
  const today = new Date().toISOString().slice(0, 10);
  return updatePromotion(id, {
    status: "active",
    valid_from: today,
    valid_to: newValidTo,
  });
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) {
    throw new Error(`No se pudo eliminar la promocion: ${error.message}`);
  }
}

/**
 * Duplica una promocion: crea una nueva con mismos campos pero nuevas fechas.
 * Util para que la asistente arranque la promo del mes siguiente sin recargar
 * todos los datos.
 */
export async function duplicatePromotion(
  source: Promotion,
  newValidFrom: string,
  newValidTo: string,
): Promise<Promotion> {
  return createPromotion({
    organization_id: source.organization_id,
    clinic_id: source.clinic_id,
    service_type_id: source.service_type_id,
    title: source.title,
    description: source.description,
    conditions: source.conditions,
    image_url: source.image_url,
    keywords: source.keywords,
    valid_from: newValidFrom,
    valid_to: newValidTo,
  });
}
