import { supabase } from "./supabaseClient";
import type { Appointment, AppointmentStatus } from "../types/appointment";
import type { Patient } from "../types/patient";
import type { Doctor, Specialty } from "../types/doctor";
import type { AppointmentWithDetails } from "./api";
import type { CurrentUser } from "../types/user";
import type { WeekSchedule, Slot } from "../types/schedule";
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

async function fetchAppointmentWithRelations(row: any): Promise<AppointmentWithDetails> {
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
// User with relations interface
// --------------------------
export interface UserWithRelations {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  doctor?: {
    id: string;
    name: string;
    phone: string | null;
    specialtyId: string | null;
    specialtyName?: string;
  };
  secretary?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

// --------------------------
// Get all users with doctor and specialty info
// --------------------------
export async function getAllUsers(): Promise<UserWithRelations[]> {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      email,
      role,
      created_at,
      doctor:doctor_id (
        id,
        name,
        phone,
        specialty_id,
        specialty:specialty_id (
          name
        )
      ),
      secretary:secretary_id (
        id,
        name,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getAllUsers:", error);
    throw error;
  }

  return (data as any[]).map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    doctor: user.doctor ? {
      id: user.doctor.id,
      name: user.doctor.name,
      phone: user.doctor.phone,
      specialtyId: user.doctor.specialty_id,
      specialtyName: user.doctor.specialty?.name,
    } : undefined,
    secretary: user.secretary ? {
      id: user.secretary.id,
      name: user.secretary.name,
      phone: user.secretary.phone,
    } : undefined,
  }));
}

// --------------------------
// 1. getTodayAppointments
// --------------------------
export async function getTodayAppointments(date: string): Promise<AppointmentWithDetails[]> {
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

  return Promise.all((data as any[]).map(fetchAppointmentWithRelations));
}

// --------------------------
// 2. getTodayAppointmentsByDoctor
// --------------------------
export async function getTodayAppointmentsByDoctor(doctorId: string, date: string): Promise<AppointmentWithDetails[]> {
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

  return Promise.all((data as any[]).map(fetchAppointmentWithRelations));
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
  try {
    // Llamar a la Edge Function create-appointment
    const { data, error } = await supabase.functions.invoke('create-appointment', {
      body: {
        doctorId: input.doctorId,
        patientId: input.patientId,
        date: input.date,
        time: input.time,
        notes: input.notes,
      },
    });

    if (error) {
      console.error('Error calling create-appointment edge function:', error);
      throw new Error(error.message || 'Error al crear la cita');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.success || !data?.appointment) {
      throw new Error('Respuesta inválida del servidor');
    }

    return mapAppointment(data.appointment);
  } catch (error: any) {
    console.error('Error createAppointment:', error);
    throw error;
  }
}

// --------------------------
// 5. getAvailableSlots
// --------------------------
/**
 * Obtiene los slots disponibles de un doctor en una fecha llamando a la Edge Function
 */
