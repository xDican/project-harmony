/**
 * Adaptador LLM agnóstico al proveedor — capa de comprensión/redacción del bot SDR.
 * Fase 2 del bot SDR híbrido (plan: .claude/plans/atomic-sauteeing-hummingbird.md).
 *
 * Diseño: fetch directo sin SDKs (patrón _shared/whisper.ts), no-throw — siempre
 * retorna LLMResult con ok/error. La instrucción de "responder SOLO JSON" vive en
 * el prompt del caller, no en modos JSON nativos (cada proveedor los hace distinto;
 * el parser tolerante del caller nos independiza del proveedor).
 *
 * Keys: ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY (secrets de Supabase,
 * validadas por la función llm-ping).
 */

export type LLMProvider = "anthropic" | "openai" | "gemini";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  /** Default 0 — el bot SDR quiere determinismo, no creatividad. */
  temperature?: number;
}

export interface LLMResult {
  ok: boolean;
  text: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
  error?: string;
}

/**
 * Precios por millón de tokens (USD), verificados 24 Jul 2026 vía web.
 * Gemini 3.x Flash "full" ($1.50/$7.50) quedó más caro que Haiku — el candidato
 * económico de Google es flash-lite. Actualizar si cambian los precios.
 */
export const MODEL_PRICING: Record<string, { inPerMTok: number; outPerMTok: number }> = {
  "claude-haiku-4-5": { inPerMTok: 1.0, outPerMTok: 5.0 },
  "gpt-4o-mini": { inPerMTok: 0.15, outPerMTok: 0.6 },
  "gemini-3.5-flash-lite": { inPerMTok: 0.3, outPerMTok: 2.5 },
};

export function estimateCostUsd(
  model: string,
  tokensIn: number | null,
  tokensOut: number | null,
): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing || tokensIn == null || tokensOut == null) return null;
  return (tokensIn * pricing.inPerMTok + tokensOut * pricing.outPerMTok) / 1_000_000;
}

/** Llama al proveedor indicado. Nunca lanza — errores van en el resultado. */
export async function callLLM(req: LLMRequest): Promise<LLMResult> {
  const t0 = Date.now();
  try {
    switch (req.provider) {
      case "anthropic":
        return await callAnthropic(req, t0);
      case "openai":
        return await callOpenAI(req, t0);
      case "gemini":
        return await callGemini(req, t0);
    }
  } catch (e) {
    return {
      ok: false,
      text: null,
      tokensIn: null,
      tokensOut: null,
      latencyMs: Date.now() - t0,
      error: String(e).slice(0, 500),
    };
  }
}

async function callAnthropic(req: LLMRequest, t0: number): Promise<LLMResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0,
      system: req.system,
      messages: req.messages,
    }),
  });
  if (!res.ok) return failure(res, t0);
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type?: string }) => b.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("");
  return {
    ok: true,
    text: text || null,
    tokensIn: data.usage?.input_tokens ?? null,
    tokensOut: data.usage?.output_tokens ?? null,
    latencyMs: Date.now() - t0,
  };
}

async function callOpenAI(req: LLMRequest, t0: number): Promise<LLMResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY") ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0,
      messages: [{ role: "system", content: req.system }, ...req.messages],
    }),
  });
  if (!res.ok) return failure(res, t0);
  const data = await res.json();
  return {
    ok: true,
    text: data.choices?.[0]?.message?.content ?? null,
    tokensIn: data.usage?.prompt_tokens ?? null,
    tokensOut: data.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - t0,
  };
}

async function callGemini(req: LLMRequest, t0: number): Promise<LLMResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: req.maxTokens,
          temperature: req.temperature ?? 0,
        },
      }),
    },
  );
  if (!res.ok) return failure(res, t0);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  return {
    ok: true,
    text: text || null,
    tokensIn: data.usageMetadata?.promptTokenCount ?? null,
    tokensOut: data.usageMetadata?.candidatesTokenCount ?? null,
    latencyMs: Date.now() - t0,
  };
}

async function failure(res: Response, t0: number): Promise<LLMResult> {
  const body = await res.text().catch(() => "");
  return {
    ok: false,
    text: null,
    tokensIn: null,
    tokensOut: null,
    latencyMs: Date.now() - t0,
    error: `HTTP ${res.status}: ${body.slice(0, 400)}`,
  };
}

/**
 * Registra la llamada en llm_call_logs (fire-and-forget: un fallo de logging
 * jamás debe romper el flujo del bot — solo console.error).
 */
export async function logLLMCall(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: {
    organizationId?: string | null;
    conversationId?: string | null;
    purpose: "intent" | "reply" | "distill" | "benchmark";
    provider: LLMProvider;
    model: string;
    result: LLMResult;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("llm_call_logs").insert({
      organization_id: opts.organizationId ?? null,
      conversation_id: opts.conversationId ?? null,
      purpose: opts.purpose,
      provider: opts.provider,
      model: opts.model,
      tokens_in: opts.result.tokensIn,
      tokens_out: opts.result.tokensOut,
      latency_ms: opts.result.latencyMs,
      success: opts.result.ok,
      error: opts.result.error ?? null,
    });
    if (error) console.error("[llm] logLLMCall insert failed:", error.message);
  } catch (e) {
    console.error("[llm] logLLMCall exception:", e);
  }
}
