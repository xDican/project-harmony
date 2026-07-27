/**
 * Espera silencio en una ráfaga de mensajes fragmentados y los procesa como
 * uno solo. Fase debounce (Diego 27 Jul 2026) — ver docs/plan y
 * bot_message_debounce (migración 20260727220000).
 *
 * Invocación normal: meta-webhook dispara { debounceId } fire-and-forget
 * (mismo patrón que dispatchProcessMediaAsync) apenas el PRIMER fragmento de
 * una ráfaga llega. Este proceso hace loop: duerme hasta que pasen 10-12s de
 * silencio (last_message_at) o se cumpla el tope de 30s desde que empezó
 * (claimed_at) — lo que ocurra primero. Cada mensaje nuevo que llegue durante
 * la espera reinicia el conteo de silencio (mismo mecanismo, otro caller de
 * enqueue_bot_debounce_message solo actualiza la fila, no dispara un processor
 * nuevo — is_new_claim=false).
 *
 * Ventana subida de 6-8s a 10-12s el 27 Jul (prueba real con Diego: un mensaje
 * a 7.9s del anterior quedó fuera de la ráfaga y abrió turno propio — quería
 * más margen). Tope máximo escalado en la misma proporción (20s→30s) para que
 * el "colchón" sobre la ventana de silencio no se angoste.
 *
 * Invocación de barrido: el cron `bot-debounce-sweep-stuck` (cada minuto)
 * llama sin debounceId — procesa cualquier fila abandonada (el processor que
 * la creó falló a mitad de camino) para que el paciente nunca se quede sin
 * respuesta.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { routeToBotHandler } from "../_shared/bot-routing.ts";

const SILENCE_SECONDS = 11; // punto medio del rango 10-12s acordado con Diego (27 Jul)
const MAX_WAIT_SECONDS = 30;
const SWEEP_STALE_SECONDS = 35; // claimed_at más viejo que esto = abandonada

interface DebounceRow {
  id: string;
  whatsapp_line_id: string;
  organization_id: string;
  patient_phone: string;
  patient_id: string | null;
  conversation_id: string | null;
  messages: string[];
  last_message_at: string;
  claimed_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const internalSecretHeader = req.headers.get("x-internal-secret") || "";
  const internalSecretEnv = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const benchTriggerEnv = Deno.env.get("BENCH_TRIGGER_TOKEN") || "";
  const secretOk = !!internalSecretHeader && (
    (!!internalSecretEnv && internalSecretHeader === internalSecretEnv) ||
    (!!benchTriggerEnv && internalSecretHeader === benchTriggerEnv)
  );
  if (!secretOk) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let body: { debounceId?: string } = {};
  try {
    if (req.headers.get("content-length") !== "0") body = await req.json();
  } catch {
    // body vacío (modo sweep del cron) — sin problema
  }

  try {
    if (body.debounceId) {
      await processOne(supabase, body.debounceId);
    } else {
      await sweepStuckRows(supabase);
    }
  } catch (e) {
    console.error("[bot-debounce-processor] Unexpected error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

// deno-lint-ignore no-explicit-any
async function sweepStuckRows(supabase: any): Promise<void> {
  const cutoff = new Date(Date.now() - SWEEP_STALE_SECONDS * 1000).toISOString();
  const { data: stale } = await supabase
    .from("bot_message_debounce")
    .select("id")
    .lt("claimed_at", cutoff);

  for (const row of (stale ?? []) as { id: string }[]) {
    console.warn("[bot-debounce-processor] Sweeping abandoned row:", row.id);
    await processOne(supabase, row.id);
  }
}

/** Loop de espera + claim + procesamiento para una fila puntual. */
// deno-lint-ignore no-explicit-any
async function processOne(db: any, debounceId: string): Promise<void> {

  while (true) {
    const { data: rowData } = await db
      .from("bot_message_debounce")
      .select("*")
      .eq("id", debounceId)
      .maybeSingle();
    const row = rowData as DebounceRow | null;
    if (!row) return; // ya procesada (otro caller, o carrera) — nada que hacer

    const now = Date.now();
    const claimedAtMs = new Date(row.claimed_at).getTime();
    const lastMsgAtMs = new Date(row.last_message_at).getTime();
    const elapsedSinceStart = (now - claimedAtMs) / 1000;
    const quietFor = (now - lastMsgAtMs) / 1000;

    const readyByMaxWait = elapsedSinceStart >= MAX_WAIT_SECONDS;
    const readyBySilence = quietFor >= SILENCE_SECONDS;

    if (!readyByMaxWait && !readyBySilence) {
      const sleepSilence = SILENCE_SECONDS - quietFor;
      const sleepCap = MAX_WAIT_SECONDS - elapsedSinceStart;
      const sleepSeconds = Math.max(0.5, Math.min(sleepSilence, sleepCap));
      await new Promise((resolve) => setTimeout(resolve, sleepSeconds * 1000));
      continue;
    }

    // Intento de claim atómico — falla (0 filas) si un mensaje nuevo llegó
    // justo en este instante, que este loop todavía no vio. Re-chequear.
    const { data: claimed } = await db.rpc("claim_bot_debounce_row", {
      p_id: row.id,
      p_expected_last_message_at: row.last_message_at,
    });
    const claimedRow = (Array.isArray(claimed) ? claimed[0] : claimed) as DebounceRow | undefined;
    if (!claimedRow) continue; // carrera — volver a leer y esperar lo que falte

    const combinedText = claimedRow.messages.join("\n");
    console.log("[bot-debounce-processor] Processing burst:", claimedRow.id, "messages:", claimedRow.messages.length);
    await routeToBotHandler(
      claimedRow.patient_phone,
      combinedText,
      claimedRow.whatsapp_line_id,
      claimedRow.organization_id,
      claimedRow.patient_id ?? undefined,
      undefined,
      claimedRow.conversation_id ?? undefined,
    );
    return;
  }
}