export async function getAvailableSlots(params: { doctorId: string; date: string }): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('get-available-slots', {
    body: {
      doctorId: params.doctorId,
      date: params.date,
    },
  });

  if (error) {
    console.error('Error calling get-available-slots:', error);
    throw new Error(error.message || 'Error fetching available slots');
  }

  return data?.slots || [];
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
// 11b. searchDoctors
// --------------------------
export async function searchDoctors(query: string): Promise<Doctor[]> {
  // Busca por nombre de doctor o nombre de especialidad
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      *,
      specialty:specialty_id (
        id, name
      )
    `)
    .or(`name.ilike.%${query}%`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error searchDoctors:", error);
    throw error;
  }

  // También buscar por nombre de especialidad
  const { data: specialtyData, error: specialtyError } = await supabase
    .from("specialties")
    .select("id")
    .ilike("name", `%${query}%`);

  if (specialtyError) {
    console.error("Error searching specialties:", specialtyError);
  }

  const specialtyIds = specialtyData?.map(s => s.id) || [];

  // Si hay especialidades que coinciden, buscar doctores con esas especialidades
  if (specialtyIds.length > 0) {
    const { data: doctorsBySpecialty, error: doctorError } = await supabase
      .from("doctors")
      .select(`
        *,
        specialty:specialty_id (
          id, name
        )
      `)
      .in("specialty_id", specialtyIds)
      .order("name", { ascending: true });

    if (doctorError) {
      console.error("Error searching doctors by specialty:", doctorError);
    } else if (doctorsBySpecialty) {
      // Combinar resultados y eliminar duplicados
      const allDoctors = [...(data || []), ...doctorsBySpecialty];
      const uniqueDoctors = Array.from(
        new Map(allDoctors.map(d => [d.id, d])).values()
      );
      
      return uniqueDoctors.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email ?? undefined,
        specialtyId: row.specialty_id,
        specialtyName: row.specialty?.name,
        createdAt: row.created_at,
      }));
    }
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    specialtyId: row.specialty_id,
    specialtyName: row.specialty?.name,
    createdAt: row.created_at,
  }));
}

// --------------------------
// 12. getCurrentUserWithRole
// --------------------------
export async function getCurrentUserWithRole(): Promise<CurrentUser | null> {
  // 1. Obtener el usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Error getCurrentUserWithRole:auth", authError);
    return null;
  }

  // 2. Consultar la tabla public.users
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error getCurrentUserWithRole:users", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // 3. Mapear a CurrentUser
  return {
    id: data.id,
    email: data.email,
    role: data.role as CurrentUser["role"],
    doctorId: data.doctor_id ?? null,
  };
}

// --------------------------
// 13. createUserWithRole
// --------------------------
/**
 * Create a new user with a specific role
 * This calls a Supabase Edge Function to handle user creation with admin privileges
 */
export async function createUserWithRole(input: {
  email: string;
  password: string;
  role: string;
  specialtyId?: string;
  fullName?: string;
  phone?: string;
  prefix?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Get the current session to include the JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('No active session');
    }

    // Call the edge function
    const response = await fetch(
      `https://soxrlxvivuplezssgssq.supabase.co/functions/v1/create-user-with-role`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(input),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    return data;
  } catch (error: any) {
    console.error('[API] Error creating user with role:', error);
    throw error;
  }
}

// --------------------------
// Export helpers for testing or internal use
// --------------------------
export const __test_helpers = {
  dbStatusToAppStatus,
  appStatusToDbStatus,
  mapAppointment,
};

