/**
 * useConversations — hook para cargar conversaciones del inbox.
 *
 * Sprint 3 Fase 2.
 *
 * Trae las conversaciones de la org activa con el ULTIMO mensaje de cada una
 * (via embed limit/order de Supabase). Ordenadas por last_message_at desc.
 *
 * Filtros:
 *   - all: todas
 *   - unread: solo unread_count > 0
 *   - bot: solo status='bot_active'
 *   - human: solo status='human_active'
 *
 * Re-fetch on focus + cada 60s (fallback realtime que viene en Fase 5).
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InboxFilter = "all" | "unread" | "bot" | "human";

export interface ConversationListRow {
  id: string;
  organization_id: string;
  whatsapp_line_id: string;
  patient_phone: string;
  patient_id: string | null;
  patient_name: string | null;
  status: "bot_active" | "human_active" | "closed" | "pending";
  assigned_to: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  unread_count: number;
  // Ultimo mensaje (puede ser null si la conversacion no tiene mensajes)
  last_message: {
    body: string | null;
    transcription: string | null;
    message_type: string;
    source: string | null;
    created_at: string;
  } | null;
}

export interface InboxCounts {
  all: number;
  unread: number;
  bot: number;
  human: number;
}

export function useConversations(organizationId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!organizationId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      // Embed con limit + order para traer solo el ultimo mensaje de cada conv.
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          organization_id,
          whatsapp_line_id,
          patient_phone,
          patient_id,
          patient_name,
          status,
          assigned_to,
          last_message_at,
          last_inbound_at,
          unread_count,
          last_message:message_logs (
            body,
            transcription,
            message_type,
            source,
            created_at
          )
          `,
        )
        .eq("organization_id", organizationId)
        .order("last_message_at", { ascending: false })
        .limit(50)
        .order("created_at", { ascending: false, foreignTable: "message_logs" })
        .limit(1, { foreignTable: "message_logs" });

      if (error) {
        console.error("[useConversations] error:", error);
        setError(error.message);
        return;
      }

      // last_message viene como array [obj] o []. Aplanar a obj o null.
      const normalized: ConversationListRow[] = (data || []).map((row) => {
        const rawMessages = (row as Record<string, unknown>).last_message;
        const lastMsgArray = Array.isArray(rawMessages) ? rawMessages : [];
        const lastMsg = lastMsgArray[0] ?? null;
        return {
          ...(row as Omit<ConversationListRow, "last_message">),
          last_message: lastMsg,
        };
      });

      setConversations(normalized);
    } catch (e) {
      console.error("[useConversations] exception:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Fetch inicial + on org change
  useEffect(() => {
    setIsLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  // Re-fetch cada 60s como fallback al realtime (Fase 5 lo reemplaza)
  useEffect(() => {
    if (!organizationId) return;
    const interval = setInterval(fetchConversations, 60_000);
    return () => clearInterval(interval);
  }, [organizationId, fetchConversations]);

  // Re-fetch on window focus (asistente vuelve a la pestaña)
  useEffect(() => {
    const onFocus = () => fetchConversations();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchConversations]);

  /**
   * Upsert local de una conversation row (de Realtime).
   * Si existe por id, hace merge. Si no, agrega al top.
   * No fetch — solo state update local.
   */
  const upsertConversation = useCallback(
    (incoming: Partial<ConversationListRow> & { id: string }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === incoming.id);
        if (idx === -1) {
          // Nueva conversation — la insertamos arriba como placeholder
          // (puede no tener last_message todavia; el siguiente refetch o
          // un onMessageInserted la completa)
          const placeholder: ConversationListRow = {
            id: incoming.id,
            organization_id: incoming.organization_id ?? "",
            whatsapp_line_id: incoming.whatsapp_line_id ?? "",
            patient_phone: incoming.patient_phone ?? "",
            patient_id: incoming.patient_id ?? null,
            patient_name: incoming.patient_name ?? null,
            status: incoming.status ?? "bot_active",
            assigned_to: incoming.assigned_to ?? null,
            last_message_at: incoming.last_message_at ?? new Date().toISOString(),
            last_inbound_at: incoming.last_inbound_at ?? null,
            unread_count: incoming.unread_count ?? 0,
            last_message: null,
          };
          return [placeholder, ...prev];
        }
        // Merge campos del incoming sobre el existente, preservar last_message
        const next = [...prev];
        next[idx] = { ...next[idx], ...incoming };
        // Re-ordenar por last_message_at desc
        next.sort((a, b) => {
          const da = new Date(a.last_message_at).getTime();
          const db = new Date(b.last_message_at).getTime();
          return db - da;
        });
        return next;
      });
    },
    [],
  );

  /**
   * Aplica un mensaje nuevo a su conversacion: refresca last_message,
   * last_message_at; si es inbound (source=patient), incrementa unread_count.
   */
  const applyMessageToConversation = useCallback(
    (message: {
      conversation_id: string | null;
      body: string | null;
      transcription: string | null;
      message_type: string;
      source: string | null;
      created_at: string;
    }) => {
      if (!message.conversation_id) return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === message.conversation_id);
        if (idx === -1) return prev; // conv no esta en lista — fetch lo levantara
        const conv = prev[idx];
        const isInbound = message.source === "patient";
        const updated: ConversationListRow = {
          ...conv,
          last_message_at: message.created_at,
          last_inbound_at: isInbound ? message.created_at : conv.last_inbound_at,
          unread_count: isInbound ? conv.unread_count + 1 : conv.unread_count,
          last_message: {
            body: message.body,
            transcription: message.transcription,
            message_type: message.message_type,
            source: message.source,
            created_at: message.created_at,
          },
        };
        const next = [...prev];
        next[idx] = updated;
        // Mover al top (mas reciente)
        next.sort((a, b) => {
          const da = new Date(a.last_message_at).getTime();
          const db = new Date(b.last_message_at).getTime();
          return db - da;
        });
        return next;
      });
    },
    [],
  );

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
    upsertConversation,
    applyMessageToConversation,
  };
}

/**
 * Filtra conversaciones cliente-side por filter + searchQuery.
 * Calcula tambien los conteos para los tabs.
 */
export function filterConversations(
  all: ConversationListRow[],
  filter: InboxFilter,
  searchQuery: string,
): { filtered: ConversationListRow[]; counts: InboxCounts } {
  const counts: InboxCounts = {
    all: all.length,
    unread: all.filter((c) => c.unread_count > 0).length,
    bot: all.filter((c) => c.status === "bot_active").length,
    human: all.filter((c) => c.status === "human_active").length,
  };

  const byFilter = all.filter((c) => {
    switch (filter) {
      case "unread":
        return c.unread_count > 0;
      case "bot":
        return c.status === "bot_active";
      case "human":
        return c.status === "human_active";
      default:
        return true;
    }
  });

  const q = normalizeSearch(searchQuery);
  if (!q) return { filtered: byFilter, counts };

  const bySearch = byFilter.filter((c) => {
    const name = normalizeSearch(c.patient_name || "");
    const phone = c.patient_phone.replace(/\D/g, "");
    return name.includes(q) || phone.includes(q.replace(/\D/g, ""));
  });

  return { filtered: bySearch, counts };
}

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
