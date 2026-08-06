/**
 * Invocación compartida del bot: llama a bot-handler y envía la respuesta por
 * messaging-gateway. Extraída de meta-webhook (Fase debounce, 27 Jul 2026) para
 * que también la use bot-debounce-processor sin duplicar esta lógica — ambas
 * funciones terminan en el mismo lugar: bot-handler decide, esto la manda.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function routeToBotHandler(
  fromPhone: string,
  messageText: string,
  lineId: string,
  orgId: string,
  patientId?: string,
  appointmentId?: string,
  conversationId?: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const botHandlerUrl = `https://${projectRef}.supabase.co/functions/v1/bot-handler`;
  const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

  try {
    // 1) Call bot-handler
    const botRes = await fetch(botHandlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        whatsappLineId: lineId,
        patientPhone: fromPhone,
        messageText: messageText || "",
        organizationId: orgId,
        ...(appointmentId ? { appointmentId } : {}),
      }),
    });

    if (!botRes.ok) {
      const errText = await botRes.text();
      console.error("[bot-routing] bot-handler error:", botRes.status, errText);
      return;
    }

    const botData = await botRes.json();
    console.log("[bot-routing] bot-handler response:", { nextState: botData.nextState, hasMessage: !!botData.message });

    if (!botData.message) return;

    // Re-chequeo de Coexistence justo antes de enviar: el gate original solo
    // corre UNA vez, en la puerta de entrada del webhook, antes del debounce
    // de 10-30s (agrupar mensajes fragmentados) — tiempo de sobra para que un
    // humano conteste desde el celular fisico sin que este envio se entere
    // (bug real 5 Ago: bot y humana respondiendo casi al mismo segundo).
    if (conversationId) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: conv } = await supabase
        .from("conversations")
        .select("status")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.status === "human_active") {
        console.log("[bot-routing] Skipping bot reply — human took over mid-flight. conv:", conversationId);
        return;
      }
    }

    // 2) Format message — append numbered options if present
    let fullMessage: string = botData.message;
    if (Array.isArray(botData.options) && botData.options.length > 0) {
      const optLines = (botData.options as string[])
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join("\n");
      fullMessage = `${fullMessage}\n\n${optLines}`;
    }

    // 3) Send via messaging-gateway
    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        to: fromPhone,
        body: fullMessage,
        type: "generic",
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        ...(conversationId ? { conversationId, source: "bot" } : {}),
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error("[bot-routing] messaging-gateway error:", gwRes.status, errText);
    } else {
      console.log("[bot-routing] Bot response sent to:", fromPhone, "conv:", conversationId ?? "(none)");
    }
  } catch (err) {
    console.error("[bot-routing] routeToBotHandler unexpected error:", err);
  }
}
