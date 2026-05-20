/**
 * CallContext — single source of truth para llamadas WhatsApp (Sprint 6 refactor).
 *
 * Reemplaza a IncomingCallContext + useWebRTCCall + listeners locales en
 * IncomingCallOverlay y CallPatientButton.
 *
 * Responsabilidades:
 *   - state activeCall + callPhase derivado de DB y WebRTC
 *   - peer connection + media streams + audio ref
 *   - 1 listener Realtime sobre canal `calls:{orgId}` que cubre:
 *     - INSERT voice_call inbound ringing → setActiveCall
 *     - UPDATE voice_call (match callIdMeta o conversation_id+outbound):
 *       - SDP answer en raw_payload → setRemoteAnswer (una sola vez)
 *       - status terminal → endActiveCall (cleanup + grace 800ms)
 *     - INSERT call_permissions → upsert en map permissions
 *   - acciones: initiateOutgoing, acceptIncoming, rejectIncoming, hangup,
 *     setMicMuted, requestPermission
 *
 * Patron Sprint 3: igual que InboxContext consolidó 3 listeners en uno.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/context/UserContext";
import { useInbox, type MessageLogEvent } from "@/context/InboxContext";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

const SUPABASE_FUNCTIONS_BASE =
  "https://soxrlxvivuplezssgssq.supabase.co/functions/v1";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallPhase =
  | "idle"
  | "ringing-inbound"
  | "preparing-outbound"
  | "dialing-outbound"
  | "connecting"
  | "connected"
  | "ended";

export interface ActiveCall {
  /** UUID de la fila message_logs (en outbound, set despues del POST inbox-call-patient) */
  messageLogId: string | null;
  /** call_id_meta — null hasta que llega webhook connect (en outbound) */
  callIdMeta: string | null;
  conversationId: string;
  patientPhone: string;
  patientName: string | null;
  direction: "inbound" | "outbound";
  /** SDP offer solo presente en inbound (viene en raw_payload del INSERT) */
  sdpOffer: string | null;
  receivedAt: string;
}

export interface CallPermission {
  status: "granted" | "rejected" | "expired" | "revoked";
  expiresAt: string | null;
  grantedAt: string | null;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  /** Llamadas adicionales en cola (entrantes que llegaron mientras una activa). */
  queuedCalls: ActiveCall[];
  callPhase: CallPhase;
  isMicMuted: boolean;
  durationSeconds: number;
  error: string | null;

  getPermissionFor(conversationId: string): CallPermission | null;

  initiateOutgoing(args: {
    conversationId: string;
    patientPhone: string;
    patientName: string | null;
  }): Promise<void>;
  acceptIncoming(): Promise<void>;
  rejectIncoming(): Promise<void>;
  hangup(): Promise<void>;
  setMicMuted(muted: boolean): void;
  requestPermission(conversationId: string): Promise<void>;

  remoteAudioRef: RefObject<HTMLAudioElement>;
}

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

