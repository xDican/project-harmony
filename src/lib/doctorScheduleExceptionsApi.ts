/**
 * doctorScheduleExceptionsApi — CRUD sobre `doctor_schedule_exceptions` +
 * chequeo de conflictos con citas existentes.
 *
 * Fase 2 del bloqueador de horario (origen: Wilmer). RLS cubre el envelope de
 * seguridad (doctor gestiona el suyo, admin/secretary cualquiera de su org).
 * El trigger `doctor_schedule_exceptions_conflict_check` (Fase 1) es la red de
 * seguridad atomica contra condiciones de carrera; `checkConflicts` de aqui es
 * el camino principal de UX — se corre ANTES del insert para mostrar al
 * usuario la lista legible de citas en conflicto (el trigger solo devuelve
 * UUIDs, no sirve para mostrar directo).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DoctorScheduleException =
  Database["public"]["Tables"]["doctor_schedule_exceptions"]["Row"];

const CANCELLED_STATUSES_FILTER = '("cancelled","canceled","cancelada")';

export interface ConflictingAppointment {
  id: string;
  patientName: string;
  appointmentAt: string;
  durationMinutes: number;
}

/**
 * Lista los bloqueos VIGENTES de un doctor (end_at aun no paso), mas proximo
 * primero. Los bloqueos vencidos no se borran (quedan en la tabla por si hace
 * falta auditarlos despues) pero se ocultan de esta lista — nadie quiere ver
 * bloqueos pasados acumulandose en la pantalla.
 */
export async function listExceptions(
  doctorId: string,
): Promise<DoctorScheduleException[]> {
  const { data, error } = await supabase
    .from("doctor_schedule_exceptions")
    .select("*")
    .eq("doctor_id", doctorId)
    .gte("end_at", new Date().toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los bloqueos: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Citas activas (no canceladas) del doctor que se solapan con [startAt, endAt).
 * Acota por appointment_at < endAt en la query; el filtro "termina despues de
 * startAt" (appointment_at + duration_minutes) se aplica en memoria porque
 * PostgREST no puede comparar contra una columna calculada.
 */
export async function checkConflicts(
  doctorId: string,
  startAt: string,
  endAt: string,
): Promise<ConflictingAppointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, appointment_at, duration_minutes, patients(name)")
    .eq("doctor_id", doctorId)
    .not("status", "in", CANCELLED_STATUSES_FILTER)
    .not("appointment_at", "is", null)
    .lt("appointment_at", endAt)
    .order("appointment_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron verificar conflictos: ${error.message}`);
  }

  const startMs = new Date(startAt).getTime();

  return (data ?? [])
    .filter((apt: any) => {
      const start = new Date(apt.appointment_at).getTime();
      const end = start + (apt.duration_minutes ?? 60) * 60000;
      return end > startMs;
    })
    .map((apt: any) => ({
      id: apt.id,
      patientName: apt.patients?.name ?? "Paciente",
      appointmentAt: apt.appointment_at,
      durationMinutes: apt.duration_minutes ?? 60,
    }));
}

/** Instante UTC -> dia calendario Honduras ('yyyy-MM-dd'), offset fijo -06:00
 *  (sin horario de verano, mismo criterio que toHondurasISO en
 *  NewScheduleExceptionModal.tsx). Correcto sin importar la zona horaria del
 *  navegador que ejecuta el codigo. */
function hondurasDateStr(isoInstant: string): string {
  const ms = new Date(isoInstant).getTime() - 6 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Dias de un mes (Honduras) que ya tienen al menos 1 cita activa del doctor.
 * Se usa en el modo "bloquear dia completo" del modal para deshabilitar esos
 * dias en el calendario ANTES de que el usuario intente el bloqueo — evitar
 * que tenga que "adivinar" y toparse con el error de conflicto recien al
 * confirmar. Distinto de `getAvailableDays` (que mide "cabe una cita nueva de
 * 30 min", relevante solo para el modo "por horas").
 */
export async function getDaysWithAppointments(
  doctorId: string,
  monthStart: string, // 'yyyy-MM-dd', primer dia del mes visible
  monthEnd: string, // 'yyyy-MM-dd', primer dia del mes siguiente (exclusivo)
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_at")
    .eq("doctor_id", doctorId)
    .not("status", "in", CANCELLED_STATUSES_FILTER)
    .not("appointment_at", "is", null)
    .gte("appointment_at", `${monthStart}T00:00:00-06:00`)
    .lt("appointment_at", `${monthEnd}T00:00:00-06:00`);

  if (error) {
    throw new Error(`No se pudo verificar citas del mes: ${error.message}`);
  }

  const days = new Set<string>();
  for (const apt of data ?? []) {
    if (apt.appointment_at) days.add(hondurasDateStr(apt.appointment_at));
  }
  return days;
}

export type CreateExceptionResult =
  | { success: true; exception: DoctorScheduleException }
  | { success: false; conflicts?: ConflictingAppointment[]; error: string };

/**
 * Crea un bloqueo. Rechaza ANTES del insert si hay citas en conflicto (camino
 * principal de UX, con lista legible). Si el trigger igual lo rechaza (carrera
 * genuina), devuelve un error generico — para eso ya corrio checkConflicts.
 */
export async function createException(
  doctorId: string,
  startAt: string,
  endAt: string,
  reason?: string,
): Promise<CreateExceptionResult> {
  const conflicts = await checkConflicts(doctorId, startAt, endAt);
  if (conflicts.length > 0) {
    return {
      success: false,
      conflicts,
      error: "Hay citas agendadas en ese rango, no se puede crear el bloqueo",
    };
  }

  const { data, error } = await supabase
    .from("doctor_schedule_exceptions")
    .insert({
      doctor_id: doctorId,
      start_at: startAt,
      end_at: endAt,
      reason: reason ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("DOCTOR_SCHEDULE_CONFLICT")) {
      return {
        success: false,
        error: "Hay citas agendadas en ese rango, no se pudo crear el bloqueo",
      };
    }
    return { success: false, error: `No se pudo crear el bloqueo: ${error.message}` };
  }

  return { success: true, exception: data };
}

/** Borra un bloqueo. Sin edicion — para cambiar fechas, borrar y crear otro. */
export async function deleteException(id: string): Promise<void> {
  const { error } = await supabase
    .from("doctor_schedule_exceptions")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`No se pudo borrar el bloqueo: ${error.message}`);
  }
}
