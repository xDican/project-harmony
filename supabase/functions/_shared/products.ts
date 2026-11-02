/**
 * Matching de codigo de producto (PatPat Live, vertical `ventas`).
 *
 * El comprador manda un screenshot del live donde se ve el codigo del producto
 * (A101, A102...) o lo escribe en texto. El codigo lo genera el trigger de BD
 * `generate_product_code()` con el prefijo de `store_settings.code_prefix`
 * (default 'A'), asi que el matcher recibe el prefijo de la org.
 *
 * Match EXACTO sobre ese formato, sin fuzzy: un codigo mal leido reserva la
 * pieza equivocada, que es peor que volver a preguntar. Molde:
 * _shared/properties.ts (piloto Bruno).
 */

// deno-lint-ignore-file no-explicit-any

const DEFAULT_PREFIX = "A";

export interface ProductRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  photos: string[];
  active: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Devuelve el codigo normalizado (ej. "A101") o null. Tolera mayusculas,
 * minusculas y un guion o espacio entre prefijo y numero ("a-101", "A 101"),
 * pero exige limites de palabra para no matchear dentro de otras palabras o
 * numeros largos (telefonos, referencias bancarias).
 */
export function matchProductCode(text: string, prefix: string = DEFAULT_PREFIX): string | null {
  if (!text) return null;
  const p = (prefix || DEFAULT_PREFIX).toUpperCase();
  const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(p)}[\\s-]?(\\d{3,5})(?![A-Za-z0-9])`, "i");
  const m = text.match(re);
  return m ? `${p}${m[1]}` : null;
}

/** Prefijo de codigos de la org (store_settings.code_prefix); 'A' si no hay fila. */
export async function getCodePrefix(supabase: any, organizationId: string): Promise<string> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("code_prefix")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[products] getCodePrefix failed:", error.message);
    return DEFAULT_PREFIX;
  }
  return data?.code_prefix || DEFAULT_PREFIX;
}

export async function getProductByCode(
  supabase: any,
  organizationId: string,
  code: string,
): Promise<ProductRecord | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[products] getProductByCode failed:", error.message);
    return null;
  }
  return data;
}

/** Lookup por id (uuid) — para leer conversations.interest_product_id. */
export async function getProductById(
  supabase: any,
  organizationId: string,
  id: string,
): Promise<ProductRecord | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[products] getProductById failed:", error.message);
    return null;
  }
  return data;
}