interface CallPermissionRow {
  id: string;
  organization_id: string;
  conversation_id: string;
  status: "granted" | "rejected" | "expired" | "revoked";
  expires_at: string | null;
  granted_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = ["ended", "missed", "rejected", "failed"];

function extractSdpFromPayload(
  raw: unknown,
): { sdp: string; sdp_type: "offer" | "answer" } | null {
  if (!raw || typeof raw !== "object") return null;
  const session = (raw as { session?: { sdp?: string; sdp_type?: string } }).session;
  if (!session?.sdp || !session.sdp_type) return null;
  if (session.sdp_type !== "offer" && session.sdp_type !== "answer") return null;
  return { sdp: session.sdp, sdp_type: session.sdp_type };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const Ctx = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const organizationId = user?.organizationId ?? undefined;
  const { subscribeToMessageLog } = useInbox();

  // callQueue[0] es la llamada activa. callQueue[1+] son entrantes en espera.
  // Cuando una llamada activa termina, shift y promovemos la siguiente.
  const [callQueue, setCallQueue] = useState<ActiveCall[]>([]);
  const activeCall = callQueue[0] ?? null;
  const queuedCalls = useMemo(() => callQueue.slice(1), [callQueue]);

  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [isMicMuted, setIsMicMutedState] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Map<string, CallPermission>>(new Map());

  // Refs WebRTC + audio
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAnswerAppliedRef = useRef(false);
  const acceptedAtRef = useRef<number | null>(null);
  // Token de cancelacion para outbound init en vuelo. Si el usuario cuelga
  // antes de que el flow termine (getUserMedia + ICE + POST), abortamos.
  const outboundAbortRef = useRef<AbortController | null>(null);

  // ---- Cleanup peer connection (centralizado) ----
  const cleanupPeer = useCallback(() => {
    try {
      outboundAbortRef.current?.abort();
    } catch (_) { /* ignore */ }
    outboundAbortRef.current = null;
    if (audioWatcherRef.current) {
      clearInterval(audioWatcherRef.current);
      audioWatcherRef.current = null;
    }
    try {
      peerRef.current?.close();
    } catch (_) { /* ignore */ }
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (_) { /* ignore */ }
    peerRef.current = null;
    localStreamRef.current = null;
    remoteAnswerAppliedRef.current = false;
    acceptedAtRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  // ---- Transition: termina la llamada activa, promueve la siguiente del queue ----
  // grace=true: muestra "Llamada finalizada" 800ms antes de promover/clear.
  //   Usado para terminates remotos (paciente colgo) para que el usuario
  //   entienda que paso.
  // grace=false: clear inmediato. Usado en hangup manual.
  const endActiveCall = useCallback((opts?: { grace?: boolean }) => {
    cleanupPeer();
    const useGrace = opts?.grace !== false;

    const finalize = () => {
      setDurationSeconds(0);
      setIsMicMutedState(false);
      setError(null);
      setCallQueue((prev) => {
        const next = prev.slice(1);  // shift la primera (la que termino)
        return next;
      });
      // Si hay siguiente, el listener UI lo detectara automaticamente.
      // El phase vuelve a 'idle' si no hay siguiente; si hay, queda en
      // 'ringing-inbound' (porque la siguiente del queue es siempre inbound
      // ringing — los outbound nunca se encolan, se rechazan en initiateOutgoing).
      setCallPhase("idle");
    };

    if (useGrace) {
      setCallPhase("ended");
      setTimeout(finalize, 800);
    } else {
      finalize();
    }
  }, [cleanupPeer]);

  // ---- Cuando hay nueva activa post-shift, transicionar el phase ----
  // Si callQueue[0] cambia (nueva llamada promovida del queue), setear phase
  // a ringing-inbound (las que se encolan son siempre inbound ringing).
  const previousActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = activeCall?.messageLogId ?? activeCall?.callIdMeta ?? null;
    if (currentId !== previousActiveIdRef.current) {
      previousActiveIdRef.current = currentId;
      if (activeCall && activeCall.direction === "inbound" && callPhase === "idle") {
        setCallPhase("ringing-inbound");
      }
    }
  }, [activeCall, callPhase]);

  // ---- Crear peer connection con handlers genericos ----
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((e) => {
          console.warn("[CallContext] remote audio play failed:", e.message);
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log("[CallContext] peer connection state:", s);
      if (s === "connected") {
        // Para INBOUND: el "atender" fue manual de la asistente, asi que apenas
        // WebRTC conecta = audio fluyendo de ambos lados = "connected" real.
        // Para OUTBOUND: WebRTC conecta apenas Meta entrega el SDP answer (el
        // paciente todavia no ha tocado atender). NO transicionar a connected
        // hasta detectar audio real con getStats().bytesReceived.
        const dir = callQueueRef.current[0]?.direction;
        if (dir === "inbound") {
          setCallPhase("connected");
          if (!acceptedAtRef.current) acceptedAtRef.current = Date.now();
        } else if (dir === "outbound") {
          startOutboundAudioWatcher(pc);
        }
      } else if (s === "failed") {
        setError("Conexion fallida");
        endActiveCall();
      } else if (s === "closed" || s === "disconnected") {
        if (callPhaseRef.current === "connected") {
          endActiveCall();
        }
      }
    };

    return pc;
  }, [endActiveCall]);

