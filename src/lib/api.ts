/**
 * API Router
 * 
 * This file serves as the main API entry point for the frontend.
 * It delegates all API calls to either the Supabase backend or dummy/mock data
 * based on the VITE_USE_DUMMY_DATA environment variable.
 * 
 * Configuration:
 * - VITE_USE_DUMMY_DATA=true  -> Use in-memory dummy data (api.dummy.ts)
 * - VITE_USE_DUMMY_DATA=false -> Use Supabase backend (api.supabase.ts) [DEFAULT]
 * 
 * The router maintains a consistent API surface for the frontend, ensuring
 * that hooks and components can switch between backends without code changes.
 */

import type { Appointment, AppointmentStatus } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import type { Doctor, Specialty } from '@/types/doctor';
import type { CurrentUser } from '@/types/user';

// User with relations for admin user management
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
}

// Determine which backend to use based on environment variable
const USE_DUMMY_DATA = import.meta.env.VITE_USE_DUMMY_DATA === 'false';

// Re-export the AppointmentWithDetails interface for backward compatibility
// This interface is used by all hooks and components
export interface AppointmentWithDetails extends Appointment {
  patient: Patient;
  doctor: Doctor;
}

// Type definition for the API module interface
interface ApiModule {
  getTodayAppointments: (date: string) => Promise<AppointmentWithDetails[]>;
  getTodayAppointmentsByDoctor: (doctorId: string, date: string) => Promise<AppointmentWithDetails[]>;
  updateAppointmentStatus: (appointmentId: string, newStatus: AppointmentStatus) => Promise<Appointment | null>;
  createAppointment: (input: {
    doctorId: string;
    patientId: string;
    date: string;
    time: string;
    notes?: string;
    status?: AppointmentStatus;
  }) => Promise<Appointment>;
  getAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
  searchPatients: (query: string) => Promise<Patient[]>;
  getAllPatients: () => Promise<Patient[]>;
  createPatient: (input: { name: string; phone: string }) => Promise<Patient>;
  getSpecialties: () => Promise<Specialty[]>;
  getDoctorsBySpecialty: (specialtyId: string) => Promise<Doctor[]>;
  getDoctors: () => Promise<Doctor[]>;
  searchDoctors: (query: string) => Promise<Doctor[]>;
  getCurrentUserWithRole: () => Promise<CurrentUser | null>;
  createUserWithRole: (input: {
    email: string;
    password: string;
    role: string;
    specialtyId?: string;
    fullName?: string;
    phone?: string;
  }) => Promise<{ success: boolean; user?: any; error?: string }>;
  getAllUsers: () => Promise<UserWithRelations[]>;
  getAdminMetrics?: () => Promise<any>;
}

// Conditional imports - these are done lazily on first use to avoid top-level await
let apiModulePromise: Promise<ApiModule> | null = null;

function getApiModule() {
  if (!apiModulePromise) {
    if (USE_DUMMY_DATA) {
      console.log('[API Router] Using DUMMY data (in-memory)');
      apiModulePromise = import('./api.dummy');
    } else {
      console.log('[API Router] Using SUPABASE backend');
      apiModulePromise = import('./api.supabase');
    }
  }
  return apiModulePromise;
}

/**
 * Get all appointments for a specific date with patient and doctor details
 */
export async function getTodayAppointments(date: string): Promise<AppointmentWithDetails[]> {
  const apiModule = await getApiModule();
  return await apiModule.getTodayAppointments(date);
}

/**
 * Get appointments for a specific doctor on a specific date with patient details
 */
export async function getTodayAppointmentsByDoctor(
  doctorId: string,
  date: string
): Promise<AppointmentWithDetails[]> {
  const apiModule = await getApiModule();
  return await apiModule.getTodayAppointmentsByDoctor(doctorId, date);
}

/**
 * Update the status of an appointment
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<Appointment | null> {
  const apiModule = await getApiModule();
  return await apiModule.updateAppointmentStatus(appointmentId, newStatus);
}

/**
 * Create a new appointment
 */
export async function createAppointment(input: {
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  notes?: string;
  status?: AppointmentStatus;
}): Promise<Appointment> {
  const apiModule = await getApiModule();
  return await apiModule.createAppointment(input);
}

/**
 * Get available time slots for a doctor on a specific date
 */
export async function getAvailableSlots(params: { doctorId: string; date: string }): Promise<string[]> {
  const apiModule = await getApiModule();
  return await apiModule.getAvailableSlots(params);
}

/**
 * Search patients by name or phone
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const apiModule = await getApiModule();
  return await apiModule.searchPatients(query);
}

/**
 * Get all patients
 */
export async function getAllPatients(): Promise<Patient[]> {
  const apiModule = await getApiModule();
  return await apiModule.getAllPatients();
}

/**
 * Create a new patient
 */
export async function createPatient(input: { name: string; phone: string }): Promise<Patient> {
  const apiModule = await getApiModule();
  return await apiModule.createPatient(input);
}

/**
 * Get all specialties
 */
export async function getSpecialties(): Promise<Specialty[]> {
  const apiModule = await getApiModule();
  return await apiModule.getSpecialties();
}

/**
 * Get doctors filtered by specialty
 */
export async function getDoctorsBySpecialty(specialtyId: string): Promise<Doctor[]> {
  const apiModule = await getApiModule();
  return await apiModule.getDoctorsBySpecialty(specialtyId);
}

/**
 * Get all doctors
 */
export async function getDoctors(): Promise<Doctor[]> {
  const apiModule = await getApiModule();
  return await apiModule.getDoctors();
}

/**
 * Search doctors by name or specialty
 */
export async function searchDoctors(query: string): Promise<Doctor[]> {
  const apiModule = await getApiModule();
  return await apiModule.searchDoctors(query);
}

/**
 * Get current user with role information
 */
export async function getCurrentUserWithRole(): Promise<CurrentUser | null> {
  const apiModule = await getApiModule();
  return await apiModule.getCurrentUserWithRole();
}

/**
 * Create a new user with a specific role
 */
export async function createUserWithRole(input: {
  email: string;
  password: string;
  role: string;
  specialtyId?: string;
  fullName?: string;
  phone?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  const apiModule = await getApiModule();
  return await apiModule.createUserWithRole(input);
}

/**
 * Get all users with their related doctor and specialty information
 */
export async function getAllUsers(): Promise<UserWithRelations[]> {
  const apiModule = await getApiModule();
  return await apiModule.getAllUsers();
}

// Re-export AdminMetrics type from dummy API (for backward compatibility)
export type { AdminMetrics } from './api.dummy';

/**
 * Get admin dashboard metrics (only available in dummy mode)
 */
export async function getAdminMetrics() {
  const apiModule = await getApiModule();
  if (apiModule.getAdminMetrics) {
    return await apiModule.getAdminMetrics();
  }
  throw new Error('getAdminMetrics is only available in dummy mode');
}
