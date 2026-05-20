/**
 * inbox-request-call-permission
 *
 * Envia un mensaje interactivo `call_permission_request` al paciente para
 * solicitar permission de llamada (requerido por Meta antes de iniciar
 * llamada business-initiated).
 *
 * NOTA: NO es un template tradicional. Es un mensaje interactivo del Calling API
 * (https://developers.facebook.com/docs/whatsapp/cloud-api/calling/user-call-permissions).
 *
 * POST /functions/v1/inbox-request-call-permission
 * Body: { conversationId: string, bodyText?: string }
 * Auth: Bearer <user JWT>
 *
 * Limites Meta produccion: 1 request/dia por user, 2 por semana.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

const META_GRAPH_VERSION = "v24.0";
const DEFAULT_BODY_TEXT =
  "¿Podemos llamarte por WhatsApp para coordinar mejor tu consulta? Pulsa el botón para permitirnos llamar.";

interface RequestBody {
  conversationId?: string;
  bodyText?: string;
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
    if (!parsed.conversationId) {
      return jsonResponse(400, { ok: false, error: "conversationId requerido" });
    }
    const bodyText = (parsed.bodyText?.trim() || DEFAULT_BODY_TEXT).slice(0, 1024);

    // SELECT conversation (RLS scopa a org del usuario)
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("id, organization_id, whatsapp_line_id, patient_phone")
      .eq("id", parsed.conversationId)
      .maybeSingle();

    if (convErr || !conversation) {
      return jsonResponse(404, { ok: false, error: "Conversacion no encontrada o sin acceso" });
    }

    // Resolver linea WhatsApp con sus creds Meta
    const { data: line, error: lineErr } = await supabase
      .from("whatsapp_lines")
      .select("id, meta_phone_number_id, meta_access_token, provider")
      .eq("id", conversation.whatsapp_line_id)
      .maybeSingle();

    if (lineErr || !line || line.provider !== "meta" ||
        !line.meta_phone_number_id || !line.meta_access_token) {
      return jsonResponse(400, { ok: false, error: "Linea Meta no configurada" });
    }

    // Normalizar phone paciente (Meta espera sin +)
    const waId = conversation.patient_phone.replace(/^\+/, "");

    // POST a Meta Graph API
    const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${line.meta_phone_number_id}/messages`;
    const metaBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: waId,
      type: "interactive",
      interactive: {
        type: "call_permission_request",
        action: { name: "call_permission_request" },
        body: { text: bodyText },
      },
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
      console.error("[inbox-request-call-permission] Meta error:", metaRes.status, metaData);
      return jsonResponse(502, {
        ok: false,
        error: metaData?.error?.message ?? "Meta API error",
        metaStatus: metaRes.status,
        metaError: metaData?.error,
      });
    }

    const wamid = metaData?.messages?.[0]?.id ?? null;

    // Persistir como mensaje outbound interactivo (no es voice_call, es interactive)
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { error: insErr } = await serviceClient.from("message_logs").insert({
      organization_id: conversation.organization_id,
      whatsapp_line_id: conversation.whatsapp_line_id,
      conversation_id: conversation.id,
      direction: "outbound",
      channel: "whatsapp",
      provider: "meta",
      source: "assistant",
      sent_by: user.id,
      message_type: "system",  // mensaje del sistema (no chat normal)
      from_phone: "",          // se resolveria del meta_phone_number_id pero no es critico
      to_phone: conversation.patient_phone,
      body: bodyText,
      provider_message_id: wamid,
      raw_payload: { sent: metaBody, response: metaData },
      status: "sent",
      billable: false,
    });

    if (insErr) {
      console.warn("[inbox-request-call-permission] persist failed:", insErr.message);
    }

    return jsonResponse(200, {
      ok: true,
      providerMessageId: wamid,
      message: "Solicitud de permission enviada al paciente",
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[inbox-request-call-permission] error:", msg);
    return jsonResponse(500, { ok: false, error: msg });
  }
});
