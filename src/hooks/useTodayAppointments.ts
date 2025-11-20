import { useEffect, useState } from 'react';
import { getTodayAppointments, getTodayAppointmentsByDoctor, AppointmentWithDetails } from '@/lib/api';

/**
 * Hook to fetch today's appointments with patient and doctor details
 * 
 * @param options - Optional configuration object
 * @param options.doctorId - If provided, fetches appointments for specific doctor only
 * @param options.initialDate - Optional ISO date string (defaults to today in local timezone)
 * @returns Object with data, loading state, error, current date, and setter
 */
export const useTodayAppointments = (options?: { 
  doctorId?: string | null; 
  initialDate?: string;
}) => {
  // Default to today's date in local timezone if not provided
  const getToday = () => new Date().toISOString().split('T')[0];
  
  const [date, setDate] = useState<string>(options?.initialDate || getToday());
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
    setDate,
  };
};
