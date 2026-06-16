import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  loadVisitDayState,
  isDoctorFree,
  isResourceCapacityOk,
  serviceBuffer,
  msToHHMM,
  visitStartCandidates,
  resolveVisitContext,
} from "../_shared/availability.ts";

const BUILD = "get-visit-slots@2026-06-16_peakcap";
const MAX_SLOTS = 40; // cap de inicios devueltos (UX + payload)

const reqSchema = z.object({
  organizationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  procedures: z.array(z.object({
    serviceTypeId: z.string().uuid(),
    durationMinutes: z.number().int().min(5).max(480).optional(),
  })).min(1).max(8),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth: mismo patron que get-available-slots (funcion de solo-lectura de
    // disponibilidad). La validacion real del JWT la hace el gateway (verify_jwt);
    // aqui solo exigimos el header presente y usamos service-role para cruzar
    // calendarios/recursos (RLS no aplica al motor). NO usamos getUser (la 2.39.0
    // no valida el header global como la 2.83.0 -> daba 401 falso).
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
    const { organizationId, date, procedures } = parsed.data;

    // Resolver servicios + profesionales calificados (compartido con get-visit-days
    // para que strip y slots no diverjan).
    const ctx = await resolveVisitContext(supabase, organizationId, procedures);
    if (ctx.fatal) return jsonResponse(ctx.fatal.status, { ok: false, error: ctx.fatal.error, build: BUILD });
    if (ctx.emptyReason) return jsonResponse(200, { ok: true, slots: [], reason: ctx.emptyReason, build: BUILD });
    const { procResolved, distinctSvcIds, svcById, allDoctorIds, doctorsDict } = ctx;

    // Estado del dia (citas externas) batcheado + carga por doctor (para asignar el
    // menos cargado) en paralelo: la query de carga no depende de `state`. Init de
    // doctorLoad en orden de allDoctorIds (sin cambio de output).
    const [state, loadRes] = await Promise.all([
      loadVisitDayState(supabase, {
        organizationId,
        date,
        doctorIds: allDoctorIds,
        serviceTypeIds: distinctSvcIds,
      }),
      supabase
        .from("appointments")
        .select("doctor_id")
        .eq("organization_id", organizationId)
        .eq("date", date)
        .in("doctor_id", allDoctorIds)
        .not("status", "in", '("cancelled","canceled","cancelada")'),
    ]);

    const doctorLoad: Record<string, number> = {};
    for (const id of allDoctorIds) doctorLoad[id] = 0;
    for (const r of loadRes.data ?? []) {
      const id = (r as any).doctor_id;
      doctorLoad[id] = (doctorLoad[id] ?? 0) + 1;
    }
    const pickLeastLoaded = (freeIds: string[]): string | null => {
      if (freeIds.length === 0) return null;
      let best = freeIds[0];
      for (const id of freeIds) if ((doctorLoad[id] ?? 0) < (doctorLoad[best] ?? 0)) best = id;
      return best;
    };

    // Greedy: para cada inicio candidato T, encadenar back-to-back los procedimientos
    const granularity = Math.min(procResolved[0].durationMinutes, 30);
    const candidates = visitStartCandidates(state, procResolved[0].qualified, granularity);

    const slots: Array<any> = [];
    for (const T of candidates) {
      let cum = 0;
      const chain: Array<any> = [];
      let ok = true;
      for (const p of procResolved) {
        const pStart = T + cum;
        const clinicalEnd = pStart + p.durationMinutes * 60000;
        const footEnd = clinicalEnd + serviceBuffer(state, p.serviceTypeId) * 60000;

        if (!isResourceCapacityOk(state, p.serviceTypeId, pStart, footEnd)) { ok = false; break; }
        const free = p.qualified.filter((d) => isDoctorFree(state, d, pStart, clinicalEnd, footEnd));
        if (free.length === 0) { ok = false; break; }

        chain.push({
          serviceTypeId: p.serviceTypeId,
          serviceName: svcById.get(p.serviceTypeId)?.display_name ?? null,
          start: msToHHMM(pStart),
          end: msToHHMM(clinicalEnd),
          durationMinutes: p.durationMinutes,
          freeDoctorIds: free,
          suggestedDoctorId: pickLeastLoaded(free),
        });
        cum += p.durationMinutes * 60000;
      }
      if (ok) {
        slots.push({ start: msToHHMM(T), procedures: chain });
        if (slots.length >= MAX_SLOTS) break;
      }
    }

    return jsonResponse(200, { ok: true, slots, doctors: doctorsDict, build: BUILD });
  } catch (error) {
    console.error("[get-visit-slots] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Error interno del servidor", details: msg, build: BUILD });
  }
});
