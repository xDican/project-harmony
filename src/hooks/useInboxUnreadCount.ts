/**
 * useInboxUnreadCount — conteo global de conversaciones con mensajes sin leer.
 *
 * Sprint 3 Fase 6.
 *
 * Devuelve cuantas conversaciones de la org activa tienen unread_count > 0.
 * Se usa para el badge en el item "Bandeja" del sidebar — asi la asistente
 * sabe desde cualquier pantalla que tiene chats pendientes.
 *
 * Realtime: subscribe a UPDATE de conversations en la org. Cuando llega
 * cambio, refetch del count. Polling 60s como fallback.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useInboxUnreadCount(organizationId: string | undefined): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!organizationId) {
      setCount(0);
      return;
    }
    const { count: n, error } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gt("unread_count", 0);

    if (error) {
      console.warn("[useInboxUnreadCount] fetch error:", error.message);
      return;
    }
    setCount(n ?? 0);
  }, [organizationId]);

  // Fetch inicial + on org change
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Polling 60s como fallback
  useEffect(() => {
    if (!organizationId) return;
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [organizationId, fetchCount]);

  // Realtime: cuando una conversation se actualiza (unread_count change),
  // refetch el total. No tratamos de incrementar/decrementar local-only
  // porque hay varios paths que tocan unread_count (mark read, new msg,
  // returnToBot, etc.) y queremos consistencia con DB.
  useEffect(() => {
    if (!organizationId) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      channel = supabase
        .channel(`inbox-unread:${organizationId}`)
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            filter: `organization_id=eq.${organizationId}`,
          },
          () => {
            fetchCount();
          },
        )
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversations",
            filter: `organization_id=eq.${organizationId}`,
          },
          () => {
            fetchCount();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [organizationId, fetchCount]);

  // Re-fetch on focus
  useEffect(() => {
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchCount]);

  return count;
}
