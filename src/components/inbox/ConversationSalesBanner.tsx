/**
 * ConversationSalesBanner — contexto de venta bajo el header del chat (org ventas).
 *
 * Muestra el último pedido de la conversación (estado, total, link al detalle)
 * o, si todavía no hay pedido, el producto de interés. También avisa cuando
 * pasaron más de 24h desde el último mensaje del cliente: WhatsApp solo deja
 * escribirle con plantilla.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Package, ShoppingBag } from "lucide-react";
import { getLatestOrderForConversation, type OrderStatus, type OrderWithItems } from "@/lib/ordersApi";
import { getProduct, type Product } from "@/lib/productsApi";
import { formatMoney } from "@/lib/formatMoney";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { ConversationListRow } from "@/hooks/useConversations";

const DAY_MS = 24 * 60 * 60 * 1000;

export function ConversationSalesBanner({ conversation }: { conversation: ConversationListRow }) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  // last_message_at cambia con cada mensaje: refresca el estado del pedido
  useEffect(() => {
    let cancelled = false;
    getLatestOrderForConversation(conversation.id)
      .then((o) => !cancelled && setOrder(o))
      .catch((e) => console.warn("[ConversationSalesBanner] order:", e));
    return () => {
      cancelled = true;
    };
  }, [conversation.id, conversation.last_message_at]);

  const interestId = conversation.interest_product_id ?? null;
  useEffect(() => {
    if (!interestId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    getProduct(interestId)
      .then((p) => !cancelled && setProduct(p))
      .catch((e) => console.warn("[ConversationSalesBanner] product:", e));
    return () => {
      cancelled = true;
    };
  }, [interestId]);

  const windowClosed =
    !!conversation.last_inbound_at && Date.now() - new Date(conversation.last_inbound_at).getTime() > DAY_MS;

  if (!order && !product && !windowClosed) return null;

  return (
    <div className="px-3 md:px-4 py-2 border-b bg-card space-y-1.5 text-sm">
      {order ? (
        <Link
          to={`/pedidos?order=${order.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">
            {order.order_items.map((i) => i.products?.code).filter(Boolean).join(", ") || "Pedido"}
          </span>
          <span className="text-muted-foreground">{formatMoney(order.total, order.currency)}</span>
          <OrderStatusBadge status={order.status as OrderStatus} />
        </Link>
      ) : product ? (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Interés:</span>
          <span className="font-medium">{product.code}</span>
          <span className="truncate">{product.name}</span>
        </div>
      ) : null}

      {windowClosed && (
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp solo permite enviarle una plantilla.
        </div>
      )}
    </div>
  );
}
