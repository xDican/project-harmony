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
} from "../_shared/availability.ts";

const BUILD = "get-visit-slots@2026-06-03_motor_fase5_v1";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { ok: false, error: "Missing Authorization header", build: BUILD });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) return jsonResponse(401, { ok: false, error: "Unauthorized", build: BUILD });

    const body = await req.json();
    const parsed = reqSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(400, { ok: false, error: "Validation failed", details: parsed.error.errors, build: BUILD });
    }
    const { organizationId, date, procedures } = parsed.data;

    // Resolver duracion + servicios. duration: la del request o la del service_types.
    const distinctSvcIds = [...new Set(procedures.map((p) => p.serviceTypeId))];
    const { data: svcRows, error: svcErr } = await supabase
      .from("service_types")
      .select("id, display_name, duration_minutes, organization_id")
      .in("id", distinctSvcIds);
    if (svcErr) return jsonResponse(500, { ok: false, error: "Error cargando servicios", details: svcErr.message, build: BUILD });
    const svcById = new Map((svcRows ?? []).map((s: any) => [s.id, s]));
    for (const id of distinctSvcIds) {
      const s = svcById.get(id);
      if (!s || s.organization_id !== organizationId) {
        return jsonResponse(400, { ok: false, error: "Un servicio no pertenece a esta organizacion", build: BUILD });
      }
    }

    // Profesionales calificados por servicio (skill matrix + fallback a todos los del org)
    const { data: orgDoctors, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, prefix, user_id")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    if (docErr) return jsonResponse(500, { ok: false, error: "Error cargando profesionales", details: docErr.message, build: BUILD });
    const allDoctors = (orgDoctors ?? []) as Array<any>;
    const docInfo = new Map(allDoctors.map((d) => [d.id, d]));

    const { data: skillRows } = await supabase
      .from("professional_services")
      .select("doctor_id, service_type_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("service_type_id", distinctSvcIds);
    const skilledBySvc = new Map<string, string[]>();
    for (const s of skillRows ?? []) {
      const r = s as any;
      if (!skilledBySvc.has(r.service_type_id)) skilledBySvc.set(r.service_type_id, []);
      skilledBySvc.get(r.service_type_id)!.push(r.doctor_id);
    }
    // qualified[svcId] = lista ordenada por nombre (determinista)
    const qualifiedBySvc = new Map<string, string[]>();
    for (const id of distinctSvcIds) {
      const skilled = skilledBySvc.get(id);
      const ids = (skilled && skilled.length > 0)
        ? allDoctors.filter((d) => skilled.includes(d.id)).map((d) => d.id)
        : allDoctors.map((d) => d.id);
      qualifiedBySvc.set(id, ids);
    }

    // Resolver duracion final por procedimiento + validar que cada servicio tenga calificados
    const procResolved = procedures.map((p) => ({
      serviceTypeId: p.serviceTypeId,
      durationMinutes: p.durationMinutes ?? (svcById.get(p.serviceTypeId)?.duration_minutes ?? 30),
      qualified: qualifiedBySvc.get(p.serviceTypeId) ?? [],
    }));
    for (const p of procResolved) {
      if (p.qualified.length === 0) {
        const name = svcById.get(p.serviceTypeId)?.display_name ?? "un servicio";
        return jsonResponse(200, { ok: true, slots: [], reason: `No hay profesionales que ofrezcan "${name}".`, build: BUILD });
      }
    }

    // Estado del dia (citas externas) batcheado una vez
    const allDoctorIds = [...new Set(procResolved.flatMap((p) => p.qualified))];
    const state = await loadVisitDayState(supabase, {
      organizationId,
      date,
      doctorIds: allDoctorIds,
      serviceTypeIds: distinctSvcIds,
    });

    // Carga por doctor en la fecha (para asignar el menos cargado)
    const doctorLoad: Record<string, number> = {};
    for (const id of allDoctorIds) doctorLoad[id] = 0;
    const { data: loadRows } = await supabase
      .from("appointments")
      .select("doctor_id")
      .eq("organization_id", organizationId)
      .eq("date", date)
      .in("doctor_id", allDoctorIds)
      .not("status", "in", '("cancelled","canceled","cancelada")');
    for (const r of loadRows ?? []) {
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

    // Diccionario de profesionales para la UI (label)
    const doctorsDict: Record<string, { name: string; prefix: string | null; label: string; isTecnica: boolean }> = {};
    for (const id of allDoctorIds) {
      const d = docInfo.get(id);
      if (!d) continue;
      doctorsDict[id] = {
        name: d.name,
        prefix: d.prefix ?? null,
        label: `${d.prefix ?? ""} ${d.name}`.trim(),
        isTecnica: !d.user_id,
      };
    }

    return jsonResponse(200, { ok: true, slots, doctors: doctorsDict, build: BUILD });
  } catch (error) {
    console.error("[get-visit-slots] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Error interno del servidor", details: msg, build: BUILD });
  }
});
