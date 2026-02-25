import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const RequestSchema = z.object({
  whatsapp_line_id: z.string().uuid("whatsapp_line_id debe ser UUID"),
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
    // 1) Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json({ error: "Supabase env vars not configured" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2) Parse body
    const rawBody = await req.json().catch(() => ({}));
    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return json({ error: "Datos invalidos", details: validation.error.errors }, 400);
    }
    const { whatsapp_line_id } = validation.data;

    // 3) Fetch the line
    const { data: line, error: lineError } = await supabaseAdmin
      .from("whatsapp_lines")
      .select("id, organization_id, provider, meta_waba_id, meta_phone_number_id, meta_access_token")
      .eq("id", whatsapp_line_id)
      .single();

    if (lineError || !line) {
      return json({ error: "Linea de WhatsApp no encontrada" }, 404);
    }

    // 4) Verify user is admin of the org
    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", line.organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || membership.role !== "admin") {
      return json({ error: "Solo administradores pueden desconectar lineas" }, 403);
    }

    console.log("[disconnect-whatsapp-line] user:", user.id, "| line:", whatsapp_line_id, "| org:", line.organization_id);

    const results = {
      deregistered: false,
      unsubscribed: false,
      templates_deleted: 0,
    };

    // 5) Meta API calls (only for Meta provider lines with credentials)
    if (line.provider === "meta" && line.meta_access_token) {
      const token = line.meta_access_token;

      // 5a) Deregister phone from Cloud API (clears 2FA PIN requirement)
      if (line.meta_phone_number_id) {
        try {
          const deregRes = await fetch(`${GRAPH_BASE}/${line.meta_phone_number_id}/deregister`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ messaging_product: "whatsapp" }),
          });
          const deregData = await deregRes.json().catch(() => ({}));
          if (deregRes.ok) {
            results.deregistered = true;
            console.log("[disconnect-whatsapp-line] Phone deregistered from Cloud API");
          } else {
            console.warn("[disconnect-whatsapp-line] Deregister failed:", deregData?.error?.message);
          }
        } catch (err) {
          console.warn("[disconnect-whatsapp-line] Deregister error:", err);
        }
      }

      // 5b) Unsubscribe WABA from webhook
      if (line.meta_waba_id) {
        try {
          const unsubRes = await fetch(`${GRAPH_BASE}/${line.meta_waba_id}/subscribed_apps`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const unsubData = await unsubRes.json().catch(() => ({}));
          if (unsubRes.ok) {
            results.unsubscribed = true;
            console.log("[disconnect-whatsapp-line] WABA unsubscribed from webhook");
          } else {
            console.warn("[disconnect-whatsapp-line] Unsubscribe failed:", unsubData?.error?.message);
          }
        } catch (err) {
          console.warn("[disconnect-whatsapp-line] Unsubscribe error:", err);
        }
      }

      // 5c) Delete templates from Meta WABA (best-effort)
      if (line.meta_waba_id) {
        const { data: mappings } = await supabaseAdmin
          .from("template_mappings")
          .select("template_name")
          .eq("whatsapp_line_id", whatsapp_line_id);

        if (mappings?.length) {
          console.log(`[disconnect-whatsapp-line] Deleting ${mappings.length} templates from WABA ${line.meta_waba_id}`);
          for (const m of mappings) {
            try {
              const delRes = await fetch(
                `${GRAPH_BASE}/${line.meta_waba_id}/message_templates?name=${m.template_name}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
              );
              const delData = await delRes.json().catch(() => ({}));
              if (delRes.ok) {
                results.templates_deleted++;
                console.log(`[disconnect-whatsapp-line] Deleted template: ${m.template_name}`);
              } else {
                console.warn(`[disconnect-whatsapp-line] Failed to delete template ${m.template_name}:`, delData?.error?.message);
              }
            } catch (err) {
              console.warn(`[disconnect-whatsapp-line] Error deleting template ${m.template_name}:`, err);
            }
          }
        }
      }
    }

    // 6) Clean up tables whose FKs lack ON DELETE CASCADE
    //    bot_sessions and message_logs reference whatsapp_lines without CASCADE
    const { error: botErr } = await supabaseAdmin
      .from("bot_sessions")
      .delete()
      .eq("whatsapp_line_id", whatsapp_line_id);
    if (botErr) {
      console.warn("[disconnect-whatsapp-line] Error deleting bot_sessions (non-blocking):", botErr);
    }

    // Nullify whatsapp_line_id in message_logs (preserve historical data)
    const { error: logsErr } = await supabaseAdmin
      .from("message_logs")
      .update({ whatsapp_line_id: null })
      .eq("whatsapp_line_id", whatsapp_line_id);
    if (logsErr) {
      console.warn("[disconnect-whatsapp-line] Error nullifying message_logs (non-blocking):", logsErr);
    }

    // Delete template_mappings referencing this line
    const { error: tmErr } = await supabaseAdmin
      .from("template_mappings")
      .delete()
      .eq("whatsapp_line_id", whatsapp_line_id);
    if (tmErr) {
      console.warn("[disconnect-whatsapp-line] Error deleting template_mappings (non-blocking):", tmErr);
    }

    // Delete bot_conversation_logs referencing this line
    const { error: bclErr } = await supabaseAdmin
      .from("bot_conversation_logs")
      .delete()
      .eq("whatsapp_line_id", whatsapp_line_id);
    if (bclErr) {
      console.warn("[disconnect-whatsapp-line] Error deleting bot_conversation_logs (non-blocking):", bclErr);
    }

    // 7) Hard delete: remove the line completely to free the phone_number UNIQUE constraint.
    //    whatsapp_line_doctors has ON DELETE CASCADE so it's cleaned up automatically.
    //    The meta_registration_pin is no longer needed — step 5a already called /deregister
    //    on Meta (clearing 2FA), and reconnect via meta-embedded-signup generates a new PIN.
    const { error: deleteError } = await supabaseAdmin
      .from("whatsapp_lines")
      .delete()
      .eq("id", whatsapp_line_id);

    if (deleteError) {
      console.error("[disconnect-whatsapp-line] Error deleting whatsapp_line:", deleteError);
      return json({ error: "Error al eliminar la linea de WhatsApp" }, 500);
    }

    console.log("[disconnect-whatsapp-line] Line hard-deleted:", whatsapp_line_id);

    return json({
      success: true,
      ...results,
    });
  } catch (err) {
    console.error("[disconnect-whatsapp-line] Unexpected error:", err);
    return json({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});
