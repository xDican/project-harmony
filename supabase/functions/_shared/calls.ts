/**
 * Calls (Sprint 6) — Handlers para eventos del Meta Calling API.
 *
 * Meta envia 3 tipos de eventos en `value.calls[]` con field='calls':
 *   - connect:           llamada inicia (inbound USER_INITIATED o outbound BUSINESS_INITIATED)
 *   - terminate:         llamada termino (cualquier lado colgo o no hubo accept)
 *   - permission_update: respuesta del usuario a call_permission_request (accepted/rejected)
 *
 * Persistimos cada llamada como UNA fila en message_logs con message_type='voice_call'.
 * El call_id_meta une connect y terminate del mismo call para hacer UPDATE en vez de
 * crear nuevas filas.
 *
 * Permission events alimentan la tabla call_permissions (lifecycle per conversation).
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getOrCreateConversation, updateConversationOnInbound } from "./conversations.ts";

// ---------------------------------------------------------------------------
// Types (estructura confirmada con payload real del 20 May 2026)
// ---------------------------------------------------------------------------

export interface MetaCallEvent {
  id: string;                              // call_id Meta (e.g. "wacid.IhggMDB...")
  from: string;                            // wa_id paciente sin +
  to: string;                              // wa_id business sin +
  event: "connect" | "terminate" | "permission_update";
  direction: "USER_INITIATED" | "BUSINESS_INITIATED";
  timestamp: string;                       // unix seconds
  from_user_id?: string;
  status?: string;                         // solo en terminate: COMPLETED | REJECTED | FAILED | NO_ANSWER...
  session?: {
    sdp: string;                           // SDP completo con ICE embebido (vanilla ICE, no trickle)
    sdp_type: "offer" | "answer";
  };
  // permission_update (estructura tentativa — confirmar en QA outbound)
  response?: "accept" | "reject";
  expiration_timestamp?: string;
}

export interface MetaContact {
  wa_id: string;
  profile?: { name?: string };
  user_id?: string;
}

interface ProcessCallEventArgs {
  supabase: SupabaseClient;
  call: MetaCallEvent;
  contacts: MetaContact[] | undefined;
  organizationId: string;
  whatsappLineId: string;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/** Meta envia wa_id sin "+" (e.g. "50433899824"). Lo normalizamos a "+50433899824". */
