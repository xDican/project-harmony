/**
 * OrdersPage — pedidos de PatPat Live, hub del patrón Hub + Drawer.
 *
 * Los pedidos los crea el bot; acá se verifican pagos y se entrega. Los que
 * esperan verificación (en_revision) van primero, el más antiguo arriba.
 * `?order=<id>` abre el detalle (deep link desde el inbox).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useCurrentUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrders } from "@/hooks/useOrders";
import type { OrderStatus, OrderWithItems } from "@/lib/ordersApi";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDrawer } from "@/components/orders/OrderDrawer";

type OrdersTab = "activos" | "revision" | "reservados" | "pagados" | "entregados" | "cerrados" | "todos";

const TAB_LABELS: Record<OrdersTab, string> = {
  activos: "Activos",
  revision: "Por revisar",
  reservados: "Reservados",
  pagados: "Pagados",
  entregados: "Entregados",
  cerrados: "Cerrados",
  todos: "Todos",
};

const TAB_STATUSES: Record<OrdersTab, OrderStatus[] | undefined> = {
  activos: ["reservado", "en_revision", "pagado"],
  revision: ["en_revision"],
  reservados: ["reservado"],
  pagados: ["pagado"],
  entregados: ["entregado"],
  cerrados: ["expirado", "cancelado"],
  todos: undefined,
};

const EMPTY_LABELS: Record<OrdersTab, string> = {
  activos: "No hay pedidos activos. Cuando un cliente pida por WhatsApp, aparece acá.",
  revision: "Ningún comprobante esperando verificación.",
  reservados: "No hay pedidos reservados.",
  pagados: "No hay pedidos pagados pendientes de entrega.",
  entregados: "Aún no hay pedidos entregados.",
  cerrados: "No hay pedidos cancelados ni vencidos.",
  todos: "Aún no hay pedidos.",
};

function sortOrders(orders: OrderWithItems[]): OrderWithItems[] {
  return [...orders].sort((a, b) => {
    const aRev = a.status === "en_revision";
    const bRev = b.status === "en_revision";
    if (aRev !== bRev) return aRev ? -1 : 1;
    if (aRev && bRev) {
      return new Date(a.review_started_at ?? a.created_at).getTime() - new Date(b.review_started_at ?? b.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function OrdersPage() {
  const { organizationId } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab") as OrdersTab | null;
  const [tab, setTab] = useState<OrdersTab>(rawTab && rawTab in TAB_LABELS ? rawTab : "activos");

  useEffect(() => {
    if (tab === "activos") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { data, isLoading, error, changeStatus, updateDetails } = useOrders(organizationId ?? undefined, {
    statuses: TAB_STATUSES[tab],
  });
  const orders = useMemo(() => sortOrders(data), [data]);

  // Deep link ?order=<id>: abre el detalle aunque el pedido no esté en el filtro actual
  const [drawerTargetId, setDrawerTargetId] = useState<string | undefined>(
    searchParams.get("order") ?? undefined,
  );
  useEffect(() => {
    if (drawerTargetId) return;
    if (searchParams.has("order")) {
      searchParams.delete("order");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTargetId]);

  // Si el pedido sale del filtro tras cambiar de estado (ej. cancelado en "Activos")
  // se conserva su última copia para que el Drawer no se vacíe mientras está abierto.
  const lastDrawerOrder = useRef<OrderWithItems | undefined>();
  const liveOrder = drawerTargetId ? data.find((o) => o.id === drawerTargetId) : undefined;
  if (liveOrder) lastDrawerOrder.current = liveOrder;
  const drawerOrder =
    liveOrder ?? (lastDrawerOrder.current?.id === drawerTargetId ? lastDrawerOrder.current : undefined);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-4 pb-24 md:pb-8">
        <Select value={tab} onValueChange={(v) => setTab(v as OrdersTab)}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TAB_LABELS) as OrdersTab[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TAB_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p>{EMPTY_LABELS[tab]}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => setDrawerTargetId(o.id)} />
            ))}
          </div>
        )}
      </div>

      <OrderDrawer
        open={drawerTargetId !== undefined}
        onOpenChange={(open) => {
          if (!open) setDrawerTargetId(undefined);
        }}
        order={drawerOrder}
        onChangeStatus={async (id, status) => {
          const row = await changeStatus(id, status);
          if (lastDrawerOrder.current?.id === id) lastDrawerOrder.current = { ...lastDrawerOrder.current, ...row };
          return row;
        }}
        onUpdateDetails={async (id, patch) => {
          const row = await updateDetails(id, patch);
          if (lastDrawerOrder.current?.id === id) lastDrawerOrder.current = { ...lastDrawerOrder.current, ...row };
          return row;
        }}
      />
    </MainLayout>
  );
}
