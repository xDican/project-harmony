/**
 * useConversationMessages — carga los mensajes de una conversacion.
 *
 * Sprint 3 Fase 3.
 *
 * Trae los ultimos 100 mensajes de la conversacion en orden cronologico
 * ascendente (mas viejo arriba, mas reciente abajo).
 *
 * Re-fetch on focus + cada 30s (fallback al realtime que viene en Fase 5).
 * Marca la conversacion como leida (unread_count=0) al cargar.
 *
 * Permite agregar mensajes optimistically (composer envia y agrega antes de
 * recibir respuesta del servidor).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface MessageRow {
  id: string;
  conversation_id: string | null;
  direction: "inbound" | "outbound";
  source: "patient" | "bot" | "assistant" | "template" | "system" | null;
  message_type: "text" | "audio" | "image" | "document" | "voice_call" | "system";
  body: string | null;
  transcription: string | null;
  media_url: string | null;
  media_mime: string | null;
  status: string | null;
  sent_by: string | null;
  to_phone: string;
  from_phone: string;
  call_duration_seconds: number | null;
  call_direction: "inbound" | "outbound" | null;
  created_at: string;
}

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      // Traemos los 100 MAS RECIENTES (DESC + limit) y luego invertimos para
      // mostrar en orden cronologico ascendente. Si traemos ASC + limit 100,
      // en conversaciones con >100 msgs los recientes quedan fuera y el
      // timeline parece "congelado".
      const { data, error } = await supabase
        .from("message_logs")
        .select(
          `id, conversation_id, direction, source, message_type, body,
           transcription, media_url, media_mime, status, sent_by,
           to_phone, from_phone, call_duration_seconds, call_direction,
           created_at`,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[useConversationMessages] error:", error);
        setError(error.message);
        return;
      }

      // Reversa: el render espera ASC (mas viejo arriba, mas reciente abajo).
      const sorted = ((data || []) as MessageRow[]).slice().reverse();
      setMessages(sorted);
    } catch (e) {
      console.error("[useConversationMessages] exception:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Initial fetch + on conv change
  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Marcar como leida al cargar (best-effort, no critico)
  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId)
      .then(({ error }) => {
        if (error) console.warn("[useConversationMessages] mark read failed:", error.message);
      });
  }, [conversationId]);

  // Polling cada 30s (fallback realtime Fase 5)
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(fetchMessages, 30_000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // Re-fetch on focus
  useEffect(() => {
    const onFocus = () => fetchMessages();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMessages]);

  // Realtime: subscribe a inserts/updates de mensajes de esta conv
  const channelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        // @ts-expect-error supabase-js postgres_changes types
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_logs",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: MessageRow }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .on(
        // @ts-expect-error supabase-js postgres_changes types
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_logs",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: MessageRow }) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === payload.new.id);
            if (idx === -1) {
              // Si el INSERT no llego (RLS timing del replica), agregar al
              // recibir el UPDATE para que el msg quede visible.
              return [...prev, payload.new];
            }
            const next = [...prev];
            next[idx] = payload.new;
            return next;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  /**
   * Agrega un mensaje optimisticamente al timeline. Despues del servidor,
   * el polling lo reemplaza con la data canonica.
   */
  const addOptimisticMessage = useCallback((message: MessageRow) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  /**
   * Insert de un mensaje recibido por Realtime. Idempotente: si ya esta por
   * id, no duplica. Solo aplica si pertenece a esta conversation.
   */
  const insertRealtimeMessage = useCallback(
    (message: MessageRow) => {
      if (!conversationId) return;
      if (message.conversation_id !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    },
    [conversationId],
  );

  /**
   * Update de un mensaje recibido por Realtime (status sent/delivered/read,
   * transcripcion que llega despues, etc.).
   */
  const updateRealtimeMessage = useCallback(
    (message: MessageRow) => {
      if (!conversationId) return;
      if (message.conversation_id !== conversationId) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === message.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = message;
        return next;
      });
    },
    [conversationId],
  );

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage,
    insertRealtimeMessage,
    updateRealtimeMessage,
  };
}
