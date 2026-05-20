/**
 * inbox-accept-call
 *
 * La asistente acepta una llamada inbound desde el browser.
 *
 * Flow:
 *   1. Browser ya recibio el SDP offer (via Realtime channel cuando llego call.connect)
 *   2. Browser arma RTCPeerConnection y genera su SDP answer
 *   3. Browser llama esta function pasando { callIdMeta, sdpAnswer }
 *   4. Function valida ownership via JWT + conversation_id en message_logs
 *   5. POST a Meta /calls con action='pre_accept' + SDP answer
 *   6. Esperar a que browser confirme WebRTC connected (TBD: 2do call con action='accept')
 *
 * SIMPLIFICACION MVP: hacemos pre_accept + accept en el mismo flow del backend.
 * Si Meta requiere wait entre ambos, ajustar despues. Doc dice: "wait until WebRTC
 * connected before accept", pero en muchas implementaciones funcionan secuenciales.
 *
 * POST /functions/v1/inbox-accept-call
 * Body: { callIdMeta: string, sdpAnswer: string, action?: 'pre_accept' | 'accept' }
 *   - Si action no se especifica, hace ambos.
 * Auth: Bearer <user JWT>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

const META_GRAPH_VERSION = "v24.0";

interface RequestBody {
  callIdMeta?: string;
  sdpAnswer?: string;
  action?: "pre_accept" | "accept" | "both";
}

async function metaCallAction(
  phoneNumberId: string,
  accessToken: string,
  callId: string,
  action: "pre_accept" | "accept",
  sdpAnswer: string,
): Promise<{ ok: boolean; status: number; json: any }> {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/calls`;
  const body = {
    messaging_product: "whatsapp",
    call_id: callId,
    action,
    session: { sdp_type: "answer", sdp: sdpAnswer },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
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
    if (!parsed.callIdMeta || !parsed.sdpAnswer) {
      return jsonResponse(400, { ok: false, error: "callIdMeta y sdpAnswer requeridos" });
    }

    const action = parsed.action ?? "both";

    // Buscar la fila voice_call con el call_id_meta — RLS verifica que la org del user
    // tiene esta llamada. Si no, 404.
    const { data: callRow, error: callErr } = await supabase
      .from("message_logs")
      .select("id, organization_id, whatsapp_line_id, conversation_id, call_status")
      .eq("call_id_meta", parsed.callIdMeta)
      .eq("message_type", "voice_call")
      .maybeSingle();

    if (callErr || !callRow) {
      return jsonResponse(404, { ok: false, error: "Llamada no encontrada o sin acceso" });
    }

    if (callRow.call_status !== "ringing") {
      return jsonResponse(409, {
        ok: false,
        error: `Llamada en estado ${callRow.call_status}, no se puede aceptar`,
      });
    }

    // Resolver line creds (service_role para bypass; ya validamos ownership arriba)
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: line, error: lineErr } = await serviceClient
      .from("whatsapp_lines")
      .select("meta_phone_number_id, meta_access_token, provider")
      .eq("id", callRow.whatsapp_line_id)
      .maybeSingle();

    if (lineErr || !line || line.provider !== "meta" ||
        !line.meta_phone_number_id || !line.meta_access_token) {
      return jsonResponse(500, { ok: false, error: "Linea Meta no configurada" });
    }

    // Ejecutar pre_accept y/o accept
    const responses: any[] = [];

    if (action === "pre_accept" || action === "both") {
      const r = await metaCallAction(
        line.meta_phone_number_id, line.meta_access_token,
        parsed.callIdMeta, "pre_accept", parsed.sdpAnswer,
      );
      responses.push({ action: "pre_accept", ...r });
      if (!r.ok) {
        return jsonResponse(502, {
          ok: false, step: "pre_accept",
          error: r.json?.error?.message ?? "Meta pre_accept failed",
          metaResponse: r.json,
        });
      }
    }

    if (action === "accept" || action === "both") {
      const r = await metaCallAction(
        line.meta_phone_number_id, line.meta_access_token,
        parsed.callIdMeta, "accept", parsed.sdpAnswer,
      );
      responses.push({ action: "accept", ...r });
      if (!r.ok) {
        return jsonResponse(502, {
          ok: false, step: "accept",
          error: r.json?.error?.message ?? "Meta accept failed",
          metaResponse: r.json,
        });
      }
    }

    // Actualizar row a accepted + atribuir a la asistente que atendio
    const { error: updErr } = await serviceClient
      .from("message_logs")
      .update({
        call_status: "accepted",
        sent_by: user.id,
        raw_payload: { ...((callRow as any).raw_payload ?? {}), accept: responses },
      })
      .eq("id", callRow.id);

    if (updErr) {
      console.warn("[inbox-accept-call] update failed:", updErr.message);
    }

    return jsonResponse(200, {
      ok: true,
      callId: callRow.id,
      callIdMeta: parsed.callIdMeta,
      message: "Llamada aceptada",
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[inbox-accept-call] error:", msg);
    return jsonResponse(500, { ok: false, error: msg });
  }
});
