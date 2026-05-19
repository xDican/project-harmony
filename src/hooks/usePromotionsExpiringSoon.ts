/**
 * usePromotionsExpiringSoon — hook minimal para el badge in-app.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Lista promos `active` cuya `valid_to` cae entre hoy y hoy+N dias (default 3).
 * Usado por PromoExpiringBadge en sidebar + banner amarillo en PromotionsPage.
 *
 * Re-fetch on focus + cada 5 min como fallback.
 */

import { useCallback, useEffect, useState } from "react";
import { listPromotions, type Promotion } from "@/lib/promotionsApi";

interface UsePromotionsExpiringSoonOptions {
  /** Cuantos dias adelante mirar. Default 3. */
  withinDays?: number;
  /** Si false, hook deshabilitado (no fetch). Default true. */
  enabled?: boolean;
}

export function usePromotionsExpiringSoon(
  organizationId: string | undefined,
  opts: UsePromotionsExpiringSoonOptions = {},
) {
  const [data, setData] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const withinDays = opts.withinDays ?? 3;
  const enabled = opts.enabled ?? true;

  const refetch = useCallback(async () => {
    if (!organizationId || !enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }
    try {
      const rows = await listPromotions(organizationId, {
        expiringWithinDays: withinDays,
      });
      setData(rows);
    } catch (e) {
      console.warn("[usePromotionsExpiringSoon] fetch failed:", e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, withinDays, enabled]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  // Re-fetch cada 5 min (poll para que el badge se actualice sin recargar)
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(refetch, 5 * 60_000);
    return () => clearInterval(interval);
  }, [refetch, enabled]);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  return {
    promotions: data,
    count: data.length,
    isLoading,
  };
}
