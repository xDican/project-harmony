export type AppointmentStatus = "agendada" | "confirmada" | "cancelada" | "completada" | "no_asistio";

export interface Appointment {
  id: string;
  date: string;        // ISO date "2025-11-18"
  time: string;        // "08:30"
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  notes?: string;
}
