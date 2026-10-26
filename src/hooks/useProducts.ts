/**
 * useProducts — hook para listar + mutar productos de la org (PatPat Live).
 *
 * Patrón de useProperties (useState + useCallback + useEffect, sin react-query).
 * No expone delete: un producto vendido no se borra, se desactiva (setActive).
 */

import { useCallback, useEffect, useState } from "react";
import {
  createProduct,
  listProducts,
  updateProduct,
  type Product,
  type ProductInsert,
  type ProductUpdate,
} from "@/lib/productsApi";

export type ProductsFilter = "all" | "active" | "inactive";

interface UseProductsOptions {
  /** Default: 'all' */
  filter?: ProductsFilter;
}

export function useProducts(
  organizationId: string | undefined,
  opts: UseProductsOptions = {},
) {
  const [data, setData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filter = opts.filter ?? "all";

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const rows = await listProducts(
        organizationId,
        filter === "all" ? {} : { active: filter === "active" },
      );
      setData(rows);
    } catch (e) {
      console.error("[useProducts] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, filter]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  // El stock cambia solo (bot, cron): re-fetch al volver a la pestaña
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const create = useCallback(
    async (input: Omit<ProductInsert, "organization_id" | "code">) => {
      if (!organizationId) throw new Error("Sin organizacion activa");
      const row = await createProduct({
        ...input,
        organization_id: organizationId,
      });
      await refetch();
      return row;
    },
    [organizationId, refetch],
  );

  const update = useCallback(
    async (id: string, patch: ProductUpdate) => {
      const row = await updateProduct(id, patch);
      // refetch: con filtro activo/inactivo la fila puede salir de la lista
      await refetch();
      return row;
    },
    [refetch],
  );

  const setActive = useCallback(
    (id: string, active: boolean) => update(id, { active }),
    [update],
  );

  return { data, isLoading, error, refetch, create, update, setActive };
}
