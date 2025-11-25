import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { getPatientAppointments } from '@/lib/api';
import type { AppointmentWithDetails } from '@/lib/api';

export interface PatientAppointment extends AppointmentWithDetails {
  doctorName: string;
}

interface UsePatientAppointmentsReturn {
  upcoming: PatientAppointment[];
  past: PatientAppointment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage appointments for a specific patient
 * Automatically separates appointments into upcoming and past based on date/time
 */
export function usePatientAppointments(patientId: string): UsePatientAppointmentsReturn {
  const [upcoming, setUpcoming] = useState<PatientAppointment[]>([]);
  const [past, setPast] = useState<PatientAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getPatientAppointments(patientId)
      .then((appointments) => {
        const today = DateTime.now().startOf('day');
        const upcomingList: PatientAppointment[] = [];
        const pastList: PatientAppointment[] = [];

        appointments.forEach((apt) => {
          // Parse only the date (without time) for comparison
          const aptDate = DateTime.fromISO(apt.date).startOf('day');

          const enrichedApt: PatientAppointment = {
            ...apt,
            doctorName: apt.doctor.name,
          };

          // If appointment date is today or future, it's upcoming
          // If appointment date is before today, it's past
          if (aptDate >= today) {
            upcomingList.push(enrichedApt);
          } else {
            pastList.push(enrichedApt);
          }
        });

        // Sort upcoming ascending (closest to today first)
        upcomingList.sort((a, b) => {
          const aDate = DateTime.fromISO(a.date);
          const bDate = DateTime.fromISO(b.date);
          const dateDiff = aDate.toMillis() - bDate.toMillis();
          // If same date, sort by time
          if (dateDiff === 0) {
            return a.time.localeCompare(b.time);
          }
          return dateDiff;
        });

        // Sort past descending (closest to today first, most recent)
        pastList.sort((a, b) => {
          const aDate = DateTime.fromISO(a.date);
          const bDate = DateTime.fromISO(b.date);
          const dateDiff = bDate.toMillis() - aDate.toMillis();
          // If same date, sort by time descending
          if (dateDiff === 0) {
            return b.time.localeCompare(a.time);
          }
          return dateDiff;
        });

        setUpcoming(upcomingList);
        setPast(pastList);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Error al cargar citas'));
        setIsLoading(false);
      });
  }, [patientId, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    upcoming,
    past,
    isLoading,
    error,
    refetch,
  };
}
