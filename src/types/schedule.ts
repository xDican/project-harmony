/**
 * Tipos para gestión de horarios de doctores
 * 
 * IMPORTANTE: day_of_week en la base de datos usa 0-6 donde:
 * - 0 = Domingo (Sunday)
 * - 1 = Lunes (Monday)
 * - 2 = Martes (Tuesday)
 * - 3 = Miércoles (Wednesday)
 * - 4 = Jueves (Thursday)
 * - 5 = Viernes (Friday)
 * - 6 = Sábado (Saturday)
 * 
 * Esta convención se alinea con JavaScript Date.getDay() y se usa
 * consistentemente en get-available-slots y upsert-doctor-schedules.
 */

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  weekday: number;        // 0-6 (0=Sunday)
  startTime: string;      // "08:00"
  endTime: string;        // "16:00"
  slotDurationMinutes: number;
}

/**
 * Representa un slot individual de horario
 */
export type Slot = {
  id: string;
  start_time: string;  // "HH:MM" format, e.g. "08:00"
  end_time: string;    // "HH:MM" format, e.g. "09:00"
};

/**
 * Horarios semanales organizados por día
 * Las claves son strings representando días (e.g., "monday", "tuesday", etc.)
 * Los valores son arrays de slots para ese día
 */
export type WeekSchedule = {
  [dayKey: string]: Slot[];
};
