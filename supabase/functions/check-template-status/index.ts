/**
 * check-template-status — Poll Meta for PENDING template approval statuses.
 *
 * Queries template_mappings with meta_status='PENDING', groups by WABA,
 * fetches statuses from Meta in bulk, and updates the DB accordingly.
 *
 * Auth: service role key or internal secret.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { getTemplateStatuses } from "../_shared/meta-template-api.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth: service role key, internal secret, or valid JWT
    const internalSecret = req.headers.get("x-internal-secret") || "";
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
    const authHeader = req.headers.get("Authorization") || "";

    let isAuthenticated = false;

    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      isAuthenticated = true;
    }
    if (!isAuthenticated && authHeader === `Bearer ${supabaseServiceKey}`) {
      isAuthenticated = true;
    }
    if (!isAuthenticated && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
        if (user && !authError) isAuthenticated = true;
      } catch { /* invalid token */ }
    }

    if (!isAuthenticated) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    // 1) Get all PENDING template mappings joined with whatsapp_lines
    const { data: pendingMappings, error: fetchError } = await supabase
      .from("template_mappings")
      .select("id, template_name, logical_type, whatsapp_line_id, meta_status, meta_template_id")
      .eq("meta_status", "PENDING");

    if (fetchError) {
      console.error("[check-template-status] Error fetching pending mappings:", fetchError);
      return jsonResponse(500, { ok: false, error: "Error fetching pending mappings" });
    }

    if (!pendingMappings || pendingMappings.length === 0) {
      return jsonResponse(200, { ok: true, checked: 0, approved: 0, rejected: 0, still_pending: 0, message: "No pending templates" });
    }

    console.log("[check-template-status] Found", pendingMappings.length, "pending template mappings");

    // 2) Get unique whatsapp_line_ids to fetch WABA credentials
    const lineIds = [...new Set(pendingMappings.map((m) => m.whatsapp_line_id).filter(Boolean))];

    const { data: lines } = await supabase
      .from("whatsapp_lines")
      .select("id, meta_waba_id, meta_access_token")
      .in("id", lineIds);

    if (!lines || lines.length === 0) {
      return jsonResponse(200, { ok: true, checked: 0, approved: 0, rejected: 0, still_pending: 0, message: "No lines found for pending mappings" });
    }

    // Build lookup: lineId -> { wabaId, accessToken }
    const lineCredentials = new Map<string, { wabaId: string; accessToken: string }>();
    for (const line of lines) {
      if (line.meta_waba_id && line.meta_access_token) {
        lineCredentials.set(line.id, { wabaId: line.meta_waba_id, accessToken: line.meta_access_token });
      }
    }

    // 3) Group pending mappings by WABA for efficient API calls
    const wabaGroups = new Map<string, { accessToken: string; mappings: typeof pendingMappings }>();

    for (const mapping of pendingMappings) {
      const cred = lineCredentials.get(mapping.whatsapp_line_id!);
      if (!cred) continue;

      const existing = wabaGroups.get(cred.wabaId);
      if (existing) {
        existing.mappings.push(mapping);
      } else {
        wabaGroups.set(cred.wabaId, { accessToken: cred.accessToken, mappings: [mapping] });
      }
    }

    // 4) For each WABA, fetch all template statuses and match
    let approved = 0;
    let rejected = 0;
    let stillPending = 0;

    for (const [wabaId, group] of wabaGroups) {
      console.log("[check-template-status] Checking WABA:", wabaId, "with", group.mappings.length, "pending templates");

      const statuses = await getTemplateStatuses(wabaId, group.accessToken);
      const statusByName = new Map(statuses.map((s) => [s.name, s]));

      for (const mapping of group.mappings) {
        const metaTemplate = statusByName.get(mapping.template_name);

        if (!metaTemplate) {
          // Template not found in WABA — still pending or was deleted
          stillPending++;
          continue;
        }

        if (metaTemplate.status === "APPROVED") {
          const { error } = await supabase
            .from("template_mappings")
            .update({ meta_status: "APPROVED", is_active: true, meta_template_id: metaTemplate.id })
            .eq("id", mapping.id);

          if (error) {
            console.error("[check-template-status] Error updating mapping to APPROVED:", error);
          } else {
            approved++;
            console.log("[check-template-status] Template APPROVED:", mapping.template_name);
          }
        } else if (metaTemplate.status === "REJECTED") {
          const { error } = await supabase
            .from("template_mappings")
            .update({ meta_status: "REJECTED", is_active: false, meta_template_id: metaTemplate.id })
            .eq("id", mapping.id);

          if (error) {
            console.error("[check-template-status] Error updating mapping to REJECTED:", error);
          } else {
            rejected++;
            console.log("[check-template-status] Template REJECTED:", mapping.template_name);
          }
        } else {
          // Still PENDING or IN_REVIEW
          stillPending++;
        }
      }
    }

    const checked = approved + rejected + stillPending;
    console.log("[check-template-status] Done:", { checked, approved, rejected, still_pending: stillPending });

    return jsonResponse(200, {
      ok: true,
      checked,
      approved,
      rejected,
      still_pending: stillPending,
    });
  } catch (error) {
    console.error("[check-template-status] Unexpected error:", error);
    return jsonResponse(500, {
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
