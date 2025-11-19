import { Appointment } from '@/types/appointment';
import { Patient } from '@/types/patient';
import { Doctor } from '@/types/doctor';
import { appointments, patients, doctors, doctorSchedules } from './data';

/**
 * Frontend service layer - simulates backend calls with in-memory data
 * All functions are synchronous but wrapped in Promise.resolve() for async API shape
 */

export interface AppointmentWithDetails extends Appointment {
  patient: Patient;
  doctor: Doctor;
}

/**
 * Get all appointments for a specific date with patient and doctor details
 */
export function getTodayAppointments(date: string): Promise<AppointmentWithDetails[]> {
  const filteredAppointments = appointments
    .filter(apt => apt.date === date)
    .map(apt => {
      const patient = patients.find(p => p.id === apt.patientId);
      const doctor = doctors.find(d => d.id === apt.doctorId);
      
      if (!patient || !doctor) {
        throw new Error(`Missing patient or doctor for appointment ${apt.id}`);
      }
      
      return {
        ...apt,
        patient,
        doctor,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time)); // Sort by time
  
  return Promise.resolve(filteredAppointments);
}

/**
 * Search patients by name or phone (case-insensitive substring match)
 */
export function searchPatients(query: string): Promise<Patient[]> {
  if (!query || query.trim() === '') {
    return Promise.resolve([]);
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  const results = patients.filter(patient => {
    const nameMatch = patient.name.toLowerCase().includes(searchTerm);
    const phoneMatch = patient.phone.includes(searchTerm);
    return nameMatch || phoneMatch;
  });
  
  return Promise.resolve(results);
}

/**
 * Get all patients
 */
export function getAllPatients(): Promise<Patient[]> {
  return Promise.resolve(patients);
}

/**
 * Get appointments for a specific doctor on a specific date with patient details
 */
export function getTodayAppointmentsByDoctor(
  doctorId: string, 
  date: string
): Promise<AppointmentWithDetails[]> {
  const filteredAppointments = appointments
    .filter(apt => apt.date === date && apt.doctorId === doctorId)
    .map(apt => {
      const patient = patients.find(p => p.id === apt.patientId);
      const doctor = doctors.find(d => d.id === apt.doctorId);
      
      if (!patient || !doctor) {
        throw new Error(`Missing patient or doctor for appointment ${apt.id}`);
      }
      
      return {
        ...apt,
        patient,
        doctor,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time)); // Sort by time
  
  return Promise.resolve(filteredAppointments);
}

/**
 * Get admin dashboard metrics
 */
export interface AdminMetrics {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  statusBreakdown: {
    pending: number;
    confirmed: number;
    canceled: number;
    completed: number;
  };
}

export function getAdminMetrics(): Promise<AdminMetrics> {
  const today = new Date().toISOString().split('T')[0];
  
  // Count today's appointments
  const todayAppointments = appointments.filter(apt => apt.date === today).length;
  
  // Count by status
  const statusBreakdown = {
    pending: appointments.filter(apt => apt.status === 'pending').length,
    confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
    canceled: appointments.filter(apt => apt.status === 'canceled').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
  };
  
  const metrics: AdminMetrics = {
    totalPatients: patients.length,
    totalDoctors: doctors.length,
    totalAppointments: appointments.length,
    todayAppointments,
    statusBreakdown,
  };
  
  return Promise.resolve(metrics);
}

/**
 * Generate available time slots for a doctor on a specific date
 * Returns array of time strings like ["08:00", "08:30", "09:00"]
 */
export function getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
  // Get the weekday for the given date (0=Sunday, 1=Monday, etc.)
  const dateObj = new Date(date + 'T00:00:00');
  const weekday = dateObj.getDay();
  
  // Find the doctor's schedule for this weekday
  const schedule = doctorSchedules.find(
    sch => sch.doctorId === doctorId && sch.weekday === weekday
  );
  
  if (!schedule) {
    // Doctor doesn't work on this day
    return Promise.resolve([]);
  }
  
  // Generate all possible slots based on schedule
  const allSlots: string[] = [];
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    allSlots.push(timeSlot);
    currentMinutes += schedule.slotDurationMinutes;
  }
  
  // Get all appointments for this doctor on this date
  const bookedSlots = appointments
    .filter(apt => 
      apt.doctorId === doctorId && 
      apt.date === date && 
      apt.status !== 'canceled' // Don't count canceled appointments
    )
    .map(apt => apt.time);
  
  // Filter out booked slots
  const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
  
  return Promise.resolve(availableSlots);
}
