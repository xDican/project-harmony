/**
 * useProperties — hook para listar + mutar propiedades de la org.
 *
 * Piloto bienes raices Bruno (10 Ago 2026).
 *
 * Patron consistente con usePromotions (useState + useCallback + useEffect,
 * sin react-query).
 *
 * Filtros: 'all' | PropertyStatus.
 */

import { useCallback, useEffect, useState } from "react";
import {
  createProperty,
  deleteProperty,
  listProperties,
  updateProperty,
  type Property,
  type PropertyInsert,
  type PropertyStatus,
  type PropertyUpdate,
} from "@/lib/propertiesApi";

export type PropertiesFilter = "all" | PropertyStatus;

interface UsePropertiesOptions {
  /** Default: 'all' */
  filter?: PropertiesFilter;
}

export function useProperties(
  organizationId: string | undefined,
  opts: UsePropertiesOptions = {},
) {
  const [data, setData] = useState<Property[]>([]);
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
      const rows = await listProperties(
        organizationId,
        filter === "all" ? {} : { status: filter },
      );
      setData(rows);
    } catch (e) {
      console.error("[useProperties] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, filter]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  // Re-fetch on focus
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const create = useCallback(
    async (input: Omit<PropertyInsert, "organization_id" | "code">) => {
      if (!organizationId) throw new Error("Sin organizacion activa");
      const row = await createProperty({
        ...input,
        organization_id: organizationId,
      });
      await refetch();
      return row;
    },
    [organizationId, refetch],
  );

  const update = useCallback(async (id: string, patch: PropertyUpdate) => {
    const row = await updateProperty(id, patch);
    setData((prev) => prev.map((p) => (p.id === id ? row : p)));
    return row;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteProperty(id);
    setData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    create,
    update,
    remove,
  };
}
