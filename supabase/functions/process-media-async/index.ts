/**
 * process-media-async — Fire-and-forget media processing.
 *
 * Sprint 2 MVP Centro de Atencion.
 *
 * Llamada por meta-webhook despues de persistir un mensaje inbound con
 * media_url='meta-media:{id}'. Esta funcion:
 *   1. Resuelve el mediaId → URL temporal de Meta
 *   2. Descarga los bytes
 *   3. Sube a Supabase Storage bucket conversation-media
 *   4. Si es audio: transcribe via Whisper
 *   5. UPDATE message_logs SET media_url=<storage path>, transcription=<texto>
 *
 * Si cualquier paso falla, log y termina sin throw. El placeholder queda en BD
 * y el paciente puede reenviar. Sprint 2 no implementa retry.
 *
 * Auth: x-internal-secret header (llamada interna desde meta-webhook).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  resolveMetaMediaUrl,
  downloadMetaMediaBytes,
  uploadToStorage,
  parseMediaIdFromPlaceholder,
} from "../_shared/meta-media.ts";
import { transcribeAudio } from "../_shared/whisper.ts";

interface ProcessMediaBody {
  messageLogId?: string;
  mediaIdRaw?: string; // 'meta-media:1234567890'
  messageType?: "audio" | "image" | "document" | "voice_call";
  organizationId?: string;
  conversationId?: string;
  whatsappLineId?: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  // Auth: internal secret
  const internalSecret = req.headers.get("x-internal-secret") || "";
  const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  if (!expectedSecret || internalSecret !== expectedSecret) {
    return jsonResponse(401, { ok: false, error: "Unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { ok: false, error: "Server configuration error" });
  }

  let body: ProcessMediaBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON" });
  }

  const {
    messageLogId,
    mediaIdRaw,
    messageType,
    organizationId,
    conversationId,
    whatsappLineId,
  } = body;

  if (!messageLogId || !mediaIdRaw || !messageType || !organizationId || !conversationId || !whatsappLineId) {
    return jsonResponse(400, { ok: false, error: "Missing required fields" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("[process-media-async] start", { messageLogId, mediaIdRaw, messageType });

  // ---- Paso 1: parse mediaId ----
  const mediaId = parseMediaIdFromPlaceholder(mediaIdRaw);
  if (!mediaId) {
    console.error("[process-media-async] could not parse mediaId from:", mediaIdRaw);
    return jsonResponse(200, { ok: false, step: "parse" });
  }

  // ---- Paso 2: resolver accessToken y phoneNumberId de la linea ----
  const { data: line, error: lineErr } = await supabase
    .from("whatsapp_lines")
    .select("meta_access_token, meta_phone_number_id, provider")
    .eq("id", whatsappLineId)
    .maybeSingle();

  if (lineErr || !line) {
    console.error("[process-media-async] line lookup failed:", lineErr?.message);
    return jsonResponse(200, { ok: false, step: "line_lookup" });
  }
  if (line.provider !== "meta") {
    console.error("[process-media-async] line provider is not meta:", line.provider);
    return jsonResponse(200, { ok: false, step: "wrong_provider" });
  }
  if (!line.meta_access_token) {
    console.error("[process-media-async] no meta_access_token");
    return jsonResponse(200, { ok: false, step: "no_token" });
  }

  // ---- Paso 3: resolver URL temporal de Meta ----
  const resolved = await resolveMetaMediaUrl(mediaId, line.meta_access_token);
  if (!resolved) {
    return jsonResponse(200, { ok: false, step: "resolve" });
  }
  console.log("[process-media-async] resolved url, mime:", resolved.mimeType, "size:", resolved.fileSize);

  // ---- Paso 4: descargar bytes ----
  const bytes = await downloadMetaMediaBytes(resolved.url, line.meta_access_token);
  if (!bytes) {
    return jsonResponse(200, { ok: false, step: "download" });
  }
  console.log("[process-media-async] downloaded bytes:", bytes.length);

  // ---- Paso 5: subir a Storage ----
  const uploaded = await uploadToStorage(supabase, {
    bytes,
    mime: resolved.mimeType,
    orgId: organizationId,
    convId: conversationId,
    messageLogId,
  });

  if (!uploaded) {
    return jsonResponse(200, { ok: false, step: "storage_upload" });
  }
  console.log("[process-media-async] uploaded to storage:", uploaded.path);

  // ---- Paso 6: transcribir si es audio ----
  let transcription: string | null = null;
  if (messageType === "audio" && openaiKey) {
    const result = await transcribeAudio(bytes, resolved.mimeType, openaiKey);
    if (result) {
      transcription = result.text;
      console.log("[process-media-async] transcribed:", transcription.length, "chars");
    } else {
      console.warn("[process-media-async] transcription returned null");
    }
  } else if (messageType === "audio" && !openaiKey) {
    console.warn("[process-media-async] audio received but no OPENAI_API_KEY configured");
  }

  // ---- Paso 7: UPDATE message_logs ----
  const updatePayload: Record<string, unknown> = {
    media_url: uploaded.path, // path en bucket; frontend genera signed URL
    media_mime: resolved.mimeType,
  };
  if (transcription !== null) {
    updatePayload.transcription = transcription;
  }

  const { error: updErr } = await supabase
    .from("message_logs")
    .update(updatePayload)
    .eq("id", messageLogId);

  if (updErr) {
    console.error("[process-media-async] message_logs update failed:", updErr.message);
    return jsonResponse(200, { ok: false, step: "db_update" });
  }

  console.log("[process-media-async] success", {
    messageLogId,
    storagePath: uploaded.path,
    transcribed: transcription !== null,
  });

  // Sprint 2 extension (insight Diego 18 May PM, filosofia bot-maximo-control):
  // Si es audio bot_active con transcripcion, invocar bot-handler con la transcripcion
  // como messageText. El bot procesa y responde al paciente automaticamente.
  // Asi el bot maneja audios sin intervencion humana.
  if (messageType === "audio" && transcription) {
    await invokeBotForTranscribedAudio(supabase, {
      conversationId,
      transcription,
      supabaseUrl,
      serviceKey,
    });
  }

  return jsonResponse(200, {
    ok: true,
    storagePath: uploaded.path,
    transcribed: transcription !== null,
  });
});

/**
 * Tras transcribir un audio, si la conversation esta en bot_active, invoca el bot-handler
 * con la transcripcion como messageText y envia la respuesta del bot al paciente via gateway.
 * Si la conversation esta en human_active, no hace nada (la asistente lee la transcripcion).
 */
