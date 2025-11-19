import { supabase } from "./supabaseClient";
import type { Appointment, AppointmentStatus, AppointmentWithRelations } from "../types/appointment";
import type { Patient } from "../types/patient";
import type { Doctor } from "../types/doctor";
import type { Specialty } from "../types/specialty";
import { DateTime } from "luxon";

// --------------------------
// Status mapping helpers
// --------------------------
function dbStatusToAppStatus(dbStatus: string): AppointmentStatus {
  if (dbStatus === "cancelled") return "canceled";
  return dbStatus as AppointmentStatus;
}

function appStatusToDbStatus(appStatus: AppointmentStatus): string {
  if (appStatus === "canceled") return "cancelled";
  return appStatus;
}

// --------------------------
// Helper: Map DB appointment to frontend
// --------------------------
function mapAppointment(appointment: any): Appointment {
  return {
    id: appointment.id,
    doctorId: appointment.doctor_id,
    patientId: appointment.patient_id,
    date: appointment.date,
    time: appointment.time,
    status: dbStatusToAppStatus(appointment.status),
    notes: appointment.notes ?? undefined,
    // ...otros campos si aplica
  };
}

async function fetchAppointmentWithRelations(row: any): Promise<AppointmentWithRelations> {
  return {
    ...mapAppointment(row),
    patient: {
      id: row.patient?.id,
      name: row.patient?.name,
      phone: row.patient?.phone,
      email: row.patient?.email,
      notes: row.patient?.notes ?? undefined,
      createdAt: row.patient?.created_at,
    },
    doctor: {
      id: row.doctor?.id,
      name: row.doctor?.name,
      phone: row.doctor?.phone,
      email: row.doctor?.email,
      specialtyId: row.doctor?.specialty_id,
      createdAt: row.doctor?.created_at,
    },
  };
}

// --------------------------
// 1. getTodayAppointments
// --------------------------
export async function getTodayAppointments(date: string): Promise<AppointmentWithRelations[]> {
  // Carga las citas del día con relations anidadas (doctor, patient)
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      doctor:doctor_id (
        id, name, phone, email, specialty_id, created_at
      ),
      patient:patient_id (
        id, name, phone, email, notes, created_at
      )
      `
    )
    .eq("date", date)
    .order("time", { ascending: true });

  if (error) {
    console.error("Error getTodayAppointments:", error);
    throw error;
  }

  return (data as any[]).map(fetchAppointmentWithRelations);
}

// --------------------------
// 2. getTodayAppointmentsByDoctor
// --------------------------
export async function getTodayAppointmentsByDoctor(doctorId: string, date: string): Promise<AppointmentWithRelations[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      doctor:doctor_id (
        id, name, phone, email, specialty_id, created_at
      ),
      patient:patient_id (
        id, name, phone, email, notes, created_at
      )
      `
    )
    .eq("date", date)
    .eq("doctor_id", doctorId)
    .order("time", { ascending: true });

  if (error) {
    console.error("Error getTodayAppointmentsByDoctor:", error);
    throw error;
  }

  return (data as any[]).map(fetchAppointmentWithRelations);
}

// --------------------------
// 3. updateAppointmentStatus
// --------------------------
export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
  const dbStatus = appStatusToDbStatus(status);
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: dbStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updateAppointmentStatus:", error);
    throw error;
  }

  return mapAppointment(data);
}

