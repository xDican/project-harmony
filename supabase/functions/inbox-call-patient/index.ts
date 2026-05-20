/**
 * inbox-call-patient
 *
 * La asistente inicia una llamada outbound (business-initiated) al paciente.
 *
 * Pre-requisitos (validados aqui):
 *   - Existe call_permissions row con status='granted' y expires_at > now()
 *     para esta conversation. Sin eso, retorna 403 sugiriendo enviar
 *     call_permission_request primero.
 *
 * Flow:
 *   1. Browser arma RTCPeerConnection + media (mic) + SDP offer
 *   2. Browser POST a esta function: { conversationId, sdpOffer }
 *   3. Validamos permission vigente
 *   4. POST a Meta /calls action='initiate' con SDP offer
 *   5. Meta responde con call_id (no incluye SDP answer en la response inicial;
 *      el answer llega via webhook event 'connect' direction=BUSINESS_INITIATED)
 *   6. INSERT voice_call outbound row con status='ringing'
 *   7. Browser espera evento Realtime con SDP answer y hace setRemoteDescription
 *
 * POST /functions/v1/inbox-call-patient
 * Body: { conversationId: string, sdpOffer: string }
 * Auth: Bearer <user JWT>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

const META_GRAPH_VERSION = "v24.0";

interface RequestBody {
  conversationId?: string;
  sdpOffer?: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }
    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return jsonResponse(401, { ok: false, error: "Invalid token" });
    }

    const parsed = (await req.json().catch(() => ({}))) as RequestBody;
    if (!parsed.conversationId || !parsed.sdpOffer) {
      return jsonResponse(400, { ok: false, error: "conversationId y sdpOffer requeridos" });
    }

    // SELECT conversation (RLS scopa)
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, organization_id, whatsapp_line_id, patient_phone")
      .eq("id", parsed.conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return jsonResponse(404, { ok: false, error: "Conversacion no encontrada o sin acceso" });
    }

    // Verificar permission vigente
    const { data: perm } = await supabase
      .from("call_permissions")
      .select("status, expires_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const hasPermission =
      perm?.status === "granted" &&
      perm.expires_at &&
      perm.expires_at > nowIso;

    if (!hasPermission) {
      return jsonResponse(403, {
        ok: false,
        error: "Sin permiso vigente del paciente. Envia call_permission_request primero.",
        permissionStatus: perm?.status ?? "none",
        permissionExpiresAt: perm?.expires_at ?? null,
      });
    }

    // Resolver line creds
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: line, error: lineErr } = await serviceClient
      .from("whatsapp_lines")
      .select("meta_phone_number_id, meta_access_token, provider")
      .eq("id", conv.whatsapp_line_id)
      .maybeSingle();

    if (lineErr || !line || line.provider !== "meta" ||
        !line.meta_phone_number_id || !line.meta_access_token) {
      return jsonResponse(500, { ok: false, error: "Linea Meta no configurada" });
    }

    // POST /calls action=initiate
    const waId = conv.patient_phone.replace(/^\+/, "");
    const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${line.meta_phone_number_id}/calls`;
    const metaBody = {
      messaging_product: "whatsapp",
      to: waId,
      action: "connect",  // accion para outbound BIC
      session: { sdp_type: "offer", sdp: parsed.sdpOffer },
    };

    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${line.meta_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaBody),
    });
    const metaData = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      console.error("[inbox-call-patient] Meta /calls failed:", metaRes.status, metaData);
      return jsonResponse(502, {
        ok: false,
        error: metaData?.error?.message ?? "Meta /calls failed",
        metaError: metaData?.error,
        metaStatus: metaRes.status,
      });
    }

    // Meta responde con call_id. SDP answer (si viene) tambien podria estar aqui;
    // si no, llega via webhook event 'connect' direction=BUSINESS_INITIATED.
    const callIdMeta = metaData?.messages?.[0]?.id ?? metaData?.call_id ?? null;
    const sdpAnswerInline = metaData?.session?.sdp ?? null;

    // INSERT voice_call outbound row
    const startedAt = new Date().toISOString();
    const { data: inserted, error: insErr } = await serviceClient
      .from("message_logs")
      .insert({
        organization_id: conv.organization_id,
        whatsapp_line_id: conv.whatsapp_line_id,
        conversation_id: conv.id,
        direction: "outbound",
        channel: "whatsapp",
        provider: "meta",
        source: "assistant",
        sent_by: user.id,
        message_type: "voice_call",
        call_id_meta: callIdMeta,
        call_status: "ringing",
        call_direction: "outbound",
        call_started_at: startedAt,
        from_phone: "",
        to_phone: conv.patient_phone,
        body: "Llamada saliente",
        raw_payload: { sent: metaBody, response: metaData },
        status: "sent",
        billable: false,
      })
      .select("id")
      .single();

    if (insErr) {
      console.warn("[inbox-call-patient] persist failed:", insErr.message);
    }

    return jsonResponse(200, {
      ok: true,
      callId: inserted?.id ?? null,
      callIdMeta,
      sdpAnswer: sdpAnswerInline,  // si viene inline, browser ya puede setRemoteDescription
      message: sdpAnswerInline
        ? "Llamada iniciada"
        : "Llamada iniciada — esperando SDP answer via webhook",
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[inbox-call-patient] error:", msg);
    return jsonResponse(500, { ok: false, error: msg });
  }
});
