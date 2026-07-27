-- Bot SDR híbrido — Fase 2b: cap de presupuesto LLM mensual por organización.
-- Preocupación explícita de Diego (24 Jul): si un cliente escala sus ads 5-10x,
-- el costo LLM crece lineal con ingreso plano. Patrón daily_message_cap existente.
-- Al exceder: el bot cae al flujo clásico de menús (gratis) — nunca queda mudo.
-- Default $10 ≈ 4x el consumo proyectado del piloto (Hanoy ~$2.6/mes).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS llm_monthly_budget_usd NUMERIC NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.organizations.llm_monthly_budget_usd IS
  'Presupuesto mensual (USD) de llamadas LLM del bot SDR. Se compara contra la suma de tokens del mes en llm_call_logs valuada con MODEL_PRICING (_shared/llm.ts). Excedido => fallback al bot clásico de menús.';
