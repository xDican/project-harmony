/**
 * mark-promotions-expired — Cron diario para gestionar ciclo de vida de promociones.
 *
 * Sprint 5 (Centro de Atencion — Promociones del mes).
 *
 * Tres transiciones automaticas:
 *   1. active → expired:  valid_to < today
 *   2. draft  → active:   valid_from <= today AND valid_to >= today
 *   3. draft  → expired:  valid_to < today (programada pero ya vencida sin activarse)
 *
 * Schedule sugerida (pg_cron): diario a las 6am hora servidor (UTC).
 *
 * Auth: x-internal-secret o Bearer service role key.
 *
 * POST /mark-promotions-expired
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    // Auth — acepta Bearer (anon o service_role) o x-internal-secret.
    // pg_cron usa anon key (patron del proyecto, ver jobs send-reminders).
    const internalSecret = req.headers.get("x-internal-secret") || "";
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
    const authHeader = req.headers.get("Authorization") || "";

    let isAuthenticated = false;
    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      isAuthenticated = true;
    }
    if (!isAuthenticated && authHeader.startsWith("Bearer ")) {
      isAuthenticated = true; // pg_cron pasa anon o service_role; ambos OK
    }

    if (!isAuthenticated) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().slice(0, 10);

    // Transicion 1: active → expired
    const { data: expiredActive, error: e1 } = await supabase
      .from("promotions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("valid_to", today)
      .select("id, organization_id, title");

    if (e1) {
      console.error("[mark-promotions-expired] active→expired failed:", e1.message);
      return jsonResponse(500, { ok: false, error: e1.message });
    }

    // Transicion 2: draft → active (programada para hoy y vigente)
    const { data: activatedDrafts, error: e2 } = await supabase
      .from("promotions")
      .update({ status: "active" })
      .eq("status", "draft")
      .lte("valid_from", today)
      .gte("valid_to", today)
      .select("id, organization_id, title");

    if (e2) {
      console.error("[mark-promotions-expired] draft→active failed:", e2.message);
      return jsonResponse(500, { ok: false, error: e2.message });
    }

    // Transicion 3: draft → expired (programada pero ya vencida)
    const { data: expiredDrafts, error: e3 } = await supabase
      .from("promotions")
      .update({ status: "expired" })
      .eq("status", "draft")
      .lt("valid_to", today)
      .select("id, organization_id, title");

    if (e3) {
      console.error("[mark-promotions-expired] draft→expired failed:", e3.message);
      return jsonResponse(500, { ok: false, error: e3.message });
    }

    const summary = {
      ok: true,
      date: today,
      active_to_expired: expiredActive?.length ?? 0,
      draft_to_active: activatedDrafts?.length ?? 0,
      draft_to_expired: expiredDrafts?.length ?? 0,
      details: {
        expired_active: expiredActive ?? [],
        activated_drafts: activatedDrafts ?? [],
        expired_drafts: expiredDrafts ?? [],
      },
    };

    console.log("[mark-promotions-expired]", JSON.stringify(summary));
    return jsonResponse(200, summary);
  } catch (e) {
    console.error("[mark-promotions-expired] exception:", e);
    return jsonResponse(500, {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    });
  }
});
