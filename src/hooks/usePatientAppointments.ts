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
        const now = DateTime.now();
        const upcomingList: PatientAppointment[] = [];
        const pastList: PatientAppointment[] = [];

        appointments.forEach((apt) => {
          // Combine date and time to create a DateTime object
          const aptDateTime = DateTime.fromFormat(
            `${apt.date} ${apt.time}`,
            'yyyy-MM-dd HH:mm'
          );

          const enrichedApt: PatientAppointment = {
            ...apt,
            doctorName: apt.doctor.name,
          };

          // If appointment is in the future or today/now, it's upcoming
          if (aptDateTime >= now) {
            upcomingList.push(enrichedApt);
          } else {
            pastList.push(enrichedApt);
          }
        });

        // Sort upcoming ascending (closest first)
        upcomingList.sort((a, b) => {
          const aDate = DateTime.fromFormat(`${a.date} ${a.time}`, 'yyyy-MM-dd HH:mm');
          const bDate = DateTime.fromFormat(`${b.date} ${b.time}`, 'yyyy-MM-dd HH:mm');
          return aDate.toMillis() - bDate.toMillis();
        });

        // Sort past descending (most recent first)
        pastList.sort((a, b) => {
          const aDate = DateTime.fromFormat(`${a.date} ${a.time}`, 'yyyy-MM-dd HH:mm');
          const bDate = DateTime.fromFormat(`${b.date} ${b.time}`, 'yyyy-MM-dd HH:mm');
          return bDate.toMillis() - aDate.toMillis();
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