// --------------------------
// 16. Get User By ID
// --------------------------
export async function getUserById(userId: string): Promise<UserWithRelations | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      role,
      created_at,
      doctor:doctor_id (
        id,
        name,
        phone,
        specialty_id,
        specialty:specialty_id (
          name
        )
      ),
      secretary:secretary_id (
        id,
        name,
        phone
      )
    `)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getUserById] Error:', error);
    throw new Error('Error al cargar el usuario');
  }

  if (!data) {
    return null;
  }

  // Handle doctor data - it may come as array or null
  const doctorData: any = Array.isArray(data.doctor) ? data.doctor[0] : data.doctor;
  const secretaryData: any = Array.isArray(data.secretary) ? data.secretary[0] : data.secretary;
  
  // Transform the data to match UserWithRelations interface
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    createdAt: data.created_at,
    doctor: doctorData ? {
      id: doctorData.id,
      name: doctorData.name,
      phone: doctorData.phone,
      specialtyId: doctorData.specialty_id,
      specialtyName: Array.isArray(doctorData.specialty) && doctorData.specialty.length > 0 
        ? doctorData.specialty[0].name 
        : undefined,
    } : undefined,
    secretary: secretaryData ? {
      id: secretaryData.id,
      name: secretaryData.name,
      phone: secretaryData.phone,
    } : undefined,
  };
}

// --------------------------
// 17. Update User
// --------------------------
export async function updateUser(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    specialtyId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // First, get the user to check their role and related IDs
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, doctor_id, secretary_id')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !userData) {
    console.error('[updateUser] Error fetching user:', userError);
    return { success: false, error: 'Usuario no encontrado' };
  }

  // If user is a doctor, update via edge function
  if (userData.role === 'doctor' && userData.doctor_id) {
    try {
      const { data: updateResult, error: functionError } = await supabase.functions.invoke('update-doctor', {
        body: {
          doctorId: userData.doctor_id,
          name: data.name,
          phone: data.phone,
          specialtyId: data.specialtyId,
        },
      });

      if (functionError) {
        console.error('[updateUser] Error calling update-doctor:', functionError);
        return { success: false, error: functionError.message || 'Error al actualizar el doctor' };
      }

      if (updateResult?.error) {
        console.error('[updateUser] Error from update-doctor:', updateResult.error);
        return { success: false, error: updateResult.error };
      }

      if (!updateResult?.success) {
        return { success: false, error: 'Error al actualizar el doctor' };
      }
    } catch (err: any) {
      console.error('[updateUser] Exception calling update-doctor:', err);
      return { success: false, error: err.message || 'Error al actualizar el doctor' };
    }
  }

  // If user is a secretary, update the secretary record
  if (userData.role === 'secretary' && userData.secretary_id) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const { error: secretaryError } = await supabase
      .from('secretaries')
      .update(updateData)
      .eq('id', userData.secretary_id);

    if (secretaryError) {
      console.error('[updateUser] Error updating secretary:', secretaryError);
      return { success: false, error: 'Error al actualizar la secretaria' };
    }
  }

  // For admin role, we don't have a separate table yet
  // Just return success for now

  return { success: true };
}

/**
 * Mapeo de nombres de días a números (0-6)
 * Alineado con JavaScript Date.getDay() y la BD
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * 
 * Este mapeo se usa consistentemente en:
 * - get-available-slots Edge Function
 * - upsert-doctor-schedules Edge Function
 * - Columna day_of_week en la tabla doctor_schedules
 */
const DAY_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Convierte WeekSchedule a formato plano para la base de datos
 * Transforma el objeto con claves por día a un array de registros individuales
 * con day_of_week numérico (0-6).
 * 
 * @param weekSchedule - Horarios organizados por día (keys: "sunday", "monday", etc.)
 * @returns Array de objetos con day_of_week, start_time, end_time
 */
function flattenWeekSchedule(weekSchedule: WeekSchedule): Array<{
  day_of_week: number;
  start_time: string;
  end_time: string;
}> {
  const schedules: Array<{ day_of_week: number; start_time: string; end_time: string }> = [];

  for (const [dayKey, slots] of Object.entries(weekSchedule)) {
    const dayLower = dayKey.toLowerCase();
    const dayOfWeek = DAY_TO_NUMBER[dayLower];

    if (dayOfWeek === undefined) {
      console.warn(`[flattenWeekSchedule] Unknown day key: ${dayKey}`);
      continue;
    }

    for (const slot of slots) {
      schedules.push({
        day_of_week: dayOfWeek,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
    }
  }

  return schedules;
}

/**
 * Update doctor's weekly schedules
 * Invoca la Edge Function 'upsert-doctor-schedules' que valida y actualiza los horarios.
 * Sobrescribe completamente los horarios del doctor.
 * Lanza una excepción en caso de error, siguiendo el patrón void para operaciones de escritura.
 * 
 * @param doctorId - ID del doctor
 * @param weekSchedule - Horarios semanales organizados por día (keys: "sunday", "monday", etc.)
 * @throws Error si la actualización falla o la validación no pasa
 */
export async function updateDoctorSchedules(
  doctorId: string,
  weekSchedule: WeekSchedule
): Promise<void> {
  // Convertir weekSchedule a formato de BD
  const schedules = flattenWeekSchedule(weekSchedule);

  // Llamar a la Edge Function
  const { data, error } = await supabase.functions.invoke('upsert-doctor-schedules', {
    body: {
      doctorId,
      schedules,
    },
  });

  if (error) {
    console.error('[updateDoctorSchedules] Edge Function error:', error);
    throw new Error(error.message || 'Error al actualizar los horarios del doctor');
  }

  // Validar respuesta: debe tener success: true
  if (!data?.success) {
    console.error('[updateDoctorSchedules] Edge Function returned failure:', data);
    throw new Error(data?.error || 'Error al guardar horarios');
  }
}

