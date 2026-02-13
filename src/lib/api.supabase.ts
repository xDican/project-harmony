import { supabase } from "./supabaseClient";
import type { Appointment, AppointmentStatus } from "../types/appointment";
import type { Patient } from "../types/patient";
import type { Doctor, Specialty } from "../types/doctor";
import type { AppointmentWithDetails } from "./api";
import type { CurrentUser, OrgMembership } from "../types/user";
import type { Organization, Clinic, CalendarEntry, WhatsAppLine } from "../types/organization";
import type { WeekSchedule, Slot } from "../types/schedule";
import { DateTime } from "luxon";

// --------------------------
// Helper: Get active organization ID from current user session
// Caches the org ID per session to avoid repeated queries
// --------------------------
let _cachedOrgId: string | null = null;
let _cachedUserId: string | null = null;

async function getActiveOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Return cached if same user
  if (_cachedUserId === user.id && _cachedOrgId) return _cachedOrgId;

  const { data, error } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn("[getActiveOrganizationId] Could not resolve org:", error);
    return null;
  }

  _cachedUserId = user.id;
  _cachedOrgId = data.organization_id;
  return _cachedOrgId;
}

// Clear org cache on auth state change
supabase.auth.onAuthStateChange(() => {
  _cachedOrgId = null;
  _cachedUserId = null;
});

