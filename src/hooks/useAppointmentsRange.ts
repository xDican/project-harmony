import { useEffect, useState } from 'react';
import { getAppointmentsByDateRange, AppointmentWithDetails } from '@/lib/api';

interface UseAppointmentsRangeOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  doctorId?: string;
}

export const useAppointmentsRange = ({ startDate, endDate, doctorId }: UseAppointmentsRangeOptions) => {
  const [data, setData] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getAppointmentsByDateRange({ startDate, endDate, doctorId })
      .then((appointments) => {
        setData(appointments);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
        setIsLoading(false);
      });
  }, [startDate, endDate, doctorId]);

  return {
    data,
    isLoading,
    error,
  };
};
