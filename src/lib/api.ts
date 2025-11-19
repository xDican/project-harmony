import { appointments, patients, doctors, schedules } from './data';
import { Appointment } from '@/types/appointment';
import { Patient } from '@/types/patient';
import { Doctor } from '@/types/doctor';
import { Schedule } from '@/types/schedule';

// Frontend service layer - currently reads from local data
// Will be replaced with Supabase calls later

export const api = {
  appointments: {
    getAll: (): Promise<Appointment[]> => Promise.resolve([...appointments]),
    getById: (id: string): Promise<Appointment | undefined> => 
      Promise.resolve(appointments.find(a => a.id === id)),
    getByDate: (date: string): Promise<Appointment[]> => 
      Promise.resolve(appointments.filter(a => a.date === date)),
    create: (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
      const newAppointment = { ...appointment, id: `apt-${Date.now()}` };
      appointments.push(newAppointment);
      return Promise.resolve(newAppointment);
    },
  },
  
  patients: {
    getAll: (): Promise<Patient[]> => Promise.resolve([...patients]),
    getById: (id: string): Promise<Patient | undefined> => 
      Promise.resolve(patients.find(p => p.id === id)),
    search: (query: string): Promise<Patient[]> => 
      Promise.resolve(patients.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      )),
  },
  
  doctors: {
    getAll: (): Promise<Doctor[]> => Promise.resolve([...doctors]),
    getById: (id: string): Promise<Doctor | undefined> => 
      Promise.resolve(doctors.find(d => d.id === id)),
  },
  
  schedules: {
    getByDoctor: (doctorId: string): Promise<Schedule[]> => 
      Promise.resolve(schedules.filter(s => s.doctorId === doctorId)),
  },
};
