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

/** Servicio activo a nivel org (para agendar): id + nombre + duracion. */
export interface OrgServiceType {
  id: string;
  displayName: string;
  durationMinutes: number | null;
  price: number | null;
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
    .select("id, display_name, duration_minutes, price, display_order")
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
    price: (row as { price?: number | null }).price ?? null,
  }));
}

/**
 * Crea o actualiza un servicio a nivel ORG (fuente unica — la administracion
 * vive en el panel Motor → Servicios, ya no en la linea). `name` es la clave
 * canonica en minusculas (UNIQUE por org); `display_name` conserva el casing.
 * El create usa upsert por (organization_id, name) para reactivar/actualizar un
 * servicio dado de baja con el mismo nombre. Preserva las columnas no enviadas
 * (buffer/price/recetas via id).
 */
export async function saveServiceType(params: {
  organizationId: string;
  id?: string;
  displayName: string;
  durationMinutes: number;
}): Promise<OrgServiceType> {
  const { organizationId, id, displayName, durationMinutes } = params;
  const name = displayName.trim();
  if (!name) throw new Error("El nombre del servicio es obligatorio.");
  const duration = Math.max(1, Math.floor(durationMinutes));

  if (id) {
    const { data, error } = await supabase
      .from("service_types")
      .update({ display_name: name, name: name.toLowerCase(), duration_minutes: duration })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id, display_name, duration_minutes, price")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error(`Ya existe un servicio llamado "${name}".`);
      throw error;
    }
    return { id: data.id, displayName: data.display_name, durationMinutes: data.duration_minutes ?? null, price: (data as { price?: number | null }).price ?? null };
  }

  // Create: display_order al final de la lista del org.
  const { data: maxRow } = await supabase
    .from("service_types")
    .select("display_order")
    .eq("organization_id", organizationId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { display_order: number | null } | null)?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("service_types")
    .upsert(
      {
        organization_id: organizationId,
        name: name.toLowerCase(),
        display_name: name,
        duration_minutes: duration,
        is_active: true,
        display_order: nextOrder,
      },
      { onConflict: "organization_id,name" }
    )
    .select("id, display_name, duration_minutes, price")
    .single();
  if (error) throw error;
  return { id: data.id, displayName: data.display_name, durationMinutes: data.duration_minutes ?? null, price: (data as { price?: number | null }).price ?? null };
}

/** Baja logica de un servicio (is_active=false). Nunca DELETE, para no romper FKs de citas. */
export async function deactivateServiceType(params: {
  organizationId: string;
  id: string;
}): Promise<void> {
  const { organizationId, id } = params;
  const { error } = await supabase
    .from("service_types")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
