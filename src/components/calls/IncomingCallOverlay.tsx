/**
 * IncomingCallOverlay — modal flotante global para llamadas (inbound + outbound).
 *
 * Wrapper monta inner con key={direction-callIdMeta-conversationId} para que
 * cada llamada arranque con state limpio (no arrastra estado del WebRTC peer
 * anterior). Inner se desmonta cuando activeCall pasa a null.
 *
 * Inbound flow: ringtone hasta atender, SDP offer viene en activeCall.sdpOffer.
 * Outbound flow: auto startOutgoing al montar, POST inbox-call-patient,
 * listener Realtime espera SDP answer (raw_payload.session.sdp_type=answer).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useIncomingCall, type IncomingCallData } from "@/context/IncomingCallContext";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SUPABASE_FUNCTIONS_BASE =
  "https://soxrlxvivuplezssgssq.supabase.co/functions/v1";

// ---------------------------------------------------------------------------
// Ringtone: dos tonos alternados via WebAudio. Loop hasta stop().
// ---------------------------------------------------------------------------
function createRingtone(): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let interval: number | null = null;

  function playBurst() {
    if (!ctx) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 480;
    osc2.frequency.value = 620;
    osc1.type = "sine";
    osc2.type = "sine";

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
    gain.gain.setValueAtTime(0.18, t + 0.95);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.0);
    osc2.stop(t + 1.0);
  }

  return {
    start: () => {
      if (ctx) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
        playBurst();
        interval = window.setInterval(playBurst, 2000);
      } catch (e) {
        console.warn("[ringtone] failed:", (e as Error).message);
      }
    },
    stop: () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (ctx) {
        ctx.close().catch(() => undefined);
        ctx = null;
      }
    },
  };
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

export function IncomingCallOverlay() {
  const { activeCall, dismiss } = useIncomingCall();
  if (!activeCall) return null;
  const key = `${activeCall.direction}-${activeCall.callIdMeta}-${activeCall.conversationId}`;
  return <CallOverlayInner key={key} call={activeCall} dismiss={dismiss} />;
}

interface InnerProps {
  call: IncomingCallData;
  dismiss: () => void;
}

function CallOverlayInner({ call: activeCall, dismiss }: InnerProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const {
    callState,
    error,
    acceptIncoming,
    startOutgoing,
    setRemoteAnswer,
    hangup,
    setMicMuted,
    isMicMuted,
  } = useWebRTCCall({ remoteAudioRef });

  const isOutbound = activeCall.direction === "outbound";

  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const [duration, setDuration] = useState(0);
  const acceptedAtRef = useRef<number | null>(null);
  const [outgoingMessageLogId, setOutgoingMessageLogId] = useState<string | null>(null);
  const initRanRef = useRef(false);

  // ---- INBOUND: Ringtone mientras esta ringing ----
  useEffect(() => {
    if (!isOutbound && callState === "idle") {
      ringtoneRef.current = createRingtone();
      ringtoneRef.current.start();
      return () => {
        ringtoneRef.current?.stop();
        ringtoneRef.current = null;
      };
    } else {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
    }
  }, [isOutbound, callState]);

  // ---- OUTBOUND: auto-startOutgoing al montar ----
  useEffect(() => {
    if (!isOutbound) return;
    if (initRanRef.current) return;
    initRanRef.current = true;

    (async () => {
      try {
        const sdpOffer = await startOutgoing();
        const headers = await authHeaders();
        const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-call-patient`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            conversationId: activeCall.conversationId,
            sdpOffer,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error("[outbound] inbox-call-patient failed:", data);
          hangup();
          return;
        }
        if (data.messageLogId) {
          setOutgoingMessageLogId(data.messageLogId as string);
        }
        if (data.sdpAnswer) {
          // Meta retorno answer inline — aplicar inmediato
          await setRemoteAnswer(data.sdpAnswer as string);
        }
      } catch (e) {
        console.error("[outbound] init failed:", (e as Error).message);
        hangup();
      }
    })();
  }, [isOutbound, activeCall.conversationId, startOutgoing, setRemoteAnswer, hangup]);

  // ---- OUTBOUND: listener Realtime para SDP answer via webhook connect ----
  useEffect(() => {
    if (!isOutbound || !outgoingMessageLogId) return;

    const channel = supabase
      .channel(`outbound-call:${outgoingMessageLogId}`)
      .on(
        // @ts-expect-error supabase-js postgres_changes types
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_logs",
          filter: `id=eq.${outgoingMessageLogId}`,
        },
        (payload: { new: { call_id_meta: string | null; raw_payload: unknown } }) => {
          const row = payload.new;
          if (!row.call_id_meta) return;
          const session = (row.raw_payload as { session?: { sdp?: string; sdp_type?: string } })?.session;
          if (session?.sdp_type === "answer" && session.sdp) {
            setRemoteAnswer(session.sdp).catch((e) =>
              console.error("[outbound] setRemoteAnswer failed:", e.message),
            );
          } else if (session?.sdp_type === "offer" && session.sdp) {
            // Meta a veces hace echo del offer en outbound. Si recibimos un offer
            // significa que el answer no llego — esperamos otro UPDATE.
            console.log("[outbound] received echo of offer, waiting for answer");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOutbound, outgoingMessageLogId, setRemoteAnswer]);

  // ---- Duration counter ----
  useEffect(() => {
    if (callState !== "connected") return;
    if (!acceptedAtRef.current) acceptedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const start = acceptedAtRef.current ?? Date.now();
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callState]);

  // ---- Cleanup al terminar ----
  useEffect(() => {
    if (callState === "ended" || callState === "failed") {
      const timeout = setTimeout(() => {
        acceptedAtRef.current = null;
        setDuration(0);
        dismiss();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [callState, dismiss]);

  // ---- Handlers ----
  const handleAccept = useCallback(async () => {
    if (!activeCall.sdpOffer || !activeCall.callIdMeta) return;
    try {
      const sdpAnswer = await acceptIncoming(activeCall.sdpOffer);
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-accept-call`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          sdpAnswer,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[inbound] accept failed:", errData);
        hangup();
      }
    } catch (e) {
      console.error("[inbound] handleAccept threw:", (e as Error).message);
      hangup();
    }
  }, [activeCall, acceptIncoming, hangup]);

  const handleReject = useCallback(async () => {
    if (!activeCall.callIdMeta) {
      dismiss();
      return;
    }
    try {
      const headers = await authHeaders();
      await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          action: "reject",
        }),
      });
    } catch (e) {
      console.error("[inbound] reject error:", (e as Error).message);
    }
    hangup();
    dismiss();
  }, [activeCall, hangup, dismiss]);

  const handleHangup = useCallback(async () => {
    // En outbound el callIdMeta inicial es placeholder. El real lo conocemos
    // si llego el connect — buscarlo en el state o usar el messageLogId.
    let callIdToTerminate: string | null = null;
    if (isOutbound && outgoingMessageLogId) {
      // Hacer query rapido para obtener el call_id_meta real (lo seteo el webhook)
      const { data } = await supabase
        .from("message_logs")
        .select("call_id_meta")
        .eq("id", outgoingMessageLogId)
        .maybeSingle();
      callIdToTerminate = data?.call_id_meta ?? null;
    } else if (!isOutbound) {
      callIdToTerminate = activeCall.callIdMeta;
    }

    if (callIdToTerminate) {
      try {
        const headers = await authHeaders();
        await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            callIdMeta: callIdToTerminate,
            action: "terminate",
          }),
        });
      } catch (e) {
        console.error("[overlay] hangup error:", (e as Error).message);
      }
    }
    hangup();
  }, [isOutbound, outgoingMessageLogId, activeCall.callIdMeta, hangup]);

  // ---- UI computed flags ----
  const inboundRinging = !isOutbound && (callState === "idle" || callState === "preparing");
  const outboundDialing = isOutbound && (callState === "preparing" || callState === "dialing");
  const isActive = callState === "connected" || callState === "answering";

  const displayName = activeCall.patientName ?? activeCall.patientPhone;
  const initials = (activeCall.patientName ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "P";

  let subtitle = "";
  if (inboundRinging) subtitle = "Llamada entrante WhatsApp...";
  else if (outboundDialing) subtitle = "Llamando...";
  else if (callState === "answering") subtitle = "Conectando...";
  else if (callState === "connected") subtitle = `En llamada · ${formatDuration(duration)}`;
  else if (callState === "ended") subtitle = "Llamada finalizada";
  else if (callState === "failed") subtitle = error ?? "Error en la llamada";

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl bg-card shadow-2xl border border-border overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="px-6 py-5">
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-base">{displayName}</p>
            <p
              className={`text-xs mt-0.5 ${
                callState === "connected" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {inboundRinging && (
          <div className="flex gap-3 mt-5 justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={handleReject}
              className="rounded-full h-14 w-14 p-0"
              aria-label="Rechazar"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={handleAccept}
              className="rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700"
              aria-label="Atender"
              disabled={callState === "preparing"}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        )}

        {outboundDialing && (
          <div className="flex gap-3 mt-5 justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={handleHangup}
              className="rounded-full h-14 w-14 p-0"
              aria-label="Cancelar"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isActive && (
          <div className="flex gap-3 mt-5 justify-center">
            <Button
              size="lg"
              variant={isMicMuted ? "default" : "outline"}
              onClick={() => setMicMuted(!isMicMuted)}
              className="rounded-full h-12 w-12 p-0"
              aria-label={isMicMuted ? "Activar mic" : "Silenciar mic"}
            >
              {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleHangup}
              className="rounded-full h-12 w-12 p-0"
              aria-label="Colgar"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
