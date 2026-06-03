/**
 * serviceTypesApi — CRUD tipado sobre la tabla `service_types`.
 *
 * Fase 1 — Motor de Agendamiento Multi-Recurso.
 * La tabla `service_types` es la FUENTE UNICA de los tipos de servicio
 * (antes vivian en el JSONB `whatsapp_lines.bot_service_types`). El bot
 * la lee y las recetas/skills del motor cuelgan de `service_types.id`.
 *
 * `name` es la clave canonica en minusculas (UNIQUE por org); `display_name`
 * conserva el casing original que ve el usuario. El upsert preserva el `id`
 * (y por ende las recetas/buffer/precio que se le adjunten en Fase 3) haciendo
 * match por (organization_id, name). Los servicios removidos del formulario se
 * dan de baja logica (is_active=false), nunca se borran, para no romper FKs.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ServiceTypeRow = Database["public"]["Tables"]["service_types"]["Row"];

/** Forma que edita la UI y consume el bot. */
export interface ServiceTypeItem {
  /** Nombre tal cual lo escribe el usuario (con casing). */
  name: string;
  /** Duracion en minutos; undefined = usa la duracion por defecto de la linea. */
  duration_minutes?: number;
}

/** Servicio activo a nivel org (para agendar): id + nombre + duracion. */
export interface OrgServiceType {
  id: string;
  displayName: string;
  durationMinutes: number | null;
}

/**
 * Lista los servicios ACTIVOS de una org para el flujo de agendamiento.
 * Fase 4 (motor): el agendamiento manual elige un servicio (no una duracion),
 * y eso habilita el chequeo de recursos. Org-level (1 linea/org en el ICP).
 */
export async function listActiveServiceTypesForOrg(
  organizationId: string
): Promise<OrgServiceType[]> {
  const { data, error } = await supabase
    .from("service_types")
    .select("id, display_name, duration_minutes, display_order")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[listActiveServiceTypesForOrg] Error:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    durationMinutes: row.duration_minutes ?? null,
  }));
}

/**
 * Lista los tipos de servicio ACTIVOS de una linea, ordenados para mostrar/editar.
 * Devuelve el `display_name` como `name` (lo que ve el usuario).
 */
export async function listServiceTypesByLine(
  lineId: string
): Promise<ServiceTypeItem[]> {
  const { data, error } = await supabase
    .from("service_types")
    .select("display_name, duration_minutes, display_order")
    .eq("whatsapp_line_id", lineId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[listServiceTypesByLine] Error:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    name: row.display_name,
    duration_minutes: row.duration_minutes ?? undefined,
  }));
}

/**
 * Persiste la lista editada de tipos de servicio de una linea:
 *  - upsert (por organization_id+name) de cada item → reactiva/actualiza o inserta,
 *    preservando el id y las columnas no enviadas (buffer_minutes, price, etc.).
 *  - baja logica (is_active=false) de los servicios activos de la linea que ya no estan.
 *
 * Los nombres se normalizan a minusculas para la clave canonica `name`; el casing
 * original se guarda en `display_name`. Items con nombre vacio se ignoran.
 */
export async function saveServiceTypesForLine(params: {
  lineId: string;
  organizationId: string;
  clinicId?: string | null;
  items: ServiceTypeItem[];
}): Promise<void> {
  const { lineId, organizationId, clinicId, items } = params;

  // Normalizar + dedupe por nombre canonico (gana el ultimo).
  const byName = new Map<string, { displayName: string; duration?: number }>();
  for (const it of items) {
    const displayName = (it.name || "").trim();
    if (!displayName) continue;
    byName.set(displayName.toLowerCase(), {
      displayName,
      duration: it.duration_minutes,
    });
  }

  const canonicalNames = Array.from(byName.keys());

  // 1. Upsert de los items presentes (match por org+name → preserva id/recetas).
  if (canonicalNames.length > 0) {
    const rows = Array.from(byName.entries()).map(([name, v], idx) => ({
      organization_id: organizationId,
      clinic_id: clinicId ?? null,
      whatsapp_line_id: lineId,
      name,
      display_name: v.displayName,
      duration_minutes: v.duration ?? null,
      is_active: true,
      display_order: idx,
    }));

    const { error: upsertError } = await supabase
      .from("service_types")
      .upsert(rows, { onConflict: "organization_id,name" });

    if (upsertError) {
      console.error("[saveServiceTypesForLine] Upsert error:", upsertError);
      throw upsertError;
    }
  }

  // 2. Baja logica de los activos de esta linea que ya no estan en el formulario.
  const { data: existing, error: existingError } = await supabase
    .from("service_types")
    .select("id, name")
    .eq("whatsapp_line_id", lineId)
    .eq("is_active", true);

  if (existingError) {
    console.error("[saveServiceTypesForLine] Load existing error:", existingError);
    throw existingError;
  }

  const removedIds = (existing || [])
    .filter((row) => !canonicalNames.includes(row.name))
    .map((row) => row.id);

  if (removedIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("service_types")
      .update({ is_active: false })
      .in("id", removedIds);

    if (deactivateError) {
      console.error("[saveServiceTypesForLine] Deactivate error:", deactivateError);
      throw deactivateError;
    }
  }
}