// --------------------------
// Status mapping - No mapping needed, statuses are now stored in Spanish in the database
// --------------------------

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
    status: appointment.status as AppointmentStatus,
    notes: appointment.notes ?? undefined,
    durationMinutes: appointment.duration_minutes ?? 60,
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
  const orgId = await getActiveOrganizationId();

  // Get org members for the active organization (or all if no org)
  let membersQuery = supabase
    .from("org_members")
    .select("user_id, role, doctor_id, secretary_id")
    .eq("is_active", true);

  if (orgId) membersQuery = membersQuery.eq("organization_id", orgId);

  const { data: membersData, error: membersError } = await membersQuery;

  if (membersError) {
    console.error("Error getAllUsers:org_members", membersError);
    throw membersError;
  }

  if (!membersData || membersData.length === 0) return [];

  // Get user IDs from members
  const userIds = membersData.map((m: any) => m.user_id);

  // Get all users with their related data
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select(`
      id,
      email,
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
    .in("id", userIds)
    .order("created_at", { ascending: false });

  if (usersError) {
    console.error("Error getAllUsers:", usersError);
    throw usersError;
  }

  if (!usersData || usersData.length === 0) return [];

  // Create a map of user_id to role from org_members
  const userRolesMap = new Map<string, string>();
  membersData.forEach((m: any) => {
    if (!userRolesMap.has(m.user_id)) {
      userRolesMap.set(m.user_id, m.role);
    }
  });

  // Map users with their roles
  return usersData.map((user: any) => {
    const role = userRolesMap.get(user.id);

    return {
      id: user.id,
      email: user.email,
      role: role || 'unknown',
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
    };
  });
}

// --------------------------
// 1. getTodayAppointments
// --------------------------
export async function getTodayAppointments(date: string): Promise<AppointmentWithDetails[]> {
  const orgId = await getActiveOrganizationId();
  // Carga las citas del día con relations anidadas (doctor, patient)
  let query = supabase
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

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;

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
// Get all appointments for a specific patient
// --------------------------
export async function getPatientAppointments(patientId: string): Promise<AppointmentWithDetails[]> {
  const orgId = await getActiveOrganizationId();
  let query = supabase
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
    .eq("patient_id", patientId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;

  if (error) {
    console.error("Error getPatientAppointments:", error);
    throw error;
  }

  return Promise.all((data as any[]).map(fetchAppointmentWithRelations));
}

// --------------------------
// 3. updateAppointmentStatus
// --------------------------
export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: status })
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
  durationMinutes?: number;
}): Promise<Appointment> {
  try {
    // Resolve organization context for the edge function
    const orgId = await getActiveOrganizationId();

    // Llamar a la Edge Function create-appointment
    const { data, error } = await supabase.functions.invoke('create-appointment', {
      body: {
        doctorId: input.doctorId,
        patientId: input.patientId,
        date: input.date,
        time: input.time,
        notes: input.notes,
        durationMinutes: input.durationMinutes ?? 60,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    });

    if (error) {
      console.error('Error calling create-appointment edge function:', error);
      throw new Error(error.message || 'Error al crear la cita');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    // Edge Function returns { ok: true, appointment, whatsappSent, ... }
    if (!data?.ok || !data?.appointment) {
      throw new Error('Respuesta inválida del servidor');
    }

    // Log WhatsApp status for debugging
    if (data.whatsappSent) {
      console.log('[createAppointment] WhatsApp enviado:', data.twilioSid);
    } else if (data.whatsappError) {
      console.warn('[createAppointment] WhatsApp no enviado:', data.whatsappError);
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
 * @param params.doctorId - ID del doctor
 * @param params.date - Fecha en formato YYYY-MM-DD
 * @param params.durationMinutes - Duración de la cita en minutos (default: 60)
 */
export async function getAvailableSlots(params: {
  doctorId: string;
  date: string;
  durationMinutes?: number;
}): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('get-available-slots', {
    body: {
      doctorId: params.doctorId,
      date: params.date,
      durationMinutes: params.durationMinutes ?? 60,
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
  const orgId = await getActiveOrganizationId();
  // Busca por name o phone (simple LIKE)
  let q = supabase
    .from("patients")
    .select("*")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name", { ascending: true });

  if (orgId) q = q.eq("organization_id", orgId);

  const { data, error } = await q;

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
  const orgId = await getActiveOrganizationId();
  let query = supabase.from("patients").select("*").order("name", { ascending: true });
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;

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
export async function createPatient(input: { name: string; phone: string; email?: string; notes?: string; doctorId?: string }): Promise<Patient> {
  const orgId = await getActiveOrganizationId();
  const { name, phone, email, notes, doctorId } = input;
  const { data, error } = await supabase
    .from("patients")
    .insert([
      {
        name,
        phone,
        email,
        notes,
        doctor_id: doctorId,
        organization_id: orgId,
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
  const orgId = await getActiveOrganizationId();
  let query = supabase
    .from("doctors")
    .select("*")
    .eq("specialty_id", specialtyId)
    .order("name", { ascending: true });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;

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
  const orgId = await getActiveOrganizationId();
  let query = supabase.from("doctors").select("*").order("name", { ascending: true });
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query;

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
  const orgId = await getActiveOrganizationId();
  // Busca por nombre de doctor o nombre de especialidad
  let q = supabase
    .from("doctors")
    .select(`
      *,
      specialty:specialty_id (
        id, name
      )
    `)
    .or(`name.ilike.%${query}%`)
    .order("name", { ascending: true });

  if (orgId) q = q.eq("organization_id", orgId);

  const { data, error } = await q;

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
    let q2 = supabase
      .from("doctors")
      .select(`
        *,
        specialty:specialty_id (
          id, name
        )
      `)
      .in("specialty_id", specialtyIds)
      .order("name", { ascending: true });

    if (orgId) q2 = q2.eq("organization_id", orgId);

    const { data: doctorsBySpecialty, error: doctorError } = await q2;

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
// 11c. getDoctorById
// --------------------------
export async function getDoctorById(doctorId: string): Promise<Doctor | null> {
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      *,
      specialty:specialty_id (
        id, name
      )
    `)
    .eq("id", doctorId)
    .single();

  if (error) {
    console.error("Error getDoctorById:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email ?? undefined,
    specialtyId: data.specialty_id,
    specialtyName: (data as any).specialty?.name,
    createdAt: data.created_at,
  };
}

