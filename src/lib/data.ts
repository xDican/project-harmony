import { Appointment } from '@/types/appointment';
import { Patient } from '@/types/patient';
import { Doctor } from '@/types/doctor';
import { Schedule } from '@/types/schedule';

// Dummy data for development
export const doctors: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. María González',
    specialty: 'Cardiología',
    email: 'maria@clinica.com',
    phone: '555-0101',
  },
  {
    id: 'doc-2',
    name: 'Dr. Juan Pérez',
    specialty: 'Pediatría',
    email: 'juan@clinica.com',
    phone: '555-0102',
  },
];

export const patients: Patient[] = [
  {
    id: 'pat-1',
    name: 'Ana Martínez',
    email: 'ana@email.com',
    phone: '555-1001',
    notes: 'Alergia a penicilina',
  },
  {
    id: 'pat-2',
    name: 'Carlos López',
    email: 'carlos@email.com',
    phone: '555-1002',
  },
];

export const appointments: Appointment[] = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    date: '2025-11-20',
    time: '09:00',
    status: 'scheduled',
    notes: 'Control mensual',
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    doctorId: 'doc-2',
    date: '2025-11-20',
    time: '10:00',
    status: 'confirmed',
  },
];

export const schedules: Schedule[] = [
  {
    id: 'sch-1',
    doctorId: 'doc-1',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '14:00',
  },
  {
    id: 'sch-2',
    doctorId: 'doc-1',
    dayOfWeek: 3,
    startTime: '08:00',
    endTime: '14:00',
  },
];
