import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  CANONICAL_TEMPLATES,
  LEGACY_TEMPLATE_NAMES,
  ORIONCARE_WABA_ID,
  generateTemplateName,
} from "../_shared/canonical-templates.ts";
import { createTemplateInWaba } from "../_shared/meta-template-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUILD = "meta-embedded-signup@2026-02-25_v16";
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const RequestSchema = z.object({
  code: z.string().min(1, "code es requerido"),
  // waba_id and phone_number_id are optional: when absent (mobile browsers where
  // WA_EMBEDDED_SIGNUP postMessage never arrives), the EF discovers them via debug_token.
  waba_id: z.string().optional(),
  phone_number_id: z.string().optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1) Auth: verificar JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const metaAppId = Deno.env.get("META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json({ error: "Supabase env vars not configured" }, 500);
    }
    if (!metaAppId || !metaAppSecret) {
      return json({ error: "META_APP_ID or META_APP_SECRET not configured" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2) Parsear y validar body
    const rawBody = await req.json().catch(() => ({}));
    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return json({ error: "Datos inválidos", details: validation.error.errors }, 400);
    }
    const { code, waba_id: rawWabaId, phone_number_id: rawPhoneNumberId } = validation.data;

    // 3) Obtener organization_id del usuario
    const { data: orgMember } = await supabaseAdmin
      .from("org_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!orgMember?.organization_id) {
      console.error("[meta-embedded-signup] No org found for user:", user.id);
      return json({ error: "Usuario sin organización asignada" }, 403);
    }
    const orgId = orgMember.organization_id;

    console.log("[meta-embedded-signup] BUILD:", BUILD, "| user:", user.id, "| org:", orgId);

    // 4) Exchange code → short-lived user token
    // Embedded Signup usa redirect_uri vacío en el token exchange
    const tokenParams = new URLSearchParams({
      client_id: metaAppId,
      client_secret: metaAppSecret,
      redirect_uri: "",
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?${tokenParams.toString()}`,
      { method: "GET" },
    );
    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[meta-embedded-signup] Token exchange failed:", tokenData);
      return json({ error: "Error al intercambiar el código con Meta", detail: tokenData?.error?.message }, 400);
    }
    const shortLivedToken: string = tokenData.access_token;
    console.log("[meta-embedded-signup] Short-lived token obtained");

    // 5) Short-lived → long-lived token (60 días)
    const llParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: metaAppId,
      client_secret: metaAppSecret,
      fb_exchange_token: shortLivedToken,
    });
    const llRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?${llParams.toString()}`,
      { method: "GET" },
    );
    const llData = await llRes.json().catch(() => ({}));

    // Si falla el long-lived, usar el short-lived como fallback (mejor que nada)
    const accessToken: string = llData.access_token ?? shortLivedToken;
    if (llData.access_token) {
      console.log("[meta-embedded-signup] Long-lived token obtained");
    } else {
      console.warn("[meta-embedded-signup] Long-lived token exchange failed, using short-lived:", llData);
    }

    // 5b) Discover waba_id / phone_number_id if not provided by the frontend
    // (Mobile browsers open the OAuth popup as a new tab, breaking postMessage)
    let waba_id = rawWabaId;
    let phone_number_id = rawPhoneNumberId;

    if (!waba_id || !phone_number_id) {
      console.log("[meta-embedded-signup] waba_id/phone_number_id not provided — discovering via debug_token");

      const debugRes = await fetch(
        `${GRAPH_BASE}/debug_token?input_token=${accessToken}&access_token=${metaAppId}|${metaAppSecret}`,
      );
      const debugData = await debugRes.json().catch(() => ({}));

      if (!debugRes.ok || !debugData.data?.granular_scopes) {
        console.error("[meta-embedded-signup] debug_token failed:", debugData);
        return json({
          error: "No se pudo obtener información de WABA. Completa el proceso de configuración de WhatsApp Business.",
          detail: debugData?.error?.message,
        }, 400);
      }

      // Find the WABA ID from granular_scopes (whatsapp_business_management scope contains target WABA IDs)
      interface GranularScope { scope: string; target_ids?: string[] }
      const wabaScope = (debugData.data.granular_scopes as GranularScope[])
        .find((s) => s.scope === "whatsapp_business_management");

      if (!wabaScope?.target_ids?.length) {
        console.error("[meta-embedded-signup] No WABA IDs in token scopes:", JSON.stringify(debugData.data.granular_scopes));
        return json({ error: "El token no tiene acceso a ningún WABA. Completa el proceso de configuración de WhatsApp Business." }, 400);
      }

      waba_id = wabaScope.target_ids[0];
      console.log("[meta-embedded-signup] Discovered waba_id:", waba_id);

      if (!phone_number_id) {
        const phonesRes = await fetch(
          `${GRAPH_BASE}/${waba_id}/phone_numbers?fields=id,display_phone_number&access_token=${accessToken}`,
        );
        const phonesData = await phonesRes.json().catch(() => ({}));

        if (!phonesRes.ok || !phonesData.data?.length) {
          console.error("[meta-embedded-signup] phone_numbers fetch failed:", phonesData);
          return json({ error: "No se encontraron números de teléfono en el WABA", detail: phonesData?.error?.message }, 400);
        }

        phone_number_id = phonesData.data[0].id;
        console.log("[meta-embedded-signup] Discovered phone_number_id:", phone_number_id, "from", phonesData.data.length, "numbers");
      }
    }

    // 6) Obtener detalles del número de teléfono desde Meta
    const phoneRes = await fetch(
      `${GRAPH_BASE}/${phone_number_id}?fields=display_phone_number,verified_name&access_token=${accessToken}`,
    );
    const phoneData = await phoneRes.json().catch(() => ({}));

    if (!phoneRes.ok || !phoneData.display_phone_number) {
      console.error("[meta-embedded-signup] Phone number fetch failed:", phoneData);
      return json({ error: "No se pudo obtener información del número de teléfono", detail: phoneData?.error?.message }, 400);
    }
    const displayPhoneNumber: string = phoneData.display_phone_number;
    const verifiedName: string = phoneData.verified_name ?? "WhatsApp Business";
    console.log("[meta-embedded-signup] Phone:", displayPhoneNumber, "| Name:", verifiedName);

    // 7) Suscribir WABA a webhook (non-blocking)
    try {
      const subRes = await fetch(`${GRAPH_BASE}/${waba_id}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const subData = await subRes.json().catch(() => ({}));
      if (!subRes.ok) {
        console.warn("[meta-embedded-signup] WABA webhook subscription failed:", subData);
      } else {
        console.log("[meta-embedded-signup] WABA subscribed to webhook successfully");
      }
    } catch (subErr) {
      console.warn("[meta-embedded-signup] WABA subscription error (non-blocking):", subErr);
    }

    // 7b) Capture previous active line for template migration (before any changes)
    const { data: previousLine } = await supabaseAdmin
      .from("whatsapp_lines")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("provider", "meta")
      .neq("meta_phone_number_id", phone_number_id)
      .limit(1)
      .maybeSingle();
    const previousActiveLineId = previousLine?.id ?? null;

    // 8) Upsert whatsapp_lines
    const { data: existingLine } = await supabaseAdmin
      .from("whatsapp_lines")
      .select("id, meta_registration_pin")
      .eq("organization_id", orgId)
      .eq("meta_phone_number_id", phone_number_id)
      .maybeSingle();

    let lineId: string;
    let phoneConflict: { id: string; organization_id: string; meta_registration_pin: string | null } | null = null;

    if (existingLine) {
      // UPDATE línea existente
      const { error: updateError } = await supabaseAdmin
        .from("whatsapp_lines")
        .update({
          meta_access_token: accessToken,
          meta_waba_id: waba_id,
          label: verifiedName,
          phone_number: displayPhoneNumber,
          provider: "meta",
          is_active: true,
        })
        .eq("id", existingLine.id);

      if (updateError) {
        console.error("[meta-embedded-signup] Error updating whatsapp_line:", updateError);
        return json({ error: "Error al actualizar la línea de WhatsApp" }, 500);
      }
      lineId = existingLine.id;
      console.log("[meta-embedded-signup] whatsapp_line updated:", lineId);
    } else {
      // INSERT nueva línea
      // Verificar si el phone_number ya existe en otra línea (unique constraint)
      const { data: phoneConflictData } = await supabaseAdmin
        .from("whatsapp_lines")
        .select("id, organization_id, meta_registration_pin")
        .eq("phone_number", displayPhoneNumber)
        .maybeSingle();
      phoneConflict = phoneConflictData;

      if (phoneConflict) {
        // Si el número ya existe en OTRA org, error
        if (phoneConflict.organization_id !== orgId) {
          return json({ error: "Este número de teléfono ya está registrado en otra organización" }, 409);
        }
        // Si existe en la misma org con otro phone_number_id, actualizar
        const { error: upError } = await supabaseAdmin
          .from("whatsapp_lines")
          .update({
            meta_access_token: accessToken,
            meta_waba_id: waba_id,
            meta_phone_number_id: phone_number_id,
            label: verifiedName,
            provider: "meta",
            is_active: true,
          })
          .eq("id", phoneConflict.id);

        if (upError) {
          console.error("[meta-embedded-signup] Error updating by phone_number:", upError);
          return json({ error: "Error al actualizar la línea de WhatsApp" }, 500);
        }
        lineId = phoneConflict.id;
      } else {
        const { data: newLine, error: insertError } = await supabaseAdmin
          .from("whatsapp_lines")
          .insert({
            organization_id: orgId,
            label: verifiedName,
            phone_number: displayPhoneNumber,
            provider: "meta",
            meta_waba_id: waba_id,
            meta_phone_number_id: phone_number_id,
            meta_access_token: accessToken,
            is_active: true,
            bot_enabled: false,
          })
          .select("id")
          .single();

        if (insertError || !newLine) {
          console.error("[meta-embedded-signup] Error inserting whatsapp_line:", insertError);
          return json({ error: "Error al crear la línea de WhatsApp" }, 500);
        }
        lineId = newLine.id;
        console.log("[meta-embedded-signup] whatsapp_line created:", lineId);
      }
    }

    // 8b) Deactivate all OTHER lines in this org
    const { error: deactivateError } = await supabaseAdmin
      .from("whatsapp_lines")
      .update({ is_active: false })
      .eq("organization_id", orgId)
      .neq("id", lineId);

    if (deactivateError) {
      console.warn("[meta-embedded-signup] Error deactivating old lines (non-blocking):", deactivateError);
    } else {
      console.log("[meta-embedded-signup] Old lines deactivated for org:", orgId);
    }

    // 8c) Auto-populate whatsapp_line_doctors from org's calendar_doctors
    const { data: calDocs } = await supabaseAdmin
      .from("calendar_doctors")
      .select("doctor_id, calendar_id, calendars!inner(organization_id)")
      .eq("calendars.organization_id", orgId)
      .eq("is_active", true);

    if (calDocs && calDocs.length > 0) {
      const rows = calDocs.map((cd: any) => ({
        whatsapp_line_id: lineId,
        doctor_id: cd.doctor_id,
        calendar_id: cd.calendar_id,
      }));
      await supabaseAdmin
        .from("whatsapp_line_doctors")
        .upsert(rows, { onConflict: "whatsapp_line_id,doctor_id,calendar_id", ignoreDuplicates: true });
      console.log("[meta-embedded-signup] whatsapp_line_doctors populated:", rows.length, "entries");
    }

    // 9) Copy template_mappings from previous active line (if any),
    //    or preserve existing mappings on this line (reconnect same number),
    //    or create empty defaults for a brand new line.
    let mappings;

    // Fetch WABA ID of previous line (if any) for same-WABA detection
    let previousWabaId: string | null = null;
    if (previousActiveLineId) {
      const { data: prevLineData } = await supabaseAdmin
        .from("whatsapp_lines")
        .select("meta_waba_id")
        .eq("id", previousActiveLineId)
        .single();
      previousWabaId = prevLineData?.meta_waba_id ?? null;
    }

    // Priority 1: copy from a different previous line
    if (previousActiveLineId) {
      const { data: prevMappings } = await supabaseAdmin
        .from("template_mappings")
        .select("logical_type, template_name, template_language, parameter_order, meta_status, meta_template_id")
        .eq("whatsapp_line_id", previousActiveLineId)
        .eq("provider", "meta")
        .eq("is_active", true);

      if (prevMappings && prevMappings.length > 0) {
        // If the previous line used the same WABA, templates already exist — copy as-is
        if (previousWabaId === waba_id) {
          mappings = prevMappings.map((m) => ({
            whatsapp_line_id: lineId,
            logical_type: m.logical_type,
            provider: "meta",
            template_name: m.template_name,
            template_language: m.template_language,
            parameter_order: m.parameter_order,
            is_active: !!m.template_name,
            meta_status: m.meta_status,
            meta_template_id: m.meta_template_id,
          }));
          console.log("[meta-embedded-signup] Same WABA — copying", mappings.length, "template_mappings from previous line:", previousActiveLineId);
        } else {
          // Different WABA — treat as brand new (will create templates below in 9b)
          console.log("[meta-embedded-signup] Different WABA (prev:", previousWabaId, "new:", waba_id, ") — treating as new line for template creation");
          mappings = undefined;
        }
      }
    }

    // Priority 2: same line already has configured mappings — don't overwrite them
    // BUT if all existing mappings are inactive with null/REJECTED status, treat as needing recreation
    if (!mappings && mappings !== undefined) {
      const { data: existingMappings } = await supabaseAdmin
        .from("template_mappings")
        .select("logical_type, template_name, template_language, parameter_order, is_active, meta_status, meta_template_id")
        .eq("whatsapp_line_id", lineId)
        .eq("provider", "meta")
        .neq("template_name", "");

      if (existingMappings && existingMappings.length > 0) {
        // Check if any mapping is actually usable (active, or pending/approved in Meta)
        const hasUsableMappings = existingMappings.some(
          (m) => m.is_active || m.meta_status === "APPROVED" || m.meta_status === "PENDING"
        );

        if (hasUsableMappings) {
          console.log("[meta-embedded-signup] Same line reconnected — keeping", existingMappings.length, "existing template_mappings (some are usable)");
          // Skip upsert entirely: existing mappings are already correct
          mappings = null;
        } else {
          // All mappings are inactive/null/rejected — delete them and recreate via Priority 3
          console.log("[meta-embedded-signup] Same line reconnected but all", existingMappings.length, "mappings are inactive/null — deleting and recreating templates");
          const { error: delError } = await supabaseAdmin
            .from("template_mappings")
            .delete()
            .eq("whatsapp_line_id", lineId)
            .eq("provider", "meta");

          if (delError) {
            console.error("[meta-embedded-signup] Error deleting stale mappings:", delError);
          }
          // Fall through to Priority 3 by leaving mappings as undefined
          mappings = undefined;
        }
      }
    }

    // Priority 3: brand new line (or different WABA from previous line)
    if (mappings === undefined) {
      // 9b) Create canonical templates with timestamp-based unique names (DDMMYY_HHMMSS)
      // Each connection gets unique names — no collision/retry logic needed.
      if (waba_id !== ORIONCARE_WABA_ID) {
        console.log("[meta-embedded-signup] Creating canonical templates in WABA:", waba_id);
        mappings = [];

        try {
          for (const tmpl of CANONICAL_TEMPLATES) {
            const templateName = generateTemplateName(tmpl.template_name);
            console.log("[meta-embedded-signup] Creating template:", templateName);

            const result = await createTemplateInWaba(
              waba_id!,
              accessToken,
              templateName,
              tmpl.language,
              tmpl.category,
              tmpl.components,
            );

            if (result.ok) {
              console.log("[meta-embedded-signup] Template created:", templateName, "status:", result.status, "id:", result.templateId);
              mappings.push({
                whatsapp_line_id: lineId,
                logical_type: tmpl.logical_type,
                provider: "meta",
                template_name: templateName,
                template_language: tmpl.language,
                parameter_order: [],
                is_active: false,
                meta_status: result.status || "PENDING",
                meta_template_id: result.templateId || null,
              });
            } else {
              console.warn("[meta-embedded-signup] Failed to create template:", templateName, "| error:", result.error);
              mappings.push({
                whatsapp_line_id: lineId,
                logical_type: tmpl.logical_type,
                provider: "meta",
                template_name: templateName,
                template_language: tmpl.language,
                parameter_order: [],
                is_active: false,
                meta_status: "FAILED",
                meta_template_id: null,
              });
            }
          }
        } catch (templateErr) {
          console.error("[meta-embedded-signup] Error creating templates (non-blocking):", templateErr);
          if (mappings.length === 0) {
            mappings = CANONICAL_TEMPLATES.map((t) => ({
              whatsapp_line_id: lineId,
              logical_type: t.logical_type,
              provider: "meta",
              template_name: generateTemplateName(t.template_name),
              template_language: t.language,
              parameter_order: [],
              is_active: false,
              meta_status: null,
              meta_template_id: null,
            }));
          }
        }
      } else {
        // OrionCare primary WABA — use legacy template names (already approved)
        console.log("[meta-embedded-signup] OrionCare WABA — applying legacy template names");
        mappings = CANONICAL_TEMPLATES.map((t) => {
          const legacy = LEGACY_TEMPLATE_NAMES[t.logical_type];
          return {
            whatsapp_line_id: lineId,
            logical_type: t.logical_type,
            provider: "meta",
            template_name: legacy?.template_name ?? t.template_name,
            template_language: legacy?.template_language ?? t.language,
            parameter_order: [],
            is_active: true,
            meta_status: "APPROVED",
            meta_template_id: null,
          };
        });
      }
    }

    if (mappings !== null && mappings.length > 0) {
      const { error: mappingsError } = await supabaseAdmin
        .from("template_mappings")
        .upsert(mappings, {
          onConflict: "whatsapp_line_id,logical_type,provider",
          ignoreDuplicates: false,
        });

      if (mappingsError) {
        console.warn("[meta-embedded-signup] Error upserting template_mappings (non-blocking):", mappingsError);
      } else {
        console.log("[meta-embedded-signup] template_mappings upserted for line:", lineId);
      }
    }

    // 10) Register phone with Meta Cloud API
    // Reuse existing PIN from DB if available (reconnect case — Meta requires the SAME
    // 2FA PIN that was set on the first /register call; deregister does NOT clear it).
    let metaRegistered = false;
    let registrationError: string | null = null;

    const existingPin = existingLine?.meta_registration_pin
      ?? phoneConflict?.meta_registration_pin
      ?? null;
    const pin = existingPin
      || String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");

    console.log("[meta-embedded-signup] Step 10: Registering phone", phone_number_id,
      "| existingPin:", !!existingPin, "| pinLength:", pin.length);

    try {
      const registerBody = { messaging_product: "whatsapp", pin };
      const registerRes = await fetch(`${GRAPH_BASE}/${phone_number_id}/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerBody),
      });
      const registerData = await registerRes.json().catch(() => ({}));

      console.log("[meta-embedded-signup] /register response:", registerRes.status, JSON.stringify(registerData));

      if (registerRes.ok) {
        metaRegistered = true;
        await supabaseAdmin
          .from("whatsapp_lines")
          .update({ meta_registered: true, meta_registration_pin: pin })
          .eq("id", lineId);
        console.log("[meta-embedded-signup] Phone registered (2FA PIN set)");
      } else {
        registrationError = `${registerRes.status}: ${registerData?.error?.message ?? JSON.stringify(registerData)}`;
        console.error("[meta-embedded-signup] Registration FAILED:", registrationError);
      }
    } catch (regErr) {
      registrationError = regErr instanceof Error ? regErr.message : String(regErr);
      console.error("[meta-embedded-signup] Registration exception:", registrationError);
    }

    // 11) Responder con éxito
    return json({
      success: true,
      line_id: lineId,
      phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      meta_registered: metaRegistered,
      registration_error: registrationError,
      build: BUILD,
    });
  } catch (err) {
    console.error("[meta-embedded-signup] Unexpected error:", err);
    return json({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});