// --------------------------
// 4. createAppointment
// --------------------------
export async function createAppointment(input: {
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  notes?: string;
  status?: AppointmentStatus;
}): Promise<Appointment> {
  const dbStatus = input.status ? appStatusToDbStatus(input.status) : "pending";

  const { data, error } = await supabase
    .from("appointments")
    .insert([
      {
        doctor_id: input.doctorId,
        patient_id: input.patientId,
        date: input.date,
        time: input.time,
        status: dbStatus,
        notes: input.notes,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error createAppointment:", error);
    throw error;
  }

  return mapAppointment(data);
}

// --------------------------
// 5. getAvailableSlots
// --------------------------
/**
 * Obtiene los slots disponibles de un doctor en una fecha:
 * - Genera slots de 30min desde el horario de doctor_schedules para ese día.
 * - Excluye aquellos ya reservados en appointments (que no están canceladas).
 */
export async function getAvailableSlots(doctorId: string, dateStr: string): Promise<string[]> {
  const date = DateTime.fromISO(dateStr, { zone: "utc" });

  // 1. Busca el/los horarios disponibles para ese doctor y ese día
  const dayOfWeek = date.weekday; // 1 (lunes) - 7 (domingo)
  const { data: schedules, error: scheduleError } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek);

  if (scheduleError) {
    console.error("Error getAvailableSlots:schedules", scheduleError);
    throw scheduleError;
  }

  if (!schedules || schedules.length === 0) return [];

  // Asumimos un solo bloque horario por día
  const slots: string[] = [];
  for (const sched of schedules) {
    // 2. Genera intervalos de 30min entre start_time y end_time
    let start = DateTime.fromISO(`${dateStr}T${sched.start_time}`);
    const end = DateTime.fromISO(`${dateStr}T${sched.end_time}`);
    while (start < end) {
      slots.push(start.toFormat("HH:mm"));
      start = start.plus({ minutes: 30 });
    }
  }

  // 3. Busca citas ya agendadas para ese doctor en esa fecha (que no estén canceladas)
  const { data: appointments, error: apptErr } = await supabase
    .from("appointments")
    .select("time, status")
    .eq("doctor_id", doctorId)
    .eq("date", dateStr)
    .not("status", "eq", "cancelled");

  if (apptErr) {
    console.error("Error getAvailableSlots:appointments", apptErr);
    throw apptErr;
  }

  const takenTimes = (appointments || []).map(a => a.time);

  // 4. Excluye slots ocupados
  const availableSlots = slots.filter(slot => !takenTimes.includes(slot));

  return availableSlots;
}

// --------------------------
// 6. searchPatients
// --------------------------
export async function searchPatients(query: string): Promise<Patient[]> {
  // Busca por name o phone (simple LIKE)
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error searchPatients:", error);
    throw error;
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));
}

// --------------------------
// 7. getAllPatients
// --------------------------
export async function getAllPatients(): Promise<Patient[]> {
  const { data, error } = await supabase.from("patients").select("*").order("name", { ascending: true });

  if (error) {
    console.error("Error getAllPatients:", error);
    throw error;
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));
}

// --------------------------
// 8. createPatient
// --------------------------
export async function createPatient(input: { name: string; phone: string; email?: string; notes?: string }): Promise<Patient> {
  const { name, phone, email, notes } = input;
  const { data, error } = await supabase
    .from("patients")
    .insert([
      {
        name,
        phone,
        email,
        notes,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error createPatient:", error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: data.created_at,
  };
}

// --------------------------
// 9. getSpecialties
// --------------------------
export async function getSpecialties(): Promise<Specialty[]> {
  const { data, error } = await supabase.from("specialties").select("*").order("name", { ascending: true });

  if (error) {
    console.error("Error getSpecialties:", error);
    throw error;
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  }));
}

// --------------------------
// 10. getDoctorsBySpecialty
// --------------------------
export async function getDoctorsBySpecialty(specialtyId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("specialty_id", specialtyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error getDoctorsBySpecialty:", error);
    throw error;
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    specialtyId: row.specialty_id,
    createdAt: row.created_at,
  }));
}

// --------------------------
// 11. getDoctors
// --------------------------
export async function getDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase.from("doctors").select("*").order("name", { ascending: true });

  if (error) {
    console.error("Error getDoctors:", error);
    throw error;
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    specialtyId: row.specialty_id,
    createdAt: row.created_at,
  }));
}

// --------------------------
// Export helpers for testing or internal use
// --------------------------
export const __test_helpers = {
  dbStatusToAppStatus,
  appStatusToDbStatus,
  mapAppointment,
};
