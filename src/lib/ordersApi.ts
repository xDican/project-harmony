/**
 * ordersApi — lectura y cambios permitidos sobre `orders` (vertical ventas).
 *
 * Los pedidos los crea SOLO el bot vía reserve_product (service_role); no hay
 * INSERT desde el cliente. Un humano (admin/secretary de la org) solo puede
 * cambiar estado, delivery_method, delivery_address y notes — cualquier otra
 * columna la rechaza el trigger con PS005 (ORDEN_CAMPO_PROTEGIDO).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyStoreError } from "@/lib/storeErrors";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderStatus =
  | "reservado"
  | "en_revision"
  | "pagado"
  | "entregado"
  | "expirado"
  | "cancelado";

export type DeliveryMethod = "envio" | "retiro";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  reservado: "Reservado",
  en_revision: "En revisión",
  pagado: "Pagado",
  entregado: "Entregado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

/**
 * Espejo de validate_order_status_transition (solo para decidir qué botones
 * mostrar). 'expirado' lo pone solo el cron; la verdad sigue en la BD.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  reservado: ["pagado", "cancelado"],
  en_revision: ["pagado", "cancelado", "reservado"],
  pagado: ["entregado", "cancelado"],
  entregado: [],
  expirado: [],
  cancelado: [],
};

export interface OrderItemWithProduct extends OrderItem {
  products: { code: string; name: string; photos: string[] } | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithProduct[];
}

/** Columnas que un humano puede editar (el resto lo rechaza la BD). */
export type OrderDetailsPatch = Partial<{
  delivery_method: DeliveryMethod | null;
  delivery_address: string | null;
  notes: string | null;
}>;

export interface ListOrdersOptions {
  /** Si se omite, trae todos los estados. */
  statuses?: OrderStatus[];
  limit?: number;
}

const ORDER_SELECT = "*, order_items(*, products(code, name, photos))";

/** Lista pedidos de una org con sus ítems. Orden: created_at DESC. */
export async function listOrders(
  organizationId: string,
  opts: ListOrdersOptions = {},
): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("organization_id", organizationId);

  if (opts.statuses && opts.statuses.length > 0) {
    query = query.in("status", opts.statuses);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (error) throw friendlyStoreError("No se pudieron cargar los pedidos", error);
  return (data ?? []) as unknown as OrderWithItems[];
}

/** Último pedido de una conversación (el más reciente, cualquier estado) o null. */
export async function getLatestOrderForConversation(
  conversationId: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw friendlyStoreError("No se pudo cargar el pedido de la conversación", error);
  return data as unknown as OrderWithItems | null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw friendlyStoreError("No se pudo cambiar el estado del pedido", error);
  return data;
}

export async function updateOrderDetails(
  id: string,
  patch: OrderDetailsPatch,
): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw friendlyStoreError("No se pudo actualizar el pedido", error);
  return data;
}
