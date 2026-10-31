/**
 * storeSettingsApi — ajustes de la tienda (vertical ventas) por organización.
 *
 * PK = organization_id (una fila por org). SELECT para la org, INSERT/UPDATE
 * solo admin de la org. Si no hay fila, el bot y los triggers usan defaults
 * (prefijo 'A', 30 min de reserva, tope 60 min).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyStoreError } from "@/lib/storeErrors";

export type StoreSettings = Database["public"]["Tables"]["store_settings"]["Row"];
export type StoreSettingsUpdate =
  Database["public"]["Tables"]["store_settings"]["Update"];

export async function getStoreSettings(
  organizationId: string,
): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw friendlyStoreError("No se pudieron cargar los ajustes", error);
  return data;
}

export async function upsertStoreSettings(
  organizationId: string,
  patch: StoreSettingsUpdate,
): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from("store_settings")
    .upsert({ ...patch, organization_id: organizationId })
    .select()
    .single();
  if (error) throw friendlyStoreError("No se pudieron guardar los ajustes", error);
  return data;
}
