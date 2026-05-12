/**
 * recreate-templates — Delete and recreate all WhatsApp templates for a line.
 *
 * Fixes corrupted templates (e.g. broken emojis from Windows curl) by:
 * 1. Deleting existing templates from Meta and template_mappings
 * 2. Recreating all canonical templates with proper UTF-8 emojis
 *
 * Auth: service role key (Bearer) or x-internal-secret.
 *
 * POST /recreate-templates
 * Body: { whatsapp_line_id: "uuid" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createTemplateInWaba, deleteTemplateInWaba } from "../_shared/meta-template-api.ts";
import { CANONICAL_TEMPLATES, generateTemplateName } from "../_shared/canonical-templates.ts";

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

    // Auth: service role key or internal secret
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

    if (!isAuthenticated) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const whatsappLineId = body.whatsapp_line_id;
    // Optional: only recreate specific logical types (e.g. ["reminder_24h"])
    const filterTypes: string[] | null = Array.isArray(body.logical_types) ? body.logical_types : null;

    if (!whatsappLineId) {
      return jsonResponse(400, { ok: false, error: "Missing whatsapp_line_id" });
    }

    // 1) Get line credentials
    const { data: line, error: lineError } = await supabase
      .from("whatsapp_lines")
      .select("id, meta_waba_id, meta_access_token")
      .eq("id", whatsappLineId)
      .single();

    if (lineError || !line) {
      return jsonResponse(404, { ok: false, error: "WhatsApp line not found" });
    }

    if (!line.meta_waba_id || !line.meta_access_token) {
      return jsonResponse(400, { ok: false, error: "Line missing Meta credentials (meta_waba_id or meta_access_token)" });
    }

    const { meta_waba_id: wabaId, meta_access_token: accessToken } = line;

    console.log("[recreate-templates] Starting for line:", whatsappLineId, "WABA:", wabaId, filterTypes ? `filter: ${filterTypes.join(",")}` : "all templates");

    // Determine which canonical templates to process
    const templatesToProcess = filterTypes
      ? CANONICAL_TEMPLATES.filter((t) => filterTypes.includes(t.logical_type))
      : CANONICAL_TEMPLATES;

    if (templatesToProcess.length === 0) {
      return jsonResponse(400, { ok: false, error: `No canonical templates match logical_types: ${filterTypes?.join(",")}` });
    }

    const logicalTypesSet = new Set(templatesToProcess.map((t) => t.logical_type));

    // 2) Get existing template mappings (only for types being processed)
    const { data: existingMappings } = await supabase
      .from("template_mappings")
      .select("id, template_name, logical_type")
      .eq("whatsapp_line_id", whatsappLineId);

    const mappingsToDelete = existingMappings?.filter((m) => logicalTypesSet.has(m.logical_type)) ?? [];

    // 3) Delete existing templates from Meta and DB (only matching types)
    const deleteResults: Array<{ name: string; ok: boolean; error?: string }> = [];

    if (mappingsToDelete.length > 0) {
      console.log("[recreate-templates] Deleting", mappingsToDelete.length, "existing templates");

      for (const mapping of mappingsToDelete) {
        const delResult = await deleteTemplateInWaba(wabaId, accessToken, mapping.template_name);
        deleteResults.push({
          name: mapping.template_name,
          ok: delResult.ok,
          error: delResult.ok ? undefined : delResult.error,
        });
        console.log("[recreate-templates] DELETE", mapping.template_name, delResult.ok ? "OK" : `FAILED: ${delResult.error}`);
      }

      // Delete matching mappings from DB
      const idsToDelete = mappingsToDelete.map((m) => m.id);
      const { error: dbDelError } = await supabase
        .from("template_mappings")
        .delete()
        .in("id", idsToDelete);

      if (dbDelError) {
        console.error("[recreate-templates] Error deleting DB mappings:", dbDelError);
        return jsonResponse(500, { ok: false, error: "Failed to delete existing mappings from DB" });
      }
    }

    // 4) Create new templates from canonical definitions
    const createResults: Array<{ logical_type: string; name: string; ok: boolean; templateId?: string; error?: string }> = [];
    const newMappings: Array<Record<string, unknown>> = [];

    for (const tmpl of templatesToProcess) {
      const templateName = generateTemplateName(tmpl.template_name);
      console.log("[recreate-templates] Creating template:", templateName);

      const result = await createTemplateInWaba(
        wabaId,
        accessToken,
        templateName,
        tmpl.language,
        tmpl.category,
        tmpl.components,
      );

      createResults.push({
        logical_type: tmpl.logical_type,
        name: templateName,
        ok: result.ok,
        templateId: result.templateId,
        error: result.ok ? undefined : result.error,
      });

      newMappings.push({
        whatsapp_line_id: whatsappLineId,
        logical_type: tmpl.logical_type,
        provider: "meta",
        template_name: templateName,
        template_language: tmpl.language,
        parameter_order: [],
        is_active: false,
        meta_status: result.ok ? (result.status || "PENDING") : "FAILED",
        meta_template_id: result.templateId || null,
      });

      console.log(
        "[recreate-templates]",
        templateName,
        result.ok ? `OK (id: ${result.templateId}, status: ${result.status})` : `FAILED: ${result.error}`,
      );
    }

    // 5) Insert new mappings
    const { error: insertError } = await supabase
      .from("template_mappings")
      .upsert(newMappings, { onConflict: "whatsapp_line_id,logical_type,provider", ignoreDuplicates: false });

    if (insertError) {
      console.error("[recreate-templates] Error upserting new mappings:", insertError);
      return jsonResponse(500, {
        ok: false,
        error: "Templates created in Meta but failed to save mappings to DB",
        created: createResults,
      });
    }

    const created = createResults.filter((r) => r.ok).length;
    const failed = createResults.filter((r) => !r.ok).length;

    console.log("[recreate-templates] Done. Created:", created, "Failed:", failed);

    return jsonResponse(200, {
      ok: true,
      deleted: deleteResults.length,
      created,
      failed,
      details: { deleted: deleteResults, created: createResults },
    });
  } catch (error) {
    console.error("[recreate-templates] Unexpected error:", error);
    return jsonResponse(500, {
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
