/**
 * propertiesApi — CRUD tipado sobre la tabla `properties`.
 *
 * Piloto bienes raices Bruno (10 Ago 2026).
 *
 * Usa supabase-js directo. RLS cubre todo el envelope de seguridad
 * (SELECT/INSERT/UPDATE por org members, DELETE solo admin). `code` lo
 * genera un trigger en BD (nunca se manda desde el cliente); `status`
 * tiene CHECK constraint en BD con los mismos 4 valores de abajo.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyInsert =
  Database["public"]["Tables"]["properties"]["Insert"];
export type PropertyUpdate =
  Database["public"]["Tables"]["properties"]["Update"];

export type PropertyStatus =
  | "disponible"
  | "reservada"
  | "vendida"
  | "inactiva";

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  inactiva: "Inactiva",
};

export type PropertyType = "casa" | "apartamento" | "townhouse" | "terreno";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  townhouse: "Townhouse",
  terreno: "Terreno",
};

export interface ListPropertiesOptions {
  /** Filtra por status. Si omitido, retorna todas. */
  status?: PropertyStatus;
}

/**
 * Lista propiedades de una org con filtro opcional de status.
 * Orden: created_at DESC (mas reciente primero).
 */
export async function listProperties(
  organizationId: string,
  opts: ListPropertiesOptions = {},
): Promise<Property[]> {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId);

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    throw new Error(`No se pudieron cargar las propiedades: ${error.message}`);
  }
  return data ?? [];
}

export async function createProperty(
  input: Omit<PropertyInsert, "code">,
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo crear la propiedad: ${error.message}`);
  }
  return data;
}

export async function updateProperty(
  id: string,
  patch: PropertyUpdate,
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar la propiedad: ${error.message}`);
  }
  return data;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) {
    throw new Error(`No se pudo eliminar la propiedad: ${error.message}`);
  }
}
