/**
 * OrderCard — fila de pedido en el hub de Pedidos.
 */

import { Card, CardContent } from "@/components/ui/card";
import type { OrderStatus, OrderWithItems } from "@/lib/ordersApi";
import { formatMoney } from "@/lib/formatMoney";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ExpiryCountdown } from "@/components/orders/ExpiryCountdown";

interface OrderCardProps {
  order: OrderWithItems;
  onClick: () => void;
}

export function orderUnits(order: OrderWithItems): number {
  return order.order_items.reduce((sum, i) => sum + i.quantity, 0);
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const status = order.status as OrderStatus;
  const units = orderUnits(order);
  const codes = order.order_items
    .map((i) => i.products?.code)
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${status === "en_revision" ? "border-blue-400 dark:border-blue-600" : ""}`}
      onClick={onClick}
    >
      <CardContent className="py-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-1">
            {order.customer_name || order.customer_phone}
          </h3>
          <OrderStatusBadge status={status} />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground line-clamp-1">
            {units} {units === 1 ? "pieza" : "piezas"}
            {codes ? ` · ${codes}` : ""}
          </span>
          <span className="font-semibold text-primary shrink-0">{formatMoney(order.total, order.currency)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {status === "reservado" ? (
            <ExpiryCountdown expiresAt={order.expires_at} />
          ) : status === "en_revision" ? (
            "Comprobante recibido: falta verificar el pago"
          ) : (
            new Date(order.created_at).toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" })
          )}
        </p>
      </CardContent>
    </Card>
  );
}
