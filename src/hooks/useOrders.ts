/**
 * useOrders — hook para listar pedidos de la org y cambiar su estado (PatPat Live).
 *
 * Los pedidos nacen del bot; acá solo se leen y se cambia estado/entrega/notas.
 * Polling de 30 s + refetch en focus: quien verifica pagos necesita ver pedidos
 * nuevos y en_revision sin recargar. (Realtime requeriría publicar `orders` en
 * supabase_realtime; queda como mejora si el polling no alcanza.)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listOrders,
  updateOrderDetails,
  updateOrderStatus,
  type OrderDetailsPatch,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/ordersApi";

const POLL_MS = 30_000;

interface UseOrdersOptions {
  /** Default: todos los estados */
  statuses?: OrderStatus[];
}

export function useOrders(
  organizationId: string | undefined,
  opts: UseOrdersOptions = {},
) {
  const [data, setData] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clave estable: evita re-fetch en cada render si el caller pasa un array nuevo
  const statusKey = (opts.statuses ?? []).join(",");

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const rows = await listOrders(organizationId, {
        statuses: statusKey ? (statusKey.split(",") as OrderStatus[]) : undefined,
      });
      setData(rows);
    } catch (e) {
      console.error("[useOrders] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, statusKey]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(refetch, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refetch]);

  // refetch tras mutar: los triggers cambian columnas (paid_at, expires_at, stock)
  const changeStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const row = await updateOrderStatus(id, status);
      await refetch();
      return row;
    },
    [refetch],
  );

  const updateDetails = useCallback(
    async (id: string, patch: OrderDetailsPatch) => {
      const row = await updateOrderDetails(id, patch);
      await refetch();
      return row;
    },
    [refetch],
  );

  const reviewCount = useMemo(
    () => data.filter((o) => o.status === "en_revision").length,
    [data],
  );

  return {
    data,
    isLoading,
    error,
    refetch,
    changeStatus,
    updateDetails,
    reviewCount,
  };
}