  // Ref para leer callQueue dentro de callbacks sin re-crearlos
  const callQueueRef = useRef<ActiveCall[]>([]);
  useEffect(() => {
    callQueueRef.current = callQueue;
  }, [callQueue]);

  // ---- Audio activity watcher (outbound) ----
  // Llama bytesReceived periodicamente; cuando supera un threshold = paciente
  // atendio = transicionar a 'connected'. Hasta entonces queda 'dialing-outbound'.
  const audioWatcherRef = useRef<number | null>(null);
  const startOutboundAudioWatcher = useCallback((pc: RTCPeerConnection) => {
    if (audioWatcherRef.current) return;
    let lastBytes = 0;
    const id = window.setInterval(async () => {
      if (callPhaseRef.current === "connected") {
        if (audioWatcherRef.current) {
          clearInterval(audioWatcherRef.current);
          audioWatcherRef.current = null;
        }
        return;
      }
      try {
        const stats = await pc.getStats();
        let received = 0;
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && typeof report.bytesReceived === "number") {
            received = Math.max(received, report.bytesReceived);
          }
        });
        // Threshold: >2KB total Y delta sostenido (>50 bytes en 300ms). Eso
        // discrimina audio real de comfort noise/keepalive del peer ringing.
        if (received > 2000 && received - lastBytes > 50) {
          setCallPhase("connected");
          if (!acceptedAtRef.current) acceptedAtRef.current = Date.now();
          if (audioWatcherRef.current) {
            clearInterval(audioWatcherRef.current);
            audioWatcherRef.current = null;
          }
        }
        lastBytes = received;
      } catch (_) { /* ignore */ }
    }, 300);
    audioWatcherRef.current = id;
  }, []);

  // Ref para leer callPhase actual dentro de callbacks sin re-crearlos
  const callPhaseRef = useRef<CallPhase>(callPhase);
  useEffect(() => {
    callPhaseRef.current = callPhase;
  }, [callPhase]);

  // ---- Apply remote SDP answer (outbound) — una sola vez ----
  const applyRemoteAnswer = useCallback(async (sdpAnswer: string) => {
    if (remoteAnswerAppliedRef.current) return;
    if (!peerRef.current) {
      console.warn("[CallContext] applyRemoteAnswer: no peer");
      return;
    }
    const validPhases: CallPhase[] = ["dialing-outbound", "connecting", "preparing-outbound"];
    if (!validPhases.includes(callPhaseRef.current)) {
      console.log("[CallContext] applyRemoteAnswer: ignoring, phase=", callPhaseRef.current);
      return;
    }
    try {
      remoteAnswerAppliedRef.current = true;
      await peerRef.current.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
      setCallPhase("connecting");
      console.log("[CallContext] remote answer applied");
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[CallContext] setRemoteDescription failed:", msg);
      setError(msg);
      endActiveCall();
    }
  }, [endActiveCall]);

  // ---- Wait ICE gathering complete (vanilla ICE) ----
  const waitIceComplete = useCallback((pc: RTCPeerConnection): Promise<string> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve(pc.localDescription!.sdp);
        return;
      }
      const onChange = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", onChange);
          resolve(pc.localDescription!.sdp);
        }
      };
      pc.addEventListener("icegatheringstatechange", onChange);
      setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", onChange);
        if (pc.localDescription) resolve(pc.localDescription.sdp);
      }, 3000);
    });
  }, []);

  // ---- ACTIONS ----

  const acceptIncoming = useCallback(async () => {
    if (!activeCall || activeCall.direction !== "inbound" || !activeCall.sdpOffer || !activeCall.callIdMeta) {
      console.warn("[CallContext] acceptIncoming: invalid state");
      return;
    }
    if (callPhaseRef.current !== "ringing-inbound") {
      console.warn("[CallContext] acceptIncoming: phase=", callPhaseRef.current);
      return;
    }

    setError(null);
    setCallPhase("preparing-outbound");  // reusamos preparing label porque arma peer

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription({ type: "offer", sdp: activeCall.sdpOffer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const finalSdp = await waitIceComplete(pc);

      setCallPhase("connecting");

      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-accept-call`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          callIdMeta: activeCall.callIdMeta,
          sdpAnswer: finalSdp,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? "inbox-accept-call failed");
      }
      // peer.onconnectionstatechange manejara la transicion a 'connected'
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[CallContext] acceptIncoming failed:", msg);
      setError(msg);
      endActiveCall();
    }
  }, [activeCall, createPeerConnection, waitIceComplete, endActiveCall]);

  const rejectIncoming = useCallback(async () => {
    if (!activeCall || activeCall.direction !== "inbound" || !activeCall.callIdMeta) {
      endActiveCall({ grace: false });
      return;
    }

    const callIdMeta = activeCall.callIdMeta;

    // Optimista: cerrar overlay ya.
    endActiveCall({ grace: false });

    // POST reject en background.
    void (async () => {
      try {
        const headers = await authHeaders();
        await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
          method: "POST",
          headers,
          body: JSON.stringify({ callIdMeta, action: "reject" }),
        });
      } catch (e) {
        console.error("[CallContext] rejectIncoming background error:", (e as Error).message);
      }
    })();
  }, [activeCall, endActiveCall]);

  const initiateOutgoing = useCallback(async (args: {
    conversationId: string;
    patientPhone: string;
    patientName: string | null;
  }) => {
    if (callPhaseRef.current !== "idle") {
      console.warn("[CallContext] initiateOutgoing: phase=", callPhaseRef.current);
      return;
    }

    setError(null);
    setCallQueue([{
      messageLogId: null,
      callIdMeta: null,
      conversationId: args.conversationId,
      patientPhone: args.patientPhone,
      patientName: args.patientName,
      direction: "outbound",
      sdpOffer: null,
      receivedAt: new Date().toISOString(),
    }]);
    setCallPhase("preparing-outbound");

    // AbortController para que hangup() pueda cancelar el fetch en vuelo.
    // El check `aborted` despues de cada await detiene el flow si el usuario
    // colgo antes de que el POST se enviara.
    const abortCtl = new AbortController();
    outboundAbortRef.current = abortCtl;
    const isAborted = () => abortCtl.signal.aborted;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isAborted()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      if (isAborted()) return;
      await pc.setLocalDescription(offer);
      if (isAborted()) return;
      const finalSdp = await waitIceComplete(pc);
      if (isAborted()) return;

      setCallPhase("dialing-outbound");

      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-call-patient`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: args.conversationId,
          sdpOffer: finalSdp,
        }),
        signal: abortCtl.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "inbox-call-patient failed");
      }

      // Si el usuario colgo despues del POST exitoso, terminate de Meta para
      // no dejar la llamada flotando del lado del paciente.
      if (isAborted()) {
        if (data.metaCallId) {
          void (async () => {
            try {
              const h = await authHeaders();
              await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-terminate-call`, {
                method: "POST",
                headers: h,
                body: JSON.stringify({ callIdMeta: data.metaCallId, action: "terminate" }),
              });
            } catch (_) { /* ignore */ }
          })();
        }
        return;
      }

      // Guardar messageLogId en el activo del queue
      if (data.messageLogId) {
        setCallQueue((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          next[0] = { ...next[0], messageLogId: data.messageLogId };
          return next;
        });
      }

      // Si Meta retorno answer inline, aplicarlo
      if (data.sdpAnswer) {
        await applyRemoteAnswer(data.sdpAnswer);
      }
      // Si no, esperamos el webhook connect que dispara applyRemoteAnswer via listener
    } catch (err) {
      // AbortError no es un fallo real — el usuario cancelo
      if ((err as Error).name === "AbortError" || isAborted()) {
        console.log("[CallContext] initiateOutgoing aborted by user");
        return;
      }
      const msg = (err as Error).message;
      console.error("[CallContext] initiateOutgoing failed:", msg);
      setError(msg);
      endActiveCall();
    }
  }, [createPeerConnection, waitIceComplete, applyRemoteAnswer, endActiveCall]);

  const hangup = useCallback(async () => {
    if (!activeCall) {
      endActiveCall({ grace: false });
      return;
    }

    // Snapshot del activeCall ANTES de cerrar el overlay (porque el clear
    // va a setear activeCall = null inmediato).
    const snapshot = activeCall;

    // 1) UI optimista: cerrar overlay ya. El user no necesita esperar a Meta.
    endActiveCall({ grace: false });

    // 2) POST terminate en background (fire-and-forget). Resolver call_id_meta
    //    real si era outbound y aun no lo teniamos en activeCall.
    void (async () => {
      try {
        let callIdToTerminate = snapshot.callIdMeta;
        if (!callIdToTerminate && snapshot.messageLogId) {
          const { data } = await supabase
            .from("message_logs")
            .select("call_id_meta")
            .eq("id", snapshot.messageLogId)
            .maybeSingle();
          callIdToTerminate = data?.call_id_meta ?? null;
        }
        if (!callIdToTerminate) return;

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
        console.error("[CallContext] hangup background terminate failed:", (e as Error).message);
      }
    })();
  }, [activeCall, endActiveCall]);

  const setMicMuted = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    setIsMicMutedState(muted);
  }, []);

  const requestPermission = useCallback(async (conversationId: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-request-call-permission`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error ?? "inbox-request-call-permission failed");
    }
  }, []);

  const getPermissionFor = useCallback((conversationId: string): CallPermission | null => {
    return permissions.get(conversationId) ?? null;
  }, [permissions]);

  // ---- Duration counter ----
  useEffect(() => {
    if (callPhase !== "connected") return;
    if (!acceptedAtRef.current) acceptedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const start = acceptedAtRef.current ?? Date.now();
      setDurationSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callPhase]);

  // ---- Initial permissions fetch (cargar todas las activas de la org) ----
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("call_permissions")
        .select("conversation_id, status, expires_at, granted_at, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (cancelled || !data) return;
      // Agrupar por conversation_id y tomar el mas reciente
      const map = new Map<string, CallPermission>();
      for (const row of data) {
        if (!map.has(row.conversation_id)) {
          map.set(row.conversation_id, {
            status: row.status,
            expiresAt: row.expires_at,
            grantedAt: row.granted_at,
          });
        }
      }
      setPermissions(map);
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  // ---- Subscribe a eventos de message_logs via InboxContext (EventBus) ----
  // No creamos nuestro propio channel Realtime sobre message_logs — InboxContext
  // ya lo escucha en clinic:{orgId} y nos despacha cada INSERT/UPDATE.
  useEffect(() => {
    if (!organizationId) return;

    const handleMessageLogEvent = (event: MessageLogEvent) => {
      const row = event.row as unknown as MessageLogRow;
      if (row.message_type !== "voice_call") return;

      if (event.type === "INSERT") {
        if (row.call_status !== "ringing") return;
        if (row.call_direction !== "inbound") return;
        if (!row.call_id_meta || !row.conversation_id) return;

        const sdpInfo = extractSdpFromPayload(row.raw_payload);
        if (!sdpInfo || sdpInfo.sdp_type !== "offer") {
          console.warn("[CallContext] inbound voice_call sin SDP offer:", row.id);
          return;
        }

        // Resolver patient_name async + agregar al queue
        (async () => {
          const { data: conv } = await supabase
            .from("conversations")
            .select("patient_name, patient_phone")
            .eq("id", row.conversation_id!)
            .maybeSingle();

          const newCall: ActiveCall = {
            messageLogId: row.id,
            callIdMeta: row.call_id_meta!,
            conversationId: row.conversation_id!,
            patientPhone: conv?.patient_phone ?? row.from_phone,
            patientName: conv?.patient_name ?? null,
            direction: "inbound",
            sdpOffer: sdpInfo.sdp,
            receivedAt: row.created_at,
          };

          setCallQueue((prev) => {
            if (prev.some((c) => c.callIdMeta === newCall.callIdMeta)) return prev;
            if (prev.length > 0) {
              const name = newCall.patientName ?? newCall.patientPhone;
              toast(`📞 Llamada en espera de ${name}`, {
                description: "Se mostrara al terminar la actual",
              });
            }
            return [...prev, newCall];
          });
        })();
        return;
      }

      // UPDATE
      if (!row.call_id_meta) return;

      if (TERMINAL_STATUSES.includes(row.call_status ?? "")) {
        setCallQueue((prev) => {
          if (prev.length === 0) return prev;
          const matchIdx = prev.findIndex((c) => {
            const matchInbound = c.callIdMeta === row.call_id_meta;
            const matchOutbound =
              c.direction === "outbound" &&
              c.conversationId === row.conversation_id;
            return matchInbound || matchOutbound;
          });
          if (matchIdx === -1) return prev;
          if (matchIdx === 0) {
            queueMicrotask(() => endActiveCall());
            return prev;
          }
          return [...prev.slice(0, matchIdx), ...prev.slice(matchIdx + 1)];
        });
        return;
      }

      // Outbound: SDP answer en raw_payload → setRemoteDescription
      const sdpInfo = extractSdpFromPayload(row.raw_payload);
      if (sdpInfo?.sdp_type === "answer" && row.call_direction === "outbound") {
        setCallQueue((prev) => {
          if (prev.length === 0) return prev;
          const cur = prev[0];
          if (cur.direction !== "outbound") return prev;
          if (cur.conversationId !== row.conversation_id) return prev;
          queueMicrotask(() => applyRemoteAnswer(sdpInfo.sdp));
          const next = [...prev];
          next[0] = { ...cur, callIdMeta: row.call_id_meta };
          return next;
        });
      }
    };

    const unsub = subscribeToMessageLog(handleMessageLogEvent);
    return unsub;
  }, [organizationId, endActiveCall, applyRemoteAnswer, subscribeToMessageLog]);

  // ---- Channel Realtime SOLO para call_permissions ----
  // (message_logs ahora se consume via InboxContext, ver useEffect arriba)
  useEffect(() => {
    if (!organizationId) return;

    const channelName = `call-perms:${organizationId}`;
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
            table: "call_permissions",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: { new: CallPermissionRow }) => {
            const row = payload.new;
            setPermissions((prev) => {
              const next = new Map(prev);
              next.set(row.conversation_id, {
                status: row.status,
                expiresAt: row.expires_at,
                grantedAt: row.granted_at,
              });
              return next;
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [organizationId]);

  // ---- Cleanup en unmount del provider (defensa) ----
  useEffect(() => {
    return () => {
      cleanupPeer();
    };
  }, [cleanupPeer]);

  const value = useMemo<CallContextValue>(() => ({
    activeCall,
    queuedCalls,
    callPhase,
    isMicMuted,
    durationSeconds,
    error,
    getPermissionFor,
    initiateOutgoing,
    acceptIncoming,
    rejectIncoming,
    hangup,
    setMicMuted,
    requestPermission,
    remoteAudioRef,
  }), [
    activeCall,
    queuedCalls,
    callPhase,
    isMicMuted,
    durationSeconds,
    error,
    getPermissionFor,
    initiateOutgoing,
    acceptIncoming,
    rejectIncoming,
    hangup,
    setMicMuted,
    requestPermission,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCallContext(): CallContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCallContext must be used inside <CallProvider>");
  }
  return ctx;
}
