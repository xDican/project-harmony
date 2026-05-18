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

import { useCallback, useEffect, useState } from "react";
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
      const { data, error } = await supabase
        .from("message_logs")
        .select(
          `id, conversation_id, direction, source, message_type, body,
           transcription, media_url, media_mime, status, sent_by,
           to_phone, from_phone, call_duration_seconds, call_direction,
           created_at`,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("[useConversationMessages] error:", error);
        setError(error.message);
        return;
      }

      setMessages((data || []) as MessageRow[]);
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

  /**
   * Agrega un mensaje optimisticamente al timeline. Despues del servidor,
   * el polling lo reemplaza con la data canonica.
   */
  const addOptimisticMessage = useCallback((message: MessageRow) => {
    setMessages((prev) => {
      // Evitar duplicados por id
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage,
  };
}
