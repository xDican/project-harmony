/**
 * IncomingCallOverlay — modal flotante global que aparece cuando llega una llamada.
 *
 * Estados:
 *   - hidden: no hay llamada activa
 *   - ringing: paciente llamando, esperando que asistente atienda
 *   - active: asistente atendio, llamada en curso (mute, colgar, duracion)
 *
 * Reproduce un ringtone procedural (WebAudio API, dos tonos alternados) mientras
 * esta en ringing. Para audio remoto usa un <audio> element controlado por
 * useWebRTCCall.
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
        interval = window.setInterval(playBurst, 2000); // ring every 2s (US-style)
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

// ---------------------------------------------------------------------------

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Mount wrapper — fuerza re-mount del overlay por callIdMeta. Cada llamada
 * nueva arranca con state limpio (no arrastra estado del WebRTC peer anterior).
 * Tambien se desmonta cuando activeCall pasa a null (paciente cuelga o
 * terminate via webhook), lo que libera mic + peer connection.
 */
export function IncomingCallOverlay() {
  const { activeCall, dismiss } = useIncomingCall();
  if (!activeCall) return null;
  return <IncomingCallOverlayInner key={activeCall.callIdMeta} call={activeCall} dismiss={dismiss} />;
}

interface InnerProps {
  call: IncomingCallData;
  dismiss: () => void;
}

function IncomingCallOverlayInner({ call: activeCall, dismiss }: InnerProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { callState, error, acceptIncoming, hangup, setMicMuted, isMicMuted } =
    useWebRTCCall({ remoteAudioRef });

  // Ringtone manager
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const [duration, setDuration] = useState(0);
  const acceptedAtRef = useRef<number | null>(null);

  // Start/stop ringtone segun fase
  useEffect(() => {
    if (activeCall && callState === "idle") {
      // Esta ringing y no se atendio aun
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
  }, [activeCall, callState]);

  // Duration counter en activa
  useEffect(() => {
    if (callState !== "connected") return;
    if (!acceptedAtRef.current) acceptedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const start = acceptedAtRef.current ?? Date.now();
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callState]);

  // Si callState va a "ended" o "failed", limpiar overlay y dismiss
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

  const handleAccept = useCallback(async () => {
    if (!activeCall?.sdpOffer || !activeCall.callIdMeta) return;
    try {
      const sdpAnswer = await acceptIncoming(activeCall.sdpOffer);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-accept-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          sdpAnswer,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[IncomingCallOverlay] accept failed:", errData);
        hangup();
      }
    } catch (e) {
      console.error("[IncomingCallOverlay] handleAccept threw:", (e as Error).message);
      hangup();
    }
  }, [activeCall, acceptIncoming, hangup]);

  const handleReject = useCallback(async () => {
    if (!activeCall?.callIdMeta) {
      dismiss();
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          action: "reject",
        }),
      });
    } catch (e) {
      console.error("[IncomingCallOverlay] reject error:", (e as Error).message);
    }
    hangup();
    dismiss();
  }, [activeCall, hangup, dismiss]);

  const handleHangup = useCallback(async () => {
    if (!activeCall?.callIdMeta) {
      hangup();
      dismiss();
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          action: "terminate",
        }),
      });
    } catch (e) {
      console.error("[IncomingCallOverlay] hangup error:", (e as Error).message);
    }
    hangup();
  }, [activeCall, hangup, dismiss]);

  const isRinging = callState === "idle" || callState === "preparing";
  const isActive = callState === "connected" || callState === "answering";

  const displayName = activeCall.patientName ?? activeCall.patientPhone;
  const initials = (activeCall.patientName ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "P";

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
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRinging && "Llamada entrante WhatsApp..."}
              {callState === "answering" && "Conectando..."}
              {callState === "connected" && (
                <span className="text-primary">En llamada · {formatDuration(duration)}</span>
              )}
              {callState === "ended" && "Llamada finalizada"}
              {callState === "failed" && (error ?? "Error en la llamada")}
            </p>
          </div>
        </div>

        {isRinging && (
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
