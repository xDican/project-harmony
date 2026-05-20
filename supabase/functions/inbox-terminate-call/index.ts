/**
 * inbox-terminate-call
 *
 * La asistente termina o rechaza una llamada activa (inbound o outbound).
 *
 * Usado para:
 *   - Rechazar llamada inbound (paciente esta llamando, asistente no quiere atender)
 *   - Colgar llamada en curso (despues de accept)
 *   - Cancelar llamada outbound que no llego a connect
 *
 * Meta acepta dos actions: terminate (cuelga) y reject (rechaza llamada ringing).
 * Ambas POST a /calls.
 *
 * POST /functions/v1/inbox-terminate-call
 * Body: { callIdMeta: string, action?: 'terminate' | 'reject' }
 *   - Si action no se especifica, infiere: 'reject' si call_status=ringing, 'terminate' si accepted/connected.
 * Auth: Bearer <user JWT>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

const META_GRAPH_VERSION = "v24.0";

interface RequestBody {
  callIdMeta?: string;
  action?: "terminate" | "reject";
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
    if (!parsed.callIdMeta) {
      return jsonResponse(400, { ok: false, error: "callIdMeta requerido" });
    }

    // Validar ownership y resolver line via RLS
    const { data: callRow, error: callErr } = await supabase
      .from("message_logs")
      .select("id, organization_id, whatsapp_line_id, call_status")
      .eq("call_id_meta", parsed.callIdMeta)
      .eq("message_type", "voice_call")
      .maybeSingle();

    if (callErr || !callRow) {
      return jsonResponse(404, { ok: false, error: "Llamada no encontrada o sin acceso" });
    }

    // Auto-inferir action si no viene explicito
    const action: "terminate" | "reject" = parsed.action
      ?? (callRow.call_status === "ringing" ? "reject" : "terminate");

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: line } = await serviceClient
      .from("whatsapp_lines")
      .select("meta_phone_number_id, meta_access_token")
      .eq("id", callRow.whatsapp_line_id)
      .maybeSingle();

    if (!line?.meta_phone_number_id || !line?.meta_access_token) {
      return jsonResponse(500, { ok: false, error: "Linea Meta no configurada" });
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${line.meta_phone_number_id}/calls`;
    const metaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${line.meta_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        call_id: parsed.callIdMeta,
        action,
      }),
    });
    const metaData = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      // Si Meta devuelve "call already terminated", tratarlo como exito.
      const errCode = metaData?.error?.code;
      if (errCode === 138001 /* call already terminated */) {
        console.log("[inbox-terminate-call] Meta says call already terminated, treating as ok");
      } else {
        console.error("[inbox-terminate-call] Meta error:", metaRes.status, metaData);
        return jsonResponse(502, {
          ok: false,
          error: metaData?.error?.message ?? "Meta /calls failed",
          metaStatus: metaRes.status,
        });
      }
    }

    // UPDATE optimista (terminate event tambien llegara via webhook y reescribira)
    const newStatus = action === "reject" ? "rejected" : "ended";
    await serviceClient
      .from("message_logs")
      .update({
        call_status: newStatus,
        call_ended_at: new Date().toISOString(),
        sent_by: callRow.call_status === "ringing" ? user.id : undefined,
      })
      .eq("id", callRow.id);

    return jsonResponse(200, { ok: true, action, callId: callRow.id });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[inbox-terminate-call] error:", msg);
    return jsonResponse(500, { ok: false, error: msg });
  }
});
