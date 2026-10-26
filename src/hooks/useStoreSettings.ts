/**
 * useStoreSettings — ajustes de la tienda de la org (PatPat Live).
 *
 * `data` es null si la org aún no tiene fila (se aplican los defaults de BD).
 * `save` hace upsert: solo admin de la org pasa RLS.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getStoreSettings,
  upsertStoreSettings,
  type StoreSettings,
  type StoreSettingsUpdate,
} from "@/lib/storeSettingsApi";

export function useStoreSettings(organizationId: string | undefined) {
  const [data, setData] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      setData(await getStoreSettings(organizationId));
    } catch (e) {
      console.error("[useStoreSettings] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  const save = useCallback(
    async (patch: StoreSettingsUpdate) => {
      if (!organizationId) throw new Error("Sin organizacion activa");
      const row = await upsertStoreSettings(organizationId, patch);
      setData(row);
      return row;
    },
    [organizationId],
  );

  return { data, isLoading, error, refetch, save };
}