function waIdToE164(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

// ---------------------------------------------------------------------------
// Patient resolution
// ---------------------------------------------------------------------------

async function findPatientByPhone(
  supabase: SupabaseClient,
  organizationId: string,
  phoneE164: string,
): Promise<{ id: string; name: string | null } | null> {
  // Busca por exact match o por ultimos 8 digitos (Honduras local format).
  const last8 = phoneE164.slice(-8);
  const { data } = await supabase
    .from("patients")
    .select("id, name, phone")
    .eq("organization_id", organizationId)
    .or(`phone.eq.${phoneE164},phone.like.%${last8}`)
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, name: data.name } : null;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * connect event — llamada inicia.
 * INSERT una nueva fila voice_call con status='ringing' y guarda el SDP offer.
 * El frontend (via Realtime) detecta el INSERT y dispara ringtone + overlay.
 */
async function handleConnect(args: ProcessCallEventArgs): Promise<void> {
  const { supabase, call, contacts, organizationId, whatsappLineId } = args;

  const patientPhoneE164 = waIdToE164(call.from);
  const businessPhoneE164 = waIdToE164(call.to);

  // Mete profile name de contacts si esta disponible
  const contact = contacts?.find((c) => c.wa_id === call.from);
  const patientName = contact?.profile?.name ?? null;

  // Resolve patient (puede ser null si nunca escribio)
  const patient = await findPatientByPhone(supabase, organizationId, patientPhoneE164);

  // getOrCreateConversation maneja race conditions
  const conv = await getOrCreateConversation(supabase, {
    whatsappLineId,
    organizationId,
    patientPhone: patientPhoneE164,
    patientId: patient?.id ?? null,
    patientName: patient?.name ?? patientName,
  });

  if (!conv) {
    throw new Error("handleConnect: getOrCreateConversation returned null");
  }

  const isInbound = call.direction === "USER_INITIATED";
  const callTimestampMs = Number(call.timestamp) * 1000;
  const callStartedAt = isNaN(callTimestampMs) ? new Date() : new Date(callTimestampMs);

  const { error: insErr } = await supabase.from("message_logs").insert({
    organization_id: organizationId,
    whatsapp_line_id: whatsappLineId,
    conversation_id: conv.id,
    patient_id: patient?.id ?? null,
    direction: isInbound ? "inbound" : "outbound",
    channel: "whatsapp",
    provider: "meta",
    source: isInbound ? "patient" : "assistant",
    message_type: "voice_call",
    call_id_meta: call.id,
    call_status: "ringing",
    call_direction: isInbound ? "inbound" : "outbound",
    call_started_at: callStartedAt.toISOString(),
    from_phone: isInbound ? patientPhoneE164 : businessPhoneE164,
    to_phone: isInbound ? businessPhoneE164 : patientPhoneE164,
    body: isInbound ? "Llamada entrante" : "Llamada saliente",
    raw_payload: call,
    status: "received",
    // Calls van a la organizacion (no a un doctor especifico) → bypass del CHECK
    // constraint message_logs_billable_requires_doctor.
    billable: false,
  });

  if (insErr) {
    throw new Error(`message_logs INSERT failed: ${insErr.message} (code=${(insErr as any).code ?? "?"} details=${(insErr as any).details ?? "-"})`);
  }

  // Inbound bumps unread + last_inbound_at (igual que mensaje normal)
  if (isInbound) {
    await updateConversationOnInbound(supabase, conv.id);
  }

  console.log("[calls] connect persisted. call_id:", call.id, "conv:", conv.id, "direction:", call.direction);
}

/**
 * terminate event — llamada termino.
 * UPDATE la fila existente por call_id_meta.
 * Si nunca llego accept de nuestro lado y status Meta != COMPLETED → missed.
 * Si status Meta == COMPLETED y previo era 'accepted'/'connected' → ended.
 * Si status Meta == REJECTED/FAILED/NO_ANSWER → mappear.
 */
async function handleTerminate(args: ProcessCallEventArgs): Promise<void> {
  const { supabase, call } = args;

  // Read current row para decidir el nuevo status
  const { data: existing, error: selErr } = await supabase
    .from("message_logs")
    .select("id, call_status")
    .eq("call_id_meta", call.id)
    .maybeSingle();

  if (selErr) {
    console.error("[calls] handleTerminate select failed:", selErr.message);
    return;
  }

  if (!existing) {
    console.warn("[calls] handleTerminate: no existing row for call_id:", call.id);
    return;
  }

  // Mapeo de Meta status → nuestro call_status
  let nextStatus: string;
  const metaStatus = (call.status ?? "").toUpperCase();

  if (existing.call_status === "ringing") {
    // Nunca atendimos. Es missed independiente del Meta status.
    nextStatus = "missed";
  } else if (metaStatus === "REJECTED") {
    nextStatus = "rejected";
  } else if (metaStatus === "FAILED" || metaStatus === "ERROR") {
    nextStatus = "failed";
  } else if (metaStatus === "NO_ANSWER") {
    nextStatus = "missed";
  } else {
    // COMPLETED u otros: si veniamos de accepted/connected, es ended.
    nextStatus = "ended";
  }

  const callTimestampMs = Number(call.timestamp) * 1000;
  const callEndedAt = isNaN(callTimestampMs) ? new Date() : new Date(callTimestampMs);

  // Calcular duracion si tenemos started_at
  const { data: rowFull } = await supabase
    .from("message_logs")
    .select("call_started_at")
    .eq("id", existing.id)
    .maybeSingle();

  let durationSeconds: number | null = null;
  if (rowFull?.call_started_at) {
    const startMs = new Date(rowFull.call_started_at).getTime();
    durationSeconds = Math.max(0, Math.round((callEndedAt.getTime() - startMs) / 1000));
  }

  const { error: updErr } = await supabase
    .from("message_logs")
    .update({
      call_status: nextStatus,
      call_ended_at: callEndedAt.toISOString(),
      call_duration_seconds: durationSeconds,
      // Append el terminate event al raw_payload (no overwrite del connect SDP).
      // Postgres jsonb concat con ||.
      raw_payload: { terminate: call, ...(rowFull as any)?.raw_payload },
    })
    .eq("id", existing.id);

  if (updErr) {
    console.error("[calls] handleTerminate update failed:", updErr.message);
    return;
  }

  console.log("[calls] terminate persisted. call_id:", call.id, "status:", nextStatus, "duration:", durationSeconds);
}

/**
 * permission_update event — paciente respondio a call_permission_request.
 * Si accept → INSERT call_permissions con status='granted' + expires_at.
 * Si reject → INSERT call_permissions con status='rejected'.
 *
 * NOTA: el shape exacto de este evento se verificara en QA outbound.
 * Asumimos: call.response in ('accept','reject') + call.expiration_timestamp.
 */
async function handlePermissionUpdate(args: ProcessCallEventArgs): Promise<void> {
  const { supabase, call, organizationId, whatsappLineId } = args;

  const patientPhoneE164 = waIdToE164(call.from);

  // Resolve conv (debe existir ya, paciente respondio a un mensaje nuestro)
  const conv = await getOrCreateConversation(supabase, {
    whatsappLineId,
    organizationId,
    patientPhone: patientPhoneE164,
  });

  if (!conv) {
    console.error("[calls] handlePermissionUpdate: no conversation");
    return;
  }

  const isAccept = call.response === "accept";
  const status = isAccept ? "granted" : "rejected";
  const expiresAtMs = call.expiration_timestamp ? Number(call.expiration_timestamp) * 1000 : null;
  const expiresAt = expiresAtMs && !isNaN(expiresAtMs) ? new Date(expiresAtMs).toISOString() : null;

  const { error: insErr } = await supabase.from("call_permissions").insert({
    organization_id: organizationId,
    conversation_id: conv.id,
    status,
    granted_at: isAccept ? new Date().toISOString() : null,
    expires_at: expiresAt,
    source: "call_permission_request",
    raw_event: call,
  });

  if (insErr) {
    console.error("[calls] handlePermissionUpdate insert failed:", insErr.message);
    return;
  }

  console.log("[calls] permission_update persisted. conv:", conv.id, "status:", status, "expires:", expiresAt);
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Dispatch un evento de calls. Se llama desde meta-webhook por cada item de value.calls[].
 * Errors no rompen el response 200 a Meta (que reintentaria innecesariamente).
 */
export async function processCallEvent(args: ProcessCallEventArgs): Promise<void> {
  try {
    switch (args.call.event) {
      case "connect":
        await handleConnect(args);
        break;
      case "terminate":
        await handleTerminate(args);
        break;
      case "permission_update":
        await handlePermissionUpdate(args);
        break;
      default:
        console.warn("[calls] unknown event type:", args.call.event, "call_id:", args.call.id);
    }
  } catch (err) {
    console.error("[calls] processCallEvent failed:", (err as Error).message, "call_id:", args.call.id);
  }
}