// --------------------------
// 11d. getDoctorSchedules
// --------------------------
const DAY_MAP: { [key: number]: string } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export async function getDoctorSchedules(doctorId: string): Promise<WeekSchedule> {
  const { data, error } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error getDoctorSchedules:", error);
    throw error;
  }

  // Initialize empty week schedule
  const weekSchedule: WeekSchedule = {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  };

  // Map database records to WeekSchedule format
  (data || []).forEach((schedule: any) => {
    const dayKey = DAY_MAP[schedule.day_of_week];
    if (dayKey) {
      weekSchedule[dayKey].push({
        id: schedule.id,
        start_time: schedule.start_time.substring(0, 5), // "HH:MM:SS" -> "HH:MM"
        end_time: schedule.end_time.substring(0, 5),
      });
    }
  });

  return weekSchedule;
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

  // 2. Consultar la tabla users para obtener email y doctor_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    console.error("Error getCurrentUserWithRole:users", userError);
    throw userError;
  }

  if (!userData) {
    return null;
  }

  // 3. Consultar org_members con organizations para obtener membresías
  const { data: memberships, error: membershipsError } = await supabase
    .from("org_members")
    .select("organization_id, role, doctor_id, organizations(name)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (membershipsError) {
    console.error("Error getCurrentUserWithRole:org_members", membershipsError);
    throw membershipsError;
  }

  if (!memberships || memberships.length === 0) {
    // Fallback: try user_roles for users not yet migrated to org_members
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!rolesData) return null;

    return {
      id: userData.id,
      email: userData.email,
      role: rolesData.role as CurrentUser["role"],
      doctorId: userData.doctor_id ?? null,
      organizationId: "",
      organizations: [],
    };
  }

  // 4. Mapear membresías a OrgMembership[]
  const organizations: OrgMembership[] = memberships.map((m: any) => ({
    organizationId: m.organization_id,
    organizationName: (m.organizations as any)?.name ?? "Unknown",
    role: m.role as OrgMembership["role"],
    doctorId: m.doctor_id ?? null,
  }));

  // 5. Seleccionar la primera org como activa (en el futuro: org switcher)
  const activeOrg = organizations[0];

  // 6. Mapear a CurrentUser (backward compatible: role y doctorId de la org activa)
  return {
    id: userData.id,
    email: userData.email,
    role: activeOrg.role,
    doctorId: activeOrg.doctorId ?? userData.doctor_id ?? null,
    organizationId: activeOrg.organizationId,
    organizations,
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
  mapAppointment,
};

// --------------------------
// 16. Get User By ID
// --------------------------
export async function getUserById(userId: string): Promise<UserWithRelations | null> {
  // First, get user data without role
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
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

  // Get user role from org_members table
  const { data: roleData, error: roleError } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    console.error('[getUserById] Error fetching role:', roleError);
    throw new Error('Error al cargar el rol del usuario');
  }

  // Handle doctor data - it may come as array or null
  const doctorData: any = Array.isArray(data.doctor) ? data.doctor[0] : data.doctor;
  const secretaryData: any = Array.isArray(data.secretary) ? data.secretary[0] : data.secretary;
  
  // Transform the data to match UserWithRelations interface
  return {
    id: data.id,
    email: data.email,
    role: roleData?.role || 'unknown',
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

// ====================================================================
// ADMIN CRUD: Organizations, Clinics, Calendars, WhatsApp Lines
// These functions are admin-only and NOT added to api.ts router interface.
// They are imported directly by admin pages.
// ====================================================================

// --------------------------
// Organization
// --------------------------

export async function getOrganizationDetails(): Promise<Organization | null> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) {
    console.error("[getOrganizationDetails] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerUserId: data.owner_user_id,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    countryCode: data.country_code ?? undefined,
    timezone: data.timezone ?? undefined,
    billingType: data.billing_type ?? undefined,
    isActive: data.is_active,
    trialEndsAt: data.trial_ends_at ?? undefined,
    createdAt: data.created_at,
  };
}

export async function updateOrganization(
  orgId: string,
  updates: { name?: string; phone?: string; email?: string; timezone?: string }
): Promise<Organization> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;

  const { data, error } = await supabase
    .from("organizations")
    .update(dbUpdates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) {
    console.error("[updateOrganization] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerUserId: data.owner_user_id,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    countryCode: data.country_code ?? undefined,
    timezone: data.timezone ?? undefined,
    billingType: data.billing_type ?? undefined,
    isActive: data.is_active,
    trialEndsAt: data.trial_ends_at ?? undefined,
    createdAt: data.created_at,
  };
}

// --------------------------
// Clinics
// --------------------------

