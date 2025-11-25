import { Patient } from '@/types/patient';
import { Doctor, Specialty } from '@/types/doctor';
import { DoctorSchedule } from '@/types/schedule';
import { Appointment } from '@/types/appointment';

// Get today's date in ISO format for dummy data
const today = new Date().toISOString().split('T')[0];

// Dummy patients
export const patients: Patient[] = [
  {
    id: 'pat-001',
    name: 'María García López',
    phone: '555-0101',
    documentId: '12345678A',
  },
  {
    id: 'pat-002',
    name: 'Juan Martínez Ruiz',
    phone: '555-0102',
    documentId: '23456789B',
  },
  {
    id: 'pat-003',
    name: 'Ana Rodríguez Fernández',
    phone: '555-0103',
    documentId: '34567890C',
  },
  {
    id: 'pat-004',
    name: 'Carlos Sánchez Pérez',
    phone: '555-0104',
    documentId: '45678901D',
  },
  {
    id: 'pat-005',
    name: 'Laura Hernández Torres',
    phone: '555-0105',
    documentId: '56789012E',
  },
  {
    id: 'pat-006',
    name: 'Pedro López González',
    phone: '555-0106',
    documentId: '67890123F',
  },
];

// Dummy specialties
export const specialties: Specialty[] = [
  {
    id: 'cardiology',
    name: 'Cardiología',
  },
  {
    id: 'dermatology',
    name: 'Dermatología',
  },
  {
    id: 'pediatrics',
    name: 'Pediatría',
  },
  {
    id: 'general',
    name: 'Medicina General',
  },
  {
    id: 'orthopedics',
    name: 'Traumatología',
  },
];

// Dummy doctors
export const doctors: Doctor[] = [
  {
    id: 'doc-001',
    name: 'Dr. Roberto Jiménez',
    specialtyId: 'cardiology',
  },
  {
    id: 'doc-002',
    name: 'Dra. Elena Morales',
    specialtyId: 'pediatrics',
  },
  {
    id: 'doc-003',
    name: 'Dr. Miguel Ángel Castro',
    specialtyId: 'general',
  },
];

// Dummy doctor schedules
export const doctorSchedules: DoctorSchedule[] = [
  // Dr. Roberto Jiménez - Monday, Wednesday, Friday
  {
    id: 'sch-001',
    doctorId: 'doc-001',
    weekday: 1, // Monday
    startTime: '08:00',
    endTime: '14:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-002',
    doctorId: 'doc-001',
    weekday: 3, // Wednesday
    startTime: '08:00',
    endTime: '14:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-003',
    doctorId: 'doc-001',
    weekday: 5, // Friday
    startTime: '08:00',
    endTime: '14:00',
    slotDurationMinutes: 30,
  },
  
  // Dra. Elena Morales - Tuesday, Thursday
  {
    id: 'sch-004',
    doctorId: 'doc-002',
    weekday: 2, // Tuesday
    startTime: '09:00',
    endTime: '15:00',
    slotDurationMinutes: 20,
  },
  {
    id: 'sch-005',
    doctorId: 'doc-002',
    weekday: 4, // Thursday
    startTime: '09:00',
    endTime: '15:00',
    slotDurationMinutes: 20,
  },
  
  // Dr. Miguel Ángel Castro - Monday to Friday
  {
    id: 'sch-006',
    doctorId: 'doc-003',
    weekday: 1,
    startTime: '10:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-007',
    doctorId: 'doc-003',
    weekday: 2,
    startTime: '10:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-008',
    doctorId: 'doc-003',
    weekday: 3,
    startTime: '10:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-009',
    doctorId: 'doc-003',
    weekday: 4,
    startTime: '10:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  },
  {
    id: 'sch-010',
    doctorId: 'doc-003',
    weekday: 5,
    startTime: '10:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  },
];

// Dummy appointments (some for today)
export const appointments: Appointment[] = [
  {
    id: 'apt-001',
    date: today,
    time: '08:30',
    patientId: 'pat-001',
    doctorId: 'doc-001',
    status: 'confirmada',
    notes: 'Control de presión arterial',
  },
  {
    id: 'apt-002',
    date: today,
    time: '09:00',
    patientId: 'pat-002',
    doctorId: 'doc-001',
    status: 'agendada',
    notes: 'Primera consulta cardiología',
  },
  {
    id: 'apt-003',
    date: today,
    time: '09:20',
    patientId: 'pat-003',
    doctorId: 'doc-002',
    status: 'confirmada',
    notes: 'Vacunación infantil',
  },
  {
    id: 'apt-004',
    date: today,
    time: '10:30',
    patientId: 'pat-004',
    doctorId: 'doc-003',
    status: 'confirmada',
    notes: 'Consulta general - dolor de cabeza',
  },
  {
    id: 'apt-005',
    date: today,
    time: '11:00',
    patientId: 'pat-005',
    doctorId: 'doc-003',
    status: 'agendada',
  },
  {
    id: 'apt-006',
    date: today,
    time: '12:00',
    patientId: 'pat-006',
    doctorId: 'doc-001',
    status: 'cancelada',
    notes: 'Cancelada por el paciente',
  },
];