async function invokeBotForTranscribedAudio(
  supabase: ReturnType<typeof createClient>,
  args: {
    conversationId: string;
    transcription: string;
    supabaseUrl: string;
    serviceKey: string;
  },
): Promise<void> {
  // Cargar contexto de la conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("status, patient_phone, organization_id, whatsapp_line_id, patient_id")
    .eq("id", args.conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    console.error("[process-media-async] conversation lookup failed for bot reply:", convErr?.message);
    return;
  }

  if (conv.status !== "bot_active") {
    console.log("[process-media-async] skipping bot reply, conv status:", conv.status);
    return;
  }

  const { data: wline } = await supabase
    .from("whatsapp_lines")
    .select("bot_enabled")
    .eq("id", conv.whatsapp_line_id)
    .maybeSingle();

  if (!wline?.bot_enabled) {
    console.log("[process-media-async] skipping bot reply, bot disabled for line:", conv.whatsapp_line_id);
    return;
  }

  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const projectRef = new URL(args.supabaseUrl).hostname.split(".")[0];
  const botHandlerUrl = `https://${projectRef}.supabase.co/functions/v1/bot-handler`;
  const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

  try {
    // 1) Bot procesa la transcripcion como si fuera texto del paciente
    const botRes = await fetch(botHandlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        whatsappLineId: conv.whatsapp_line_id,
        patientPhone: conv.patient_phone,
        messageText: args.transcription,
        organizationId: conv.organization_id,
      }),
    });

    if (!botRes.ok) {
      const errText = await botRes.text().catch(() => "");
      console.error("[process-media-async] bot-handler error:", botRes.status, errText);
      return;
    }

    const botData = await botRes.json();
    if (!botData.message) {
      console.log("[process-media-async] bot returned no message");
      return;
    }

    // 2) Formatear respuesta (mismo patron que routeToBotHandler en meta-webhook)
    let fullMessage: string = botData.message;
    if (Array.isArray(botData.options) && botData.options.length > 0) {
      const optLines = (botData.options as string[])
        .map((opt: string, i: number) => `${i + 1}. ${opt}`)
        .join("\n");
      fullMessage = `${fullMessage}\n\n${optLines}`;
    }

    // 3) Enviar respuesta via gateway con conversation_id + source='bot'
    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.serviceKey}`,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        to: conv.patient_phone,
        body: fullMessage,
        type: "generic",
        organizationId: conv.organization_id,
        ...(conv.patient_id ? { patientId: conv.patient_id } : {}),
        conversationId: args.conversationId,
        source: "bot",
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text().catch(() => "");
      console.error("[process-media-async] gateway error:", gwRes.status, errText);
      return;
    }

    console.log("[process-media-async] bot replied to audio", {
      conversationId: args.conversationId,
      transcriptionPreview: args.transcription.slice(0, 60),
      botResponsePreview: fullMessage.slice(0, 60),
    });
  } catch (e) {
    console.error("[process-media-async] bot reply unexpected error:", e);
  }
}
