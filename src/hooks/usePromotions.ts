/**
 * usePromotions — hook para listar + mutar promociones de la org.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Patron consistente con useQuickReplies / useConversations (useState +
 * useCallback + useEffect, sin react-query).
 *
 * Filtros: 'all' | 'active' | 'draft' | 'expired' | 'archived'.
 */

import { useCallback, useEffect, useState } from "react";
import {
  archivePromotion,
  computeInitialStatus,
  createPromotion,
  deletePromotion,
  duplicatePromotion,
  listPromotions,
  reactivatePromotion,
  updatePromotion,
  type Promotion,
  type PromotionInsert,
  type PromotionStatus,
  type PromotionUpdate,
} from "@/lib/promotionsApi";

export type PromotionsFilter = "all" | PromotionStatus;

interface UsePromotionsOptions {
  /** Default: 'all' */
  filter?: PromotionsFilter;
}

export function usePromotions(
  organizationId: string | undefined,
  opts: UsePromotionsOptions = {},
) {
  const [data, setData] = useState<Promotion[]>([]);
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
      const rows = await listPromotions(
        organizationId,
        filter === "all" ? {} : { status: filter },
      );
      setData(rows);
    } catch (e) {
      console.error("[usePromotions] fetch failed:", e);
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
    async (
      input: Omit<PromotionInsert, "organization_id" | "status"> & {
        status?: PromotionStatus;
      },
    ) => {
      if (!organizationId) throw new Error("Sin organizacion activa");
      const status =
        input.status ?? computeInitialStatus(input.valid_from, input.valid_to);
      const row = await createPromotion({
        ...input,
        organization_id: organizationId,
        status,
      });
      await refetch();
      return row;
    },
    [organizationId, refetch],
  );

  const update = useCallback(async (id: string, patch: PromotionUpdate) => {
    const row = await updatePromotion(id, patch);
    setData((prev) => prev.map((p) => (p.id === id ? row : p)));
    return row;
  }, []);

  const archive = useCallback(async (id: string) => {
    const row = await archivePromotion(id);
    setData((prev) => prev.map((p) => (p.id === id ? row : p)));
    return row;
  }, []);

  const reactivate = useCallback(async (id: string, newValidTo: string) => {
    const row = await reactivatePromotion(id, newValidTo);
    setData((prev) => prev.map((p) => (p.id === id ? row : p)));
    return row;
  }, []);

  const duplicate = useCallback(
    async (source: Promotion, newValidFrom: string, newValidTo: string) => {
      const row = await duplicatePromotion(source, newValidFrom, newValidTo);
      await refetch();
      return row;
    },
    [refetch],
  );

  const remove = useCallback(async (id: string) => {
    await deletePromotion(id);
    setData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    create,
    update,
    archive,
    reactivate,
    duplicate,
    remove,
  };
}
