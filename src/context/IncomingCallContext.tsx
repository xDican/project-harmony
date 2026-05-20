/**
 * IncomingCallContext — state global de la llamada activa (entrante o saliente).
 *
 * Sprint 6. Escucha INSERT/UPDATE en message_logs filtrado a voice_call de la org
 * actual. Cuando llega un voice_call inbound con status=ringing, popula un state
 * global que IncomingCallOverlay consume para mostrar el modal flotante con
 * ringtone + botones atender/rechazar.
 *
 * Canal separado de InboxContext (que ya tiene `clinic:{orgId}`). Asi no
 * pisamos el listener de mensajes normales. El channel se llama `calls:{orgId}`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/context/UserContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface IncomingCallData {
  messageLogId: string;
  /** Inbound: real call_id Meta. Outbound: temporal 'outgoing-{convId}' hasta que llegue el real. */
  callIdMeta: string;
  conversationId: string;
  patientPhone: string;
  patientName: string | null;
  direction: "inbound" | "outbound";
  /** SDP offer del webhook connect (solo presente cuando direction=inbound). */
  sdpOffer: string | null;
  receivedAt: string;
}

interface IncomingCallContextValue {
  /** Llamada actualmente activa (ringing o en curso). null si no hay. */
  activeCall: IncomingCallData | null;
  /** Limpia el state — usado despues de hangup/reject/terminate. */
  dismiss: () => void;
  /**
   * Inicia un outbound call. Setea activeCall en modo outbound;
   * el overlay arma WebRTC + POST a inbox-call-patient.
   */
  initiateOutgoingCall: (args: {
    conversationId: string;
    patientPhone: string;
    patientName: string | null;
  }) => void;
}

const Ctx = createContext<IncomingCallContextValue | null>(null);

interface MessageLogRow {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  message_type: string;
  call_id_meta: string | null;
  call_status: string | null;
  call_direction: string | null;
  direction: string;
  from_phone: string;
  raw_payload: unknown;
  created_at: string;
}

function extractSdpOffer(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const session = (raw as { session?: { sdp?: string; sdp_type?: string } }).session;
  if (session?.sdp_type === "offer" && typeof session.sdp === "string") {
    return session.sdp;
  }
  return null;
}

export function IncomingCallProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const organizationId = user?.organizationId ?? undefined;
  const [activeCall, setActiveCall] = useState<IncomingCallData | null>(null);

  const dismiss = useCallback(() => setActiveCall(null), []);

  const initiateOutgoingCall = useCallback(
    (args: { conversationId: string; patientPhone: string; patientName: string | null }) => {
      setActiveCall({
        messageLogId: "",
        callIdMeta: `outgoing-${args.conversationId}-${Date.now()}`,
        conversationId: args.conversationId,
        patientPhone: args.patientPhone,
        patientName: args.patientName,
        direction: "outbound",
        sdpOffer: null,
        receivedAt: new Date().toISOString(),
      });
    },
    [],
  );

  // Listener Realtime para voice_call ringing inbound
  useEffect(() => {
    if (!organizationId) return;

    const channelName = `calls:${organizationId}`;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

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
            table: "message_logs",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: MessageLogRow }) => {
            const row = payload.new;
            if (row.message_type !== "voice_call") return;
            if (row.call_status !== "ringing") return;
            if (row.call_direction !== "inbound") return;
            if (!row.call_id_meta || !row.conversation_id) return;

            const sdpOffer = extractSdpOffer(row.raw_payload);
            if (!sdpOffer) {
              console.warn("[IncomingCallContext] voice_call sin SDP offer:", row.id);
              return;
            }

            // Resolver patient_name desde conversation (opt: hacemos query)
            (async () => {
              const { data: conv } = await supabase
                .from("conversations")
                .select("patient_name, patient_phone")
                .eq("id", row.conversation_id!)
                .maybeSingle();

              setActiveCall({
                messageLogId: row.id,
                callIdMeta: row.call_id_meta!,
                conversationId: row.conversation_id!,
                patientPhone: conv?.patient_phone ?? row.from_phone,
                patientName: conv?.patient_name ?? null,
                direction: "inbound",
                sdpOffer,
                receivedAt: row.created_at,
              });
            })();
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
          (payload: { new: MessageLogRow }) => {
            const row = payload.new;
            // Si la llamada activa termino externamente (ej. paciente colgo),
            // limpiar el state.
            if (row.message_type !== "voice_call") return;
            if (!row.call_id_meta) return;
            const terminalStatuses = ["ended", "missed", "rejected", "failed"];
            if (terminalStatuses.includes(row.call_status ?? "")) {
              setActiveCall((cur) =>
                cur?.callIdMeta === row.call_id_meta ? null : cur,
              );
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return (
    <Ctx.Provider value={{ activeCall, dismiss, initiateOutgoingCall }}>
      {children}
    </Ctx.Provider>
  );
}

export function useIncomingCall(): IncomingCallContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      activeCall: null,
      dismiss: () => undefined,
      initiateOutgoingCall: () => undefined,
    };
  }
  return ctx;
}
