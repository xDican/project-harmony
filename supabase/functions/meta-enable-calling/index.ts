/**
 * meta-enable-calling
 *
 * One-shot activation of WhatsApp Calling API for a given whatsapp_lines row.
 * Reusable: invocar para cada nueva org que onboardee, o manualmente para
 * activar Calling en una linea existente (Sprint 6 launch).
 *
 * Hace 3 cosas:
 *   1) POST /{phone_number_id}/settings con {"calling":{"status":"ENABLED"}}
 *   2) Verifica suscripcion del webhook al campo "calls" via /{waba_id}/subscribed_apps
 *      (lo agrega si no esta, para que los eventos calls.connect/terminate lleguen).
 *   3) GET /{phone_number_id}/settings para retornar el estado final.
 *
 * Input: { lineId: string }
 * Auth: requiere JWT autenticado. RLS check via service-role read despues.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const META_GRAPH_VERSION = "v24.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

interface EnableCallingInput {
  lineId: string;
}

interface MetaSettingsResponse {
  success?: boolean;
  calling?: {
    status?: string;
    [k: string]: unknown;
  };
  error?: { message: string; code: number; type?: string };
  [k: string]: unknown;
}

interface SubscribedAppsResponse {
  data?: Array<{
    whatsapp_business_api_data?: {
      id?: string;
      name?: string;
      link?: string;
    };
    override_callback_uri?: string;
    subscribed_fields?: string[];
  }>;
  error?: { message: string; code: number };
}

async function metaPost(
  url: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function metaGet(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[meta-enable-calling] Missing Supabase env vars");
      return jsonResponse(500, { ok: false, error: "Server misconfigured" });
    }

    // Auth: aceptar 2 modos
    //   - service_role key (admin/internal, Claude desde MCP o scripts ops)
    //   - user JWT (asistente desde UI; valida getUser)
    // Este endpoint es admin-only — modifica Meta Cloud config de un WABA.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { ok: false, error: "Missing auth" });
    }
    const token = authHeader.slice("Bearer ".length);
    const isServiceRole = token === serviceKey;

    if (!isServiceRole) {
      const supabaseUser = createClient(supabaseUrl, serviceKey);
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
      if (userErr || !userData?.user) {
        console.error("[meta-enable-calling] Invalid JWT:", userErr?.message);
        return jsonResponse(401, { ok: false, error: "Invalid auth" });
      }
      console.log("[meta-enable-calling] Authenticated as user:", userData.user.id);
    } else {
      console.log("[meta-enable-calling] Authenticated as service_role (admin)");
    }

    const body = (await req.json().catch(() => ({}))) as Partial<EnableCallingInput>;
    if (!body.lineId || typeof body.lineId !== "string") {
      return jsonResponse(400, { ok: false, error: "lineId required" });
    }

    // Cliente con service_role para leer la linea (bypass RLS - admin-only endpoint).
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: line, error: lineErr } = await supabaseAdmin
      .from("whatsapp_lines")
      .select("id, organization_id, provider, meta_phone_number_id, meta_waba_id, meta_access_token, is_active")
      .eq("id", body.lineId)
      .maybeSingle();

    if (lineErr || !line) {
      console.error("[meta-enable-calling] Line not found:", lineErr?.message);
      return jsonResponse(404, { ok: false, error: "Line not found" });
    }

    if (line.provider !== "meta") {
      return jsonResponse(400, { ok: false, error: `Line provider is ${line.provider}, not meta` });
    }
    if (!line.meta_phone_number_id || !line.meta_waba_id || !line.meta_access_token) {
      return jsonResponse(400, { ok: false, error: "Line missing meta credentials" });
    }

    const phoneId = line.meta_phone_number_id;
    const wabaId = line.meta_waba_id;
    const metaToken = line.meta_access_token;

    // ---- 1) Enable calling on phone number ----
    console.log("[meta-enable-calling] Enabling calling for phone_number_id:", phoneId);
    const enableUrl = `${META_GRAPH_BASE}/${phoneId}/settings`;
    const enableRes = await metaPost(enableUrl, metaToken, { calling: { status: "ENABLED" } });
    const enableData = enableRes.json as MetaSettingsResponse;

    if (!enableRes.ok) {
      console.error("[meta-enable-calling] Enable failed:", enableRes.status, enableData);
      return jsonResponse(502, {
        ok: false,
        step: "enable_calling",
        error: enableData?.error?.message ?? "Meta API error",
        details: enableData,
        httpStatus: enableRes.status,
      });
    }

    // ---- 2) Verify webhook subscription includes "calls" field ----
    // GET /{waba_id}/subscribed_apps lista las apps suscritas y sus campos.
    console.log("[meta-enable-calling] Checking webhook subscription for waba:", wabaId);
    const subsUrl = `${META_GRAPH_BASE}/${wabaId}/subscribed_apps`;
    const subsRes = await metaGet(subsUrl, metaToken);
    const subsData = subsRes.json as SubscribedAppsResponse;

    let subscribedToCalls = false;
    let subscribedFields: string[] = [];

    if (subsRes.ok && Array.isArray(subsData.data)) {
      // Tomamos la primera app suscrita (en un WABA normalmente hay solo una).
      const app = subsData.data[0];
      subscribedFields = app?.subscribed_fields ?? [];
      subscribedToCalls = subscribedFields.includes("calls");
    } else {
      console.warn("[meta-enable-calling] Could not read subscribed_apps:", subsRes.status, subsData);
    }

    // ---- 3) Re-subscribe if "calls" not in fields ----
    // Nota: POST /{waba_id}/subscribed_apps NO acepta lista de campos. Los campos se
    // configuran a nivel APP (no WABA) en App Dashboard → Webhooks → WhatsApp
    // Business Account → "Subscribe to fields". El re-POST aqui solo re-asocia
    // la app al WABA. Si "calls" no esta en la app config, este endpoint no lo agrega.
    if (!subscribedToCalls) {
      console.warn("[meta-enable-calling] Webhook NOT subscribed to 'calls' field. Posting subscribe re-link anyway.");
      const reSubRes = await metaPost(subsUrl, metaToken, {});
      if (!reSubRes.ok) {
        console.error("[meta-enable-calling] Re-subscribe failed:", reSubRes.status, reSubRes.json);
      }
    }

    // ---- 4) Final verification: GET settings ----
    const verifyRes = await metaGet(enableUrl, metaToken);
    const verifyData = verifyRes.json as MetaSettingsResponse;
    const finalStatus = verifyData?.calling?.status ?? "UNKNOWN";

    console.log("[meta-enable-calling] Done. Status:", finalStatus, "Calls field subscribed:", subscribedToCalls);

    return jsonResponse(200, {
      ok: true,
      lineId: line.id,
      phoneNumberId: phoneId,
      wabaId,
      callingStatus: finalStatus,
      webhookSubscribedToCalls: subscribedToCalls,
      subscribedFields,
      warning: subscribedToCalls
        ? null
        : "Webhook may not be subscribed to 'calls' field. Verify manually in Meta App Dashboard → Webhooks → WhatsApp Business Account → calls",
      enableResponse: enableData,
      verifyResponse: verifyData,
    });
  } catch (err) {
    const e = err as Error;
    console.error("[meta-enable-calling] Unexpected error:", e.message, e.stack);
    return jsonResponse(500, { ok: false, error: e.message });
  }
});
