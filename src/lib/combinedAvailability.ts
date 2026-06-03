/**
 * combinedAvailability — disponibilidad combinada multi-profesional (Fase 4).
 *
 * Vista combinada para el agendamiento service-first de la asistente: en vez de
 * revisar el calendario de cada profesional a mano, se elige un SERVICIO y se ve
 * la union de la disponibilidad de todos los profesionales que saben hacerlo
 * (skill matrix `professional_services`). Al elegir una hora, el sistema
 * auto-asigna el profesional libre menos cargado (con opcion de cambiar).
 *
 * v1: combinacion del lado del cliente (fan-out) reusando las edge functions ya
 * probadas (`get-available-slots`/`get-available-days`). Para el ICP (1 doctor +
 * unas tecnicas) son pocas llamadas paralelas. Si escala, mover a una EF unica.
 *
 * Degradacion: si el servicio no tiene profesionales con skill declarado, se cae
 * a TODOS los doctores del org (no bloquea el agendamiento antes de configurar
 * skills).
 */

import { supabase } from "@/integrations/supabase/client";
import { getAvailableDays, getAvailableSlots } from "@/lib/api";

export interface QualifiedDoctor {
  id: string;
  name: string;
  prefix: string | null;
}

const CANCELLED = ["cancelada", "cancelled", "canceled"];

/** Etiqueta visible de un profesional ("Dra. Lizzy lopez"). */
export function doctorLabel(d: { prefix?: string | null; name: string }): string {
  return `${d.prefix ?? ""} ${d.name}`.trim();
}

/**
 * Profesionales que pueden ejecutar un servicio (skill matrix). Si ninguno tiene
 * el skill declarado, devuelve TODOS los doctores del org (degradacion).
 */
export async function getQualifiedDoctors(
  organizationId: string,
  serviceTypeId: string,
): Promise<QualifiedDoctor[]> {
  const { data: skills, error: skillErr } = await supabase
    .from("professional_services")
    .select("doctor_id")
    .eq("organization_id", organizationId)
    .eq("service_type_id", serviceTypeId)
    .eq("is_active", true);
  if (skillErr) throw skillErr;

  const skilledIds = (skills ?? []).map((s) => s.doctor_id);

  let query = supabase
    .from("doctors")
    .select("id, name, prefix")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  // Con skills declarados → solo esos; sin skills → todos (degradacion).
  if (skilledIds.length > 0) query = query.in("id", skilledIds);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as QualifiedDoctor[];
}

/**
 * Union de dias disponibles del mes entre varios profesionales. Un dia "trabaja"
 * si algun profesional trabaja; "canFit" si alguno tiene un hueco.
 */
export async function getCombinedDays(params: {
  doctors: QualifiedDoctor[];
  month: string;
  durationMinutes: number;
}): Promise<Record<string, { canFit: boolean; working: boolean }>> {
  const { doctors, month, durationMinutes } = params;

  const results = await Promise.allSettled(
    doctors.map((d) =>
      getAvailableDays({ doctorId: d.id, month, durationMinutes }),
    ),
  );

  const merged: Record<string, { canFit: boolean; working: boolean }> = {};
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const [date, info] of Object.entries(r.value)) {
      const prev = merged[date] ?? { canFit: false, working: false };
      merged[date] = {
        canFit: prev.canFit || info.canFit,
        working: prev.working || info.working,
      };
    }
  }
  return merged;
}

/** Un slot combinado: la hora y los profesionales libres en ella. */
export interface CombinedSlot {
  time: string;
  freeDoctorIds: string[];
}

/**
 * Union de slots de una fecha entre varios profesionales (resource-aware via
 * serviceTypeId). Cada slot lleva la lista de profesionales libres en esa hora.
 */
export async function getCombinedSlots(params: {
  doctors: QualifiedDoctor[];
  date: string;
  durationMinutes: number;
  serviceTypeId: string;
}): Promise<CombinedSlot[]> {
  const { doctors, date, durationMinutes, serviceTypeId } = params;

  const results = await Promise.allSettled(
    doctors.map((d) =>
      getAvailableSlots({
        doctorId: d.id,
        date,
        durationMinutes,
        serviceTypeId,
      }).then((slots) => ({ doctorId: d.id, slots })),
    ),
  );

  const byTime = new Map<string, string[]>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const time of r.value.slots) {
      if (!byTime.has(time)) byTime.set(time, []);
      byTime.get(time)!.push(r.value.doctorId);
    }
  }

  return Array.from(byTime.entries())
    .map(([time, freeDoctorIds]) => ({ time, freeDoctorIds }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Conteo de citas por doctor en una fecha (para auto-asignar al menos cargado).
 * Devuelve 0 para doctores sin citas.
 */
export async function getDoctorLoadForDate(params: {
  organizationId: string;
  date: string;
  doctorIds: string[];
}): Promise<Record<string, number>> {
  const { organizationId, date, doctorIds } = params;
  const load: Record<string, number> = {};
  for (const id of doctorIds) load[id] = 0;
  if (doctorIds.length === 0) return load;

  const { data, error } = await supabase
    .from("appointments")
    .select("doctor_id")
    .eq("organization_id", organizationId)
    .eq("date", date)
    .in("doctor_id", doctorIds)
    .not("status", "in", `(${CANCELLED.join(",")})`);
  if (error) throw error;

  for (const row of data ?? []) {
    load[row.doctor_id] = (load[row.doctor_id] ?? 0) + 1;
  }
  return load;
}

/**
 * Elige el profesional libre menos cargado de un slot. Empate → orden recibido
 * (la lista de doctores viene ordenada por nombre, asi que es determinista).
 */
export function pickLeastLoaded(
  freeDoctorIds: string[],
  load: Record<string, number>,
): string | null {
  if (freeDoctorIds.length === 0) return null;
  let best = freeDoctorIds[0];
  for (const id of freeDoctorIds) {
    if ((load[id] ?? 0) < (load[best] ?? 0)) best = id;
  }
  return best;
}
