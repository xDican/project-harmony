/**
 * inbox-handoff — la asistente toma manualmente una conversacion.
 *
 * Sprint 1 Fase 3 del MVP Centro de Atencion. La asistente presiona "Tomar"
 * en el inbox. El bot deja de responder a partir del proximo inbound del
 * paciente (meta-webhook chequea status='human_active').
 *
 * POST /functions/v1/inbox-handoff
 * Body: { conversationId: string }
 * Auth: Bearer <user JWT>
 * Response: { ok: true, conversation: { id, status, assigned_to } }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
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
      console.error("[inbox-handoff] getUser failed:", authErr?.message);
      return jsonResponse(401, { ok: false, error: "Invalid token" });
    }

    let conversationId: string;
    try {
      const body = await req.json();
      conversationId = body.conversationId;
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    if (!conversationId || typeof conversationId !== "string") {
      return jsonResponse(400, { ok: false, error: "conversationId requerido" });
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({ status: "human_active", assigned_to: user.id })
      .eq("id", conversationId)
      .select("id, status, assigned_to, patient_phone")
      .single();

    if (error || !data) {
      return jsonResponse(404, { ok: false, error: "Conversacion no encontrada o sin acceso" });
    }

    console.log("[inbox-handoff] user", user.id, "took conv", conversationId, "patient:", data.patient_phone);
    return jsonResponse(200, { ok: true, conversation: data });
  } catch (e) {
    console.error("[inbox-handoff] Unexpected error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return jsonResponse(500, { ok: false, error: msg });
  }
});
