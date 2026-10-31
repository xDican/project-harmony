/**
 * Matching de codigo de propiedad (piloto bienes raices Bruno, 10 Ago 2026).
 *
 * Un solo matcher sirve para los 2 canales: referral de Meta Ads/Posts
 * (headline/body) y texto plano (wa.me?text=CODIGO o mensaje directo del
 * lead) — decision de Fase 0 (8 Ago): "un solo lookup sirve para los dos
 * canales, no hace falta integracion separada por canal".
 *
 * Match EXACTO sobre el formato real que genera el trigger de BD
 * (generate_property_code(), migracion bruno_properties_schema) — sin
 * fuzzy matching, evita falsos positivos (decision Fase 0, 8 Ago).
 */

// deno-lint-ignore-file no-explicit-any

const PROPERTY_CODE_PATTERN = /COD-\d+/i;

export function matchPropertyCode(text: string): string | null {
  const m = text.match(PROPERTY_CODE_PATTERN);
  return m ? m[0].toUpperCase() : null;
}

export interface PropertyRecord {
  id: string;
  code: string;
  title: string;
  property_type: string;
  zone: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_varas: number | null;
  construction_size_m2: number | null;
  parking_spots: number | null;
  front_yard: boolean;
  back_yard: boolean;
  photos: string[];
  status: string;
}

export async function getPropertyByCode(
  supabase: any,
  organizationId: string,
  code: string,
): Promise<PropertyRecord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[properties] getPropertyByCode failed:", error.message);
    return null;
  }
  return data;
}

/** Lookup por id (uuid) — usado por el flujo conversacional (Fase 3) para leer
 * la propiedad guardada en conversations.interest_property_id. */
export async function getPropertyById(
  supabase: any,
  organizationId: string,
  id: string,
): Promise<PropertyRecord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[properties] getPropertyById failed:", error.message);
    return null;
  }
  return data;
}
