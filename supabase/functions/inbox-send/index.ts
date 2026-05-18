/**
 * inbox-send — la asistente envia un mensaje desde el inbox de OrionCare.
 *
 * Sprint 1 Fase 3 del MVP Centro de Atencion.
 *
 * Flow:
 *   1. Auth con JWT del usuario (asistente logueada)
 *   2. SELECT conversation — RLS valida que pertenece a una org del user
 *   3. Auto-handoff: si conversation.status='bot_active', cambia a 'human_active'
 *      (intuicion: si la asistente respondio, ya tomo)
 *   4. Llama messaging-gateway con source='assistant', sentBy=user.id, conversationId
 *      → gateway escribe message_logs CON conversation_id y refresca conversation
 *   5. Marca unread_count=0 (ella ya leyo)
 *
 * POST /functions/v1/inbox-send
 * Body: {
 *   conversationId: string,
 *   body?: string,
 *   mediaUrl?: string,
 *   messageType?: "text" | "image" | "audio" | "document"
 * }
 * Auth: Bearer <user JWT>
 * Response: { ok, messageId?, providerMessageId?, conversation }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { downloadFromStorage, uploadMetaMedia } from "../_shared/meta-media.ts";

interface SendRequestBody {
  conversationId?: string;
  body?: string;
  /**
   * Path en bucket `conversation-media`. El frontend sube primero el archivo
   * via supabase.storage.from('conversation-media').upload(...) y pasa el path
   * resultante. inbox-send descarga, sube a Meta, obtiene mediaId, y persiste.
   */
  mediaUrl?: string;
  messageType?: "text" | "image" | "audio" | "document";
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
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    // Cliente con JWT del usuario — RLS scopa a sus orgs
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return jsonResponse(401, { ok: false, error: "Invalid token" });
    }

    let parsed: SendRequestBody;
    try {
      parsed = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const conversationId = parsed.conversationId;
    const messageBody = parsed.body?.trim();
    const mediaUrl = parsed.mediaUrl?.trim();
    const messageType = parsed.messageType ?? "text";

    if (!conversationId || typeof conversationId !== "string") {
      return jsonResponse(400, { ok: false, error: "conversationId requerido" });
    }

    if (!messageBody && !mediaUrl) {
      return jsonResponse(400, { ok: false, error: "body o mediaUrl requerido" });
    }

    if (messageType === "text" && !messageBody) {
      return jsonResponse(400, { ok: false, error: "messageType=text requiere body" });
    }

    if (messageType !== "text" && !mediaUrl) {
      return jsonResponse(400, { ok: false, error: `messageType=${messageType} requiere mediaUrl` });
    }

    // SELECT conversation — RLS asegura ownership; si no es de su org → 404
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("id, organization_id, whatsapp_line_id, patient_phone, status")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conversation) {
      return jsonResponse(404, { ok: false, error: "Conversacion no encontrada o sin acceso" });
    }

    // Resolver phone_number de la linea (cliente con JWT del user; RLS de whatsapp_lines
    // permite read a miembros de la org)
    const { data: line, error: lineErr } = await supabase
      .from("whatsapp_lines")
      .select("id, phone_number, organization_id, meta_phone_number_id, meta_access_token, provider")
      .eq("id", conversation.whatsapp_line_id)
      .maybeSingle();

    if (lineErr || !line) {
      console.error("[inbox-send] cannot resolve whatsapp_line", conversation.whatsapp_line_id, lineErr);
      return jsonResponse(500, { ok: false, error: "No se pudo resolver la linea WhatsApp" });
    }

    // Sprint 2: si messageType es multimedia, preparar upload a Meta
    let preparedMediaId: string | null = null;
    let preparedMediaMime: string | null = null;
    let preparedMediaPath: string | null = null;

    if (messageType !== "text" && mediaUrl) {
      // Validar que apunte a conversation-media (path comienza con organizationId del conversation)
      if (!mediaUrl.startsWith(`${conversation.organization_id}/`)) {
        return jsonResponse(400, { ok: false, error: "mediaUrl debe estar en conversation-media de tu org" });
      }
      if (line.provider !== "meta" || !line.meta_phone_number_id || !line.meta_access_token) {
        return jsonResponse(400, { ok: false, error: "Outbound multimedia solo soportado con Meta Cloud API" });
      }

      // Cliente service_role para Storage download (bypasa RLS) y Meta upload
      const serviceClient = createClient(supabaseUrl, serviceKey);
      const downloaded = await downloadFromStorage(serviceClient, mediaUrl);
      if (!downloaded) {
        return jsonResponse(404, { ok: false, error: "Archivo no encontrado en Storage" });
      }

      const uploaded = await uploadMetaMedia(
        downloaded.bytes,
        downloaded.mime,
        line.meta_phone_number_id,
        line.meta_access_token,
      );
      if (!uploaded) {
        return jsonResponse(502, { ok: false, error: "Error subiendo archivo a Meta" });
      }

      preparedMediaId = uploaded.mediaId;
      preparedMediaMime = downloaded.mime;
      preparedMediaPath = mediaUrl;
      console.log("[inbox-send] media uploaded to Meta:", { mediaId: preparedMediaId, mime: preparedMediaMime });
    }

    // Auto-handoff si la asistente esta respondiendo en una conv bot_active
    if (conversation.status === "bot_active") {
      const { error: handoffErr } = await supabase
        .from("conversations")
        .update({ status: "human_active", assigned_to: user.id })
        .eq("id", conversationId);
      if (handoffErr) {
        console.warn("[inbox-send] auto-handoff failed:", handoffErr.message);
      } else {
        console.log("[inbox-send] auto-handoff conv", conversationId, "to user", user.id);
      }
    }

    // Llamar messaging-gateway con campos del inbox
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

    const gatewayBody: Record<string, unknown> = {
      to: conversation.patient_phone,
      body: messageBody ?? "",
      type: "generic",
      organizationId: conversation.organization_id,
      conversationId,
      source: "assistant",
      sentBy: user.id,
      messageType,
    };

    // Sprint 2: si tenemos mediaId precargado en Meta, agregar al gateway body
    if (preparedMediaId && messageType !== "text") {
      gatewayBody.mediaId = preparedMediaId;
      gatewayBody.mediaKind = messageType; // image|audio|document — coincide con MetaProvider kind
      gatewayBody.mediaUrl = preparedMediaPath; // path Storage para persistir
      gatewayBody.mediaMime = preparedMediaMime;
    }

    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
        apikey: anonKey,
      },
      body: JSON.stringify(gatewayBody),
    });

    const gwData = await gwRes.json().catch(() => ({}));

    if (!gwRes.ok) {
      console.error("[inbox-send] messaging-gateway error:", gwRes.status, gwData);
      return jsonResponse(502, {
        ok: false,
        error: "Error enviando mensaje via gateway",
        details: gwData,
      });
    }

    // Marcar conversation como leida (asistente ya respondio)
    const { error: readErr } = await supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);

    if (readErr) {
      console.warn("[inbox-send] could not mark conv read:", readErr.message);
    }

    return jsonResponse(200, {
      ok: true,
      providerMessageId: gwData.providerMessageId ?? null,
      status: gwData.status ?? "sent",
      conversation: {
        id: conversation.id,
        status: conversation.status === "bot_active" ? "human_active" : conversation.status,
      },
    });
  } catch (e) {
    console.error("[inbox-send] Unexpected error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return jsonResponse(500, { ok: false, error: msg });
  }
});
