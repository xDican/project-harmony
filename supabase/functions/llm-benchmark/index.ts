/**
 * llm-benchmark: corre el dataset de casos reales contra los 3 modelos candidatos
 * del bot SDR y devuelve la tabla comparativa (acierto, costo, latencia).
 * Fase 2 del bot SDR híbrido (plan: .claude/plans/atomic-sauteeing-hummingbird.md).
 *
 * Protegida con header `x-internal-secret` == INTERNAL_FUNCTION_SECRET — cada
 * corrida gasta dinero real (~$0.10-0.50), no puede quedar abierta.
 *
 * Deploy: npx supabase functions deploy llm-benchmark --no-verify-jwt
 * Uso:    curl -X POST .../llm-benchmark -H "x-internal-secret: $SECRET" [-d '{"models":["gpt-4o-mini"]}']
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callLLM,
  estimateCostUsd,
  type LLMProvider,
  type LLMResult,
  logLLMCall,
} from "../_shared/llm.ts";
import {
  buildSdrContext,
  buildSdrSystemPrompt,
  parseSdrOutput,
  type SdrLLMOutput,
} from "../_shared/sdr-prompt.ts";
import { BENCH_CASES, type BenchCase } from "./dataset.ts";

/** Línea piloto por default (org Dra. Hanoy). Sobreescribible vía body.line_id. */
const DEFAULT_LINE_ID = "5303882f-72c1-46f8-a6db-1f19d57328f3";

/** Proyección mensual: ~40 conversaciones/día × ~3 mensajes de texto × 30 días. */
const PROJECTED_MSGS_PER_MONTH = 3600;

const BENCH_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: "anthropic", model: "claude-haiku-4-5" },
  { provider: "openai", model: "gpt-4o-mini" },
  { provider: "gemini", model: "gemini-3.5-flash-lite" },
];

interface CaseResult {
  caseId: string;
  model: string;
  jsonOk: boolean;
  intentOk: boolean | null;
  stageOk: boolean | null;
  handoffOk: boolean | null;
  serviceOk: boolean | null;
  latencyMs: number;
  costUsd: number | null;
  output: SdrLLMOutput | null;
  rawText: string | null;
  error?: string;
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function scoreCase(
  c: BenchCase,
  parsed: SdrLLMOutput | null,
  serviceIdByName: Map<string, string>,
): Pick<CaseResult, "jsonOk" | "intentOk" | "stageOk" | "handoffOk" | "serviceOk"> {
  if (!parsed) {
    return { jsonOk: false, intentOk: null, stageOk: null, handoffOk: null, serviceOk: null };
  }
  const intentOk = asArray(c.expected.intent).includes(parsed.intent);
  const stageOk = c.expected.leadStage === undefined
    ? null
    : asArray(c.expected.leadStage).includes(parsed.lead_stage);
  const handoffOk = parsed.needs_handoff === c.expected.needsHandoff;
  let serviceOk: boolean | null = null;
  if (c.expected.serviceHint) {
    const expectedId = serviceIdByName.get(c.expected.serviceHint.toLowerCase());
    serviceOk = expectedId != null && parsed.service_id === expectedId;
  }
  return { jsonOk: true, intentOk, stageOk, handoffOk, serviceOk };
}

Deno.serve(async (req) => {
  // Dos credenciales válidas: el secret interno función-a-función, o el token
  // de disparo del benchmark (BENCH_TRIGGER_TOKEN, rotable sin tocar el interno).
  const provided = req.headers.get("x-internal-secret") ?? "";
  const internal = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  const trigger = Deno.env.get("BENCH_TRIGGER_TOKEN") ?? "";
  const authorized = (internal && provided === internal) || (trigger && provided === trigger);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let body: { line_id?: string; models?: string[] } = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    // body opcional
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ctx = await buildSdrContext(supabase, body.line_id ?? DEFAULT_LINE_ID);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "line_not_found" }), { status: 400 });
  }
  const system = buildSdrSystemPrompt(ctx);
  const serviceIdByName = new Map(ctx.services.map((s) => [s.name.toLowerCase(), s.id]));

  const models = BENCH_MODELS.filter(
    (m) => !body.models || body.models.includes(m.model),
  );

  // Proveedores en paralelo, casos secuenciales dentro de cada proveedor
  // (evita rate limits y mantiene latencias comparables).
  const allResults: CaseResult[] = [];
  await Promise.all(
    models.map(async ({ provider, model }) => {
      for (const c of BENCH_CASES) {
        const result: LLMResult = await callLLM({
          provider,
          model,
          system,
          messages: [...(c.history ?? []), { role: "user", content: c.message }],
          maxTokens: 500,
          temperature: 0,
        });
        await logLLMCall(supabase, {
          organizationId: ctx.organizationId,
          purpose: "benchmark",
          provider,
          model,
          result,
        });
        const parsed = result.ok ? parseSdrOutput(result.text) : null;
        allResults.push({
          caseId: c.id,
          model,
          ...scoreCase(c, parsed, serviceIdByName),
          latencyMs: result.latencyMs,
          costUsd: estimateCostUsd(model, result.tokensIn, result.tokensOut),
          output: parsed,
          rawText: parsed ? null : result.text?.slice(0, 400) ?? null,
          error: result.error,
        });
      }
    }),
  );

  const summary = models.map(({ model }) => {
    const rows = allResults.filter((r) => r.model === model);
    const scored = (field: "intentOk" | "stageOk" | "handoffOk" | "serviceOk") => {
      const applicable = rows.filter((r) => r[field] !== null);
      const ok = applicable.filter((r) => r[field] === true).length;
      return applicable.length === 0
        ? null
        : { ok, total: applicable.length, pct: Math.round((ok / applicable.length) * 1000) / 10 };
    };
    const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
    const totalCost = rows.reduce((s, r) => s + (r.costUsd ?? 0), 0);
    const avgCostPerMsg = rows.length ? totalCost / rows.length : 0;
    return {
      model,
      cases: rows.length,
      json_failures: rows.filter((r) => !r.jsonOk).length,
      intent: scored("intentOk"),
      lead_stage: scored("stageOk"),
      handoff: scored("handoffOk"),
      service_match: scored("serviceOk"),
      latency_p50_ms: percentile(latencies, 50),
      latency_p95_ms: percentile(latencies, 95),
      benchmark_cost_usd: Math.round(totalCost * 10000) / 10000,
      projected_month_usd:
        Math.round(avgCostPerMsg * PROJECTED_MSGS_PER_MONTH * 100) / 100,
    };
  });

  return new Response(
    JSON.stringify({ line: ctx.whatsappLineId, org: ctx.organizationName, summary, detail: allResults }, null, 2),
    { headers: { "content-type": "application/json" } },
  );
});
