import { useEffect, useState } from 'react';
import { getTodayAppointments, getTodayAppointmentsByDoctor, AppointmentWithDetails } from '@/lib/api';
import { getLocalDateString } from '@/lib/dateUtils';

/**
 * Hook to fetch appointments with patient and doctor details for a given date
 * 
 * @param options - Optional configuration object
 * @param options.doctorId - If provided, fetches appointments for specific doctor only
 * @param options.initialDate - Optional ISO date string (defaults to today in local timezone)
 * @returns Object with data, loading state, error, and current date
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

  useEffect(() => {
    // Reset state when date or doctorId changes
    setIsLoading(true);
    setError(null);

    // Fetch appointments based on doctorId
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

  return {
    data,
    isLoading,
    error,
    date,
  };
};