export async function getClinicsByOrganization(): Promise<Clinic[]> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    console.error("[getClinicsByOrganization] Error:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function createClinic(input: {
  name: string;
  address?: string;
  phone?: string;
}): Promise<Clinic> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) throw new Error("No active organization");

  const { data, error } = await supabase
    .from("clinics")
    .insert({
      organization_id: orgId,
      name: input.name,
      address: input.address || null,
      phone: input.phone || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createClinic] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    address: data.address ?? undefined,
    phone: data.phone ?? undefined,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

export async function updateClinic(
  clinicId: string,
  updates: { name?: string; address?: string; phone?: string; isActive?: boolean }
): Promise<Clinic> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("clinics")
    .update(dbUpdates)
    .eq("id", clinicId)
    .select()
    .single();

  if (error) {
    console.error("[updateClinic] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    address: data.address ?? undefined,
    phone: data.phone ?? undefined,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

// --------------------------
// Calendars
// --------------------------

export async function getCalendarsByOrganization(): Promise<CalendarEntry[]> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("calendars")
    .select(`
      *,
      clinic:clinic_id (id, name),
      calendar_doctors (
        doctor:doctor_id (id, name)
      )
    `)
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    console.error("[getCalendarsByOrganization] Error:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    organizationId: row.organization_id,
    clinicId: row.clinic_id ?? undefined,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    clinicName: row.clinic?.name ?? undefined,
    doctors: (row.calendar_doctors || [])
      .map((cd: any) => cd.doctor)
      .filter(Boolean)
      .map((d: any) => ({ id: d.id, name: d.name })),
  }));
}

export async function createCalendar(input: {
  name: string;
  clinicId?: string;
}): Promise<CalendarEntry> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) throw new Error("No active organization");

  const { data, error } = await supabase
    .from("calendars")
    .insert({
      organization_id: orgId,
      name: input.name,
      clinic_id: input.clinicId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createCalendar] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    clinicId: data.clinic_id ?? undefined,
    name: data.name,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

export async function updateCalendar(
  calendarId: string,
  updates: { name?: string; clinicId?: string; isActive?: boolean }
): Promise<CalendarEntry> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.clinicId !== undefined) dbUpdates.clinic_id = updates.clinicId;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("calendars")
    .update(dbUpdates)
    .eq("id", calendarId)
    .select()
    .single();

  if (error) {
    console.error("[updateCalendar] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    clinicId: data.clinic_id ?? undefined,
    name: data.name,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

// --------------------------
// WhatsApp Lines
// --------------------------

export async function getWhatsAppLinesByOrganization(): Promise<WhatsAppLine[]> {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("whatsapp_lines")
    .select(`
      *,
      clinic:clinic_id (id, name)
    `)
    .eq("organization_id", orgId)
    .order("label");

  if (error) {
    console.error("[getWhatsAppLinesByOrganization] Error:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    organizationId: row.organization_id,
    clinicId: row.clinic_id ?? undefined,
    label: row.label,
    phoneNumber: row.phone_number,
    provider: row.provider,
    botEnabled: row.bot_enabled,
    botGreeting: row.bot_greeting ?? undefined,
    defaultDurationMinutes: row.default_duration_minutes ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    clinicName: row.clinic?.name ?? undefined,
  }));
}

export async function updateWhatsAppLine(
  lineId: string,
  updates: { label?: string; botEnabled?: boolean; defaultDurationMinutes?: number; isActive?: boolean }
): Promise<WhatsAppLine> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.label !== undefined) dbUpdates.label = updates.label;
  if (updates.botEnabled !== undefined) dbUpdates.bot_enabled = updates.botEnabled;
  if (updates.defaultDurationMinutes !== undefined) dbUpdates.default_duration_minutes = updates.defaultDurationMinutes;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("whatsapp_lines")
    .update(dbUpdates)
    .eq("id", lineId)
    .select(`
      *,
      clinic:clinic_id (id, name)
    `)
    .single();

  if (error) {
    console.error("[updateWhatsAppLine] Error:", error);
    throw error;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    clinicId: data.clinic_id ?? undefined,
    label: data.label,
    phoneNumber: data.phone_number,
    provider: data.provider,
    botEnabled: data.bot_enabled,
    botGreeting: (data as any).bot_greeting ?? undefined,
    defaultDurationMinutes: data.default_duration_minutes ?? undefined,
    isActive: data.is_active,
    createdAt: data.created_at,
    clinicName: (data as any).clinic?.name ?? undefined,
  };
}

// --------------------------
// Org Switching (Step 10b)
// --------------------------

export async function switchActiveOrganization(newOrgId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('switch-organization', {
    body: { organizationId: newOrgId },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al cambiar de organizacion');
  }

  // Clear cached org ID so next API call picks up the new one
  _cachedOrgId = null;
  _cachedUserId = null;
}

