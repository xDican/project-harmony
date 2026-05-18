/**
 * useRealtimeInbox — subscripcion en vivo a eventos de conversaciones y mensajes.
 *
 * Sprint 3 Fase 5.
 *
 * Crea UN canal Supabase por org (`clinic:{orgId}`) que recibe eventos
 * postgres_changes filtrados por organization_id. Asi el inbox se actualiza
 * al instante sin esperar el polling.
 *
 * Eventos manejados:
 *   - INSERT en conversations → nueva conv (callback onConversationInserted)
 *   - UPDATE en conversations → status, unread_count, last_message_at, etc.
 *   - INSERT en message_logs → mensaje nuevo (callback onMessageInserted)
 *   - UPDATE en message_logs → status update (sent/delivered/read), transcripcion
 *
 * El consumidor (Inbox.tsx) pasa callbacks para mergear updates en su state.
 *
 * Reconexion automatica via supabase-js. Cleanup en unmount.
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ConversationRowDb = {
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
};

type MessageRowDb = {
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
};

export interface RealtimeInboxCallbacks {
  onConversationInserted?: (row: ConversationRowDb) => void;
  onConversationUpdated?: (row: ConversationRowDb) => void;
  onMessageInserted?: (row: MessageRowDb) => void;
  onMessageUpdated?: (row: MessageRowDb) => void;
}

export function useRealtimeInbox(
  organizationId: string | undefined,
  callbacks: RealtimeInboxCallbacks,
) {
  // Stable callbacks via ref para no re-suscribir en cada render
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!organizationId) return;

    const channelName = `clinic:${organizationId}`;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    // Esperar a que la sesion auth este lista y aplicar el JWT al WS ANTES de
    // subscribirse. Si el socket arranca con anon, RLS bloquea los eventos.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      channel = supabase
        .channel(channelName)
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversations",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: ConversationRowDb }) => {
            callbacksRef.current.onConversationInserted?.(payload.new);
          },
        )
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: ConversationRowDb }) => {
            callbacksRef.current.onConversationUpdated?.(payload.new);
          },
        )
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_logs",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: MessageRowDb }) => {
            if (payload.new.conversation_id) {
              callbacksRef.current.onMessageInserted?.(payload.new);
            }
          },
        )
        .on(
          // @ts-expect-error supabase-js postgres_changes types
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "message_logs",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: MessageRowDb }) => {
            if (payload.new.conversation_id) {
              callbacksRef.current.onMessageUpdated?.(payload.new);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            console.warn(`[useRealtimeInbox] channel status: ${status}`);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
        console.log(`[useRealtimeInbox] unsubscribed from ${channelName}`);
      }
    };
  }, [organizationId]);
}

/**
 * Reproduce un beep corto via Web Audio API.
 *
 * Sin archivos externos. Tono 440Hz/220ms a volumen suave.
 * Mute si la pestana esta oculta (document.hidden).
 *
 * Cooldown 2s entre beeps para no spammear cuando llegan muchos mensajes seguidos.
 */
let lastBeepAt = 0;

export function playNotificationBeep() {
  if (typeof window === "undefined") return;
  if (document.hidden) return; // No sonar si la pestana no esta focused
  const now = Date.now();
  if (now - lastBeepAt < 2000) return; // Cooldown 2s
  lastBeepAt = now;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 740; // tono medio-alto, agradable
    osc.type = "sine";
    gain.gain.value = 0;

    // Envolvente: 30ms attack, 200ms sustain, 100ms release
    const t = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.23);
    gain.gain.linearRampToValueAtTime(0, t + 0.33);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);

    // Cleanup
    osc.onended = () => {
      ctx.close().catch(() => undefined);
    };
  } catch (e) {
    console.warn("[notificationBeep] failed:", e);
  }
}
