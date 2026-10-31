import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/ordersApi";
import { orderStatusStyle } from "@/components/orders/orderStatusStyle";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = orderStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
