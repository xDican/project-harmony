/**
 * IncomingCallOverlay — UI flotante para llamadas activas (inbound + outbound).
 *
 * Sprint 6 refactor: este componente SOLO consume CallContext, no maneja state
 * propio de WebRTC ni listeners Realtime. Toda la logica vive en el provider.
 *
 * Renderiza:
 *   - Avatar + nombre + telefono
 *   - Subtitulo segun callPhase
 *   - Botones segun phase: ringing-inbound (atender/rechazar), dialing-outbound
 *     (cancelar), connected (mute/colgar)
 *   - <audio> element para el stream remoto (mount point del CallContext)
 *   - Ringtone procedural WebAudio en ringing-inbound
 */

import { useEffect, useRef } from "react";
import { useCallContext } from "@/context/CallContext";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Ringtone procedural via WebAudio (dual tone 480Hz+620Hz, US style)
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

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

export function IncomingCallOverlay() {
  const {
    activeCall,
    callPhase,
    isMicMuted,
    durationSeconds,
    error,
    acceptIncoming,
    rejectIncoming,
    hangup,
    setMicMuted,
    remoteAudioRef,
  } = useCallContext();

  // Ringtone manager: arranca/para segun phase
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  useEffect(() => {
    if (callPhase === "ringing-inbound") {
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
  }, [callPhase]);

  if (!activeCall) return null;

  const isInboundRinging = callPhase === "ringing-inbound";
  const isOutboundDialing = callPhase === "preparing-outbound" || callPhase === "dialing-outbound";
  const isConnectingOrLive = callPhase === "connecting" || callPhase === "connected";

  const displayName = activeCall.patientName ?? activeCall.patientPhone;
  const initials = (activeCall.patientName ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "P";

  let subtitle = "";
  if (isInboundRinging) subtitle = "Llamada entrante WhatsApp...";
  else if (callPhase === "preparing-outbound") subtitle = "Preparando llamada...";
  else if (callPhase === "dialing-outbound") subtitle = "Llamando...";
  else if (callPhase === "connecting") subtitle = "Conectando...";
  else if (callPhase === "connected") subtitle = `En llamada · ${formatDuration(durationSeconds)}`;
  else if (callPhase === "ended") subtitle = error ?? "Llamada finalizada";

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
                callPhase === "connected" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {isInboundRinging && (
          <div className="flex gap-3 mt-5 justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={rejectIncoming}
              className="rounded-full h-14 w-14 p-0"
              aria-label="Rechazar"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={acceptIncoming}
              className="rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700"
              aria-label="Atender"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isOutboundDialing && (
          <div className="flex gap-3 mt-5 justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={hangup}
              className="rounded-full h-14 w-14 p-0"
              aria-label="Cancelar"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isConnectingOrLive && (
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
              onClick={hangup}
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
