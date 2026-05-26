/**
 * inbox-return-bot — devuelve la conversacion al bot.
 *
 * Sprint 1 Fase 3 del MVP Centro de Atencion. Cuando una asistente humana
 * decide que ya no necesita atender personalmente (la conversacion volvio
 * a ser de rutina), llama este endpoint para que el bot retome.
 *
 * POST /functions/v1/inbox-return-bot
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

    // Cliente con JWT del usuario — RLS scopa a sus orgs
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      console.error("[inbox-return-bot] getUser failed:", authErr?.message);
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

    // Verificar que el bot esta habilitado en la linea antes de devolver
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, whatsapp_line_id, whatsapp_lines!inner(bot_enabled)")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return jsonResponse(404, { ok: false, error: "Conversacion no encontrada o sin acceso" });
    }

    const botEnabled = (conv as Record<string, unknown>).whatsapp_lines as { bot_enabled: boolean } | null;
    if (!botEnabled?.bot_enabled) {
      return jsonResponse(400, { ok: false, error: "Bot desactivado para esta línea" });
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({ status: "bot_active", assigned_to: null })
      .eq("id", conversationId)
      .select("id, status, assigned_to")
      .single();

    if (error || !data) {
      return jsonResponse(404, { ok: false, error: "No se pudo actualizar la conversacion" });
    }

    console.log("[inbox-return-bot] user", user.id, "returned conv", conversationId, "to bot");
    return jsonResponse(200, { ok: true, conversation: data });
  } catch (e) {
    console.error("[inbox-return-bot] Unexpected error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return jsonResponse(500, { ok: false, error: msg });
  }
});
