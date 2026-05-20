/**
 * useWebRTCCall — encapsula RTCPeerConnection para llamadas WhatsApp Calling API.
 *
 * Meta usa vanilla ICE (todos los ICE candidates en el SDP inicial, sin trickle)
 * y codec OPUS, asi que el flow es:
 *   1. setRemoteDescription(offer) con el SDP que vino del webhook
 *   2. getUserMedia({ audio: true })
 *   3. addTrack(mic) al peer
 *   4. createAnswer() → setLocalDescription
 *   5. Esperar a que ICE gathering complete (porque vanilla ICE)
 *   6. Devolver el SDP answer completo → caller hace POST a inbox-accept-call
 *
 * El audio remoto se reproduce automaticamente cuando llega ontrack del peer.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type CallState =
  | "idle"
  | "preparing"     // getUserMedia, arming peer
  | "answering"    // waiting for backend to accept
  | "connected"    // media flowing
  | "ended"
  | "failed";

interface UseWebRTCCallOpts {
  /** Element <audio> donde reproducir el stream remoto. */
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

export interface UseWebRTCCallApi {
  callState: CallState;
  error: string | null;
  /**
   * Acepta llamada inbound. Recibe el SDP offer que vino del webhook,
   * arma el peer + getUserMedia, genera SDP answer, espera ICE complete.
   * Resuelve con el SDP answer (vanilla ICE — incluye todos los candidates).
   */
  acceptIncoming: (sdpOffer: string) => Promise<string>;
  /** Cierra el peer y libera el mic. */
  hangup: () => void;
  /** Mute/unmute del mic local. */
  setMicMuted: (muted: boolean) => void;
  isMicMuted: boolean;
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTCCall(opts: UseWebRTCCallOpts): UseWebRTCCallApi {
  const [callState, setCallState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      try {
        pcRef.current?.close();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch (_) { /* ignore */ }
    };
  }, []);

  const acceptIncoming = useCallback(
    async (sdpOffer: string): Promise<string> => {
      setError(null);
      setCallState("preparing");

      try {
        // 1) Capturar mic
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = localStream;

        // 2) Crear peer connection
        const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        pcRef.current = pc;

        // Reproducir audio remoto
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (opts.remoteAudioRef.current && remoteStream) {
            opts.remoteAudioRef.current.srcObject = remoteStream;
            opts.remoteAudioRef.current.play().catch((e) => {
              console.warn("[useWebRTCCall] remote audio play failed:", e.message);
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          console.log("[useWebRTCCall] connection state:", s);
          if (s === "connected") setCallState("connected");
          if (s === "failed" || s === "closed" || s === "disconnected") {
            setCallState(s === "failed" ? "failed" : "ended");
          }
        };

        // 3) Agregar mic al peer
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // 4) Set remote desc con el offer de Meta
        await pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });

        // 5) Crear answer + set local desc
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 6) Esperar ICE gathering completo (vanilla ICE)
        const finalSdp = await new Promise<string>((resolve) => {
          if (pc.iceGatheringState === "complete") {
            resolve(pc.localDescription!.sdp);
            return;
          }
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve(pc.localDescription!.sdp);
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
          // Timeout safety net: 3s
          setTimeout(() => {
            pc.removeEventListener("icegatheringstatechange", checkState);
            if (pc.localDescription) resolve(pc.localDescription.sdp);
          }, 3000);
        });

        setCallState("answering");
        return finalSdp;
      } catch (err) {
        const msg = (err as Error).message;
        console.error("[useWebRTCCall] acceptIncoming failed:", msg);
        setError(msg);
        setCallState("failed");
        // Cleanup parcial
        try {
          pcRef.current?.close();
          localStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch (_) { /* ignore */ }
        throw err;
      }
    },
    [opts.remoteAudioRef],
  );

  const hangup = useCallback(() => {
    try {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (_) { /* ignore */ }
    pcRef.current = null;
    localStreamRef.current = null;
    setCallState("ended");
  }, []);

  const setMicMuted = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    setIsMicMuted(muted);
  }, []);

  return { callState, error, acceptIncoming, hangup, setMicMuted, isMicMuted };
}
