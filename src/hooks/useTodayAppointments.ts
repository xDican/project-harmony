import { useEffect, useState, useCallback } from 'react';
import { getTodayAppointments, getTodayAppointmentsByDoctor, AppointmentWithDetails } from '@/lib/api';
import { getLocalDateString } from '@/lib/dateUtils';

/**
 * Hook to fetch appointments with patient and doctor details for a given date
 * 
 * @param options - Optional configuration object
 * @param options.doctorId - If provided, fetches appointments for specific doctor only
 * @param options.initialDate - Optional ISO date string (defaults to today in local timezone)
 * @returns Object with data, loading state, error, current date, and refetch function
 */
export const useTodayAppointments = (options?: { 
  doctorId?: string | null; 
  initialDate?: string;
}) => {
  // Use the provided date directly, defaulting to today
  const date = options?.initialDate || getLocalDateString();
  const [data, setData] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const fetchPromise = options?.doctorId
      ? getTodayAppointmentsByDoctor(options.doctorId, date)
      : getTodayAppointments(date);

    fetchPromise
      .then((appointments) => {
        setData(appointments);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
        setIsLoading(false);
      });
  }, [date, options?.doctorId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    data,
    isLoading,
    error,
    date,
    refetch: fetchAppointments,
  };
};
