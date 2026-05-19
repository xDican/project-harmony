/**
 * useQuickReplies — hook para listar + mutar plantillas rapidas de la org.
 *
 * Sprint 4 (Centro de Atencion).
 *
 * Patron consistente con useConversations (useState + useCallback + useEffect,
 * sin react-query). Re-fetch on focus para que la asistente vea cambios desde
 * otras pestañas.
 *
 * Helpers create/update/remove devuelven el row actualizado y refrescan el state
 * local optimistamente. Si falla la API, el error se propaga al caller.
 */

import { useCallback, useEffect, useState } from "react";
import {
  createQuickReply,
  deleteQuickReply,
  listQuickReplies,
  updateQuickReply,
  type QuickReply,
  type QuickReplyInsert,
  type QuickReplyUpdate,
} from "@/lib/quickRepliesApi";

interface UseQuickRepliesOptions {
  /** Solo lista quick replies con is_active=true. Default false. */
  onlyActive?: boolean;
}

export function useQuickReplies(
  organizationId: string | undefined,
  opts: UseQuickRepliesOptions = {},
) {
  const [data, setData] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onlyActive = opts.onlyActive ?? false;

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const rows = await listQuickReplies(organizationId, { onlyActive });
      setData(rows);
    } catch (e) {
      console.error("[useQuickReplies] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, onlyActive]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  // Re-fetch on focus (la asistente vuelve a la pestaña)
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const create = useCallback(
    async (input: Omit<QuickReplyInsert, "organization_id">) => {
      if (!organizationId) throw new Error("Sin organizacion activa");
      const row = await createQuickReply({
        ...input,
        organization_id: organizationId,
      });
      // Refetch para mantener orden consistente (display_order + title)
      await refetch();
      return row;
    },
    [organizationId, refetch],
  );

  const update = useCallback(
    async (id: string, patch: QuickReplyUpdate) => {
      const row = await updateQuickReply(id, patch);
      // Actualizacion optimista local
      setData((prev) => prev.map((qr) => (qr.id === id ? row : qr)));
      return row;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteQuickReply(id);
    setData((prev) => prev.filter((qr) => qr.id !== id));
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
