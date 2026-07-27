/**
 * llm-ping: preflight del benchmark del bot SDR.
 * Valida que las API keys de los 3 proveedores (Anthropic, OpenAI, Gemini)
 * estén configuradas, sean válidas y tengan crédito, con una llamada mínima
 * (1 token de salida) a cada uno. No expone las keys — solo status/latencia.
 *
 * Deploy: npx supabase functions deploy llm-ping --no-verify-jwt
 */

type PingResult = {
  ok: boolean;
  status?: number;
  latency_ms: number;
  error?: string;
};

async function ping(fn: () => Promise<Response>): Promise<PingResult> {
  const t0 = Date.now();
  try {
    const res = await fn();
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      latency_ms: Date.now() - t0,
      // El body de error de los proveedores no contiene la key; se trunca por higiene.
      error: res.ok ? undefined : body.slice(0, 300),
    };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: String(e).slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  // ?list_gemini=1 → lista los modelos Gemini disponibles para esta key
  // (util porque Google retira modelos para cuentas nuevas).
  const url = new URL(req.url);
  if (url.searchParams.get("list_gemini") === "1") {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "" },
    });
    const data = await res.json();
    const models = (data.models ?? [])
      .map((m: { name?: string }) => m.name)
      .filter((n: string) => n?.includes("flash") || n?.includes("pro"));
    return new Response(JSON.stringify({ status: res.status, models }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  }

  const [anthropic, openai, gemini] = await Promise.all([
    ping(() =>
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      })
    ),
    ping(() =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY") ?? ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      })
    ),
    ping(() =>
      fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      )
    ),
  ]);

  const results = { anthropic, openai, gemini };
  const allOk = Object.values(results).every((r) => r.ok);

  return new Response(JSON.stringify({ all_ok: allOk, results }, null, 2), {
    status: allOk ? 200 : 502,
    headers: { "content-type": "application/json" },
  });
});
