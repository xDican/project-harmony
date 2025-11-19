export interface DoctorSchedule {
  id: string;
  doctorId: string;
  weekday: number;        // 0-6
  startTime: string;      // "08:00"
  endTime: string;        // "16:00"
  slotDurationMinutes: number;
}
