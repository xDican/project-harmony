import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUILD = "meta-embedded-signup@2026-02-21_v3";
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const RequestSchema = z.object({
  code: z.string().min(1, "code es requerido"),
  waba_id: z.string().min(1, "waba_id es requerido"),
  phone_number_id: z.string().min(1, "phone_number_id es requerido"),
});

// Logical types for default template_mappings
const DEFAULT_LOGICAL_TYPES = [
  "confirmation",
  "reminder_24h",
  "reschedule_doctor",
  "patient_confirmed",
  "patient_reschedule",
];

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
    const { code, waba_id, phone_number_id } = validation.data;

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
      .select("id")
      .eq("organization_id", orgId)
      .eq("meta_phone_number_id", phone_number_id)
      .maybeSingle();

    let lineId: string;

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
      const { data: phoneConflict } = await supabaseAdmin
        .from("whatsapp_lines")
        .select("id, organization_id")
        .eq("phone_number", displayPhoneNumber)
        .maybeSingle();

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

    // 9) Copy template_mappings from previous active line (if any), else create empty defaults
    let mappings;
    if (previousActiveLineId) {
      const { data: prevMappings } = await supabaseAdmin
        .from("template_mappings")
        .select("logical_type, template_name, template_language, parameter_order")
        .eq("whatsapp_line_id", previousActiveLineId)
        .eq("provider", "meta")
        .eq("is_active", true);

      if (prevMappings && prevMappings.length > 0) {
        mappings = prevMappings.map((m) => ({
          whatsapp_line_id: lineId,
          logical_type: m.logical_type,
          provider: "meta",
          template_name: m.template_name,
          template_language: m.template_language,
          parameter_order: m.parameter_order,
          is_active: !!m.template_name,
        }));
        console.log("[meta-embedded-signup] Copying", mappings.length, "template_mappings from previous line:", previousActiveLineId);
      }
    }

    if (!mappings) {
      mappings = DEFAULT_LOGICAL_TYPES.map((logicalType) => ({
        whatsapp_line_id: lineId,
        logical_type: logicalType,
        provider: "meta",
        template_name: "",
        template_language: "es",
        parameter_order: [],
        is_active: false,
      }));
    }

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

    // 10) Auto-register phone number with Meta Cloud API
    let metaRegistered = false;
    try {
      const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");

      const registerRes = await fetch(
        `${GRAPH_BASE}/${phone_number_id}/register`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messaging_product: "whatsapp", pin }),
        },
      );
      const registerData = await registerRes.json().catch(() => ({}));

      if (registerRes.ok) {
        metaRegistered = true;
        await supabaseAdmin
          .from("whatsapp_lines")
          .update({ meta_registered: true, meta_registration_pin: pin })
          .eq("id", lineId);
        console.log("[meta-embedded-signup] Phone registered with Meta Cloud API");
      } else {
        console.warn("[meta-embedded-signup] Registration failed (non-blocking):", registerData?.error?.message);
        // Save PIN anyway so UI can retry with same PIN
        await supabaseAdmin
          .from("whatsapp_lines")
          .update({ meta_registration_pin: pin })
          .eq("id", lineId);
      }
    } catch (regErr) {
      console.warn("[meta-embedded-signup] Registration error (non-blocking):", regErr);
    }

    // 11) Responder con éxito
    return json({
      success: true,
      line_id: lineId,
      phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      meta_registered: metaRegistered,
      build: BUILD,
    });
  } catch (err) {
    console.error("[meta-embedded-signup] Unexpected error:", err);
    return json({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});
