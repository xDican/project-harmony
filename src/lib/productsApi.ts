/**
 * productsApi — CRUD tipado sobre la tabla `products` (vertical ventas / PatPat Live).
 *
 * RLS: SELECT para toda la org, INSERT/UPDATE solo admin de la org. `code` lo
 * genera un trigger en BD (A101, A102...). `stock` se descuenta solo vía
 * reserve_product (bot) y se devuelve al cancelar/expirar un pedido.
 *
 * No hay deleteProduct: order_items.product_id es RESTRICT, un producto
 * vendido no se borra. "Desactivar" = updateProduct(id, { active: false }).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyStoreError } from "@/lib/storeErrors";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export interface ListProductsOptions {
  /** true = solo activos, false = solo inactivos. Omitido = todos. */
  active?: boolean;
}

/** Lista productos de una org. Orden: created_at DESC. */
export async function listProducts(
  organizationId: string,
  opts: ListProductsOptions = {},
): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId);

  if (opts.active !== undefined) {
    query = query.eq("active", opts.active);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw friendlyStoreError("No se pudieron cargar los productos", error);
  return data ?? [];
}

export async function createProduct(
  input: Omit<ProductInsert, "code">,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    // `code` es NOT NULL en los tipos generados, pero el trigger BEFORE INSERT lo
    // llena cuando viene ausente (corre antes del chequeo NOT NULL).
    .insert(input as ProductInsert)
    .select()
    .single();
  if (error) throw friendlyStoreError("No se pudo crear el producto", error);
  return data;
}

export async function updateProduct(
  id: string,
  patch: ProductUpdate,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw friendlyStoreError("No se pudo actualizar el producto", error);
  return data;
}
