import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  loadVisitRangeState,
  resolveVisitContext,
  visitStartCandidates,
  isDoctorFree,
  isResourceCapacityOk,
  serviceBuffer,
  AVAILABILITY_TIMEZONE,
  type VisitDayState,
  type ResolvedProcedure,
} from "../_shared/availability.ts";

const BUILD = "get-visit-days@2026-06-05_par1";

// Es a get-visit-slots lo que get-available-days es a get-available-slots: dado un
// rango de dias (el week-strip de la UI), devuelve por dia si admite al menos un
// inicio de visita factible (back-to-back, resource-aware) para tachar los que no.
// Una sola llamada (datos batcheados por rango) en vez de N llamadas a get-visit-slots.
const reqSchema = z.object({
  organizationId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(31).optional().default(14),
  procedures: z.array(z.object({
    serviceTypeId: z.string().uuid(),
    durationMinutes: z.number().int().min(5).max(480).optional(),
  })).min(1).max(8),
});

/** ¿El dia admite al menos un inicio donde TODA la cadena cabe? Greedy con early-exit. */
function dayHasFeasibleStart(state: VisitDayState, procResolved: ResolvedProcedure[]): boolean {
  const granularity = Math.min(procResolved[0].durationMinutes, 30);
  const candidates = visitStartCandidates(state, procResolved[0].qualified, granularity);

  for (const T of candidates) {
    let cum = 0;
    let ok = true;
    for (const p of procResolved) {
      const pStart = T + cum;
      const clinicalEnd = pStart + p.durationMinutes * 60000;
      const footEnd = clinicalEnd + serviceBuffer(state, p.serviceTypeId) * 60000;
      if (!isResourceCapacityOk(state, p.serviceTypeId, pStart, footEnd)) { ok = false; break; }
      const free = p.qualified.filter((d) => isDoctorFree(state, d, pStart, clinicalEnd, footEnd));
      if (free.length === 0) { ok = false; break; }
      cum += p.durationMinutes * 60000;
    }
    if (ok) return true; // basta uno
  }
  return false;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth: mismo patron que get-visit-slots / get-available-slots (lectura de
    // disponibilidad). El JWT lo valida el gateway; aqui exigimos el header y usamos
    // service-role para cruzar calendarios/recursos (RLS no aplica al motor).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { ok: false, error: "Missing Authorization header", build: BUILD });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const parsed = reqSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(400, { ok: false, error: "Validation failed", details: parsed.error.errors, build: BUILD });
    }
    const { organizationId, startDate, days, procedures } = parsed.data;

    // Servicios + profesionales calificados (compartido con get-visit-slots).
    const ctx = await resolveVisitContext(supabase, organizationId, procedures);
    if (ctx.fatal) return jsonResponse(ctx.fatal.status, { ok: false, error: ctx.fatal.error, build: BUILD });
    // Un servicio sin profesionales → ningun dia es factible (no es error).
    if (ctx.emptyReason) {
      return jsonResponse(200, { ok: true, days: {}, reason: ctx.emptyReason, build: BUILD });
    }
    const { procResolved, distinctSvcIds, allDoctorIds } = ctx;

    // Lista de fechas del rango (zona Honduras, consistente con el resto del motor).
    const start = DateTime.fromISO(startDate, { zone: AVAILABILITY_TIMEZONE });
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(start.plus({ days: i }).toFormat("yyyy-MM-dd"));
    }

    // Estado batcheado del rango (pocas queries fijas).
    const rangeState = await loadVisitRangeState(supabase, {
      organizationId,
      dates,
      doctorIds: allDoctorIds,
      serviceTypeIds: distinctSvcIds,
    });

    // Por dia: working = algun profesional del 1er procedimiento tiene horario ese dia;
    // canFit = existe un inicio donde toda la cadena cabe.
    const firstQualified = procResolved[0].qualified;
    const daysOut: Record<string, { working: boolean; canFit: boolean }> = {};
    for (const date of dates) {
      const state = rangeState.get(date);
      if (!state) { daysOut[date] = { working: false, canFit: false }; continue; }
      const working = firstQualified.some((d) => (state.windowsByDoctor.get(d)?.length ?? 0) > 0);
      const canFit = working ? dayHasFeasibleStart(state, procResolved) : false;
      daysOut[date] = { working, canFit };
    }

    return jsonResponse(200, { ok: true, days: daysOut, build: BUILD });
  } catch (error) {
    console.error("[get-visit-days] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Error interno del servidor", details: msg, build: BUILD });
  }
});
