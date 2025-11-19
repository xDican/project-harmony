import { useEffect, useState } from 'react';
import { getTodayAppointments, AppointmentWithDetails } from '@/lib/api';

/**
 * Hook to fetch today's appointments with patient and doctor details
 * 
 * @param initialDate - Optional ISO date string (defaults to today in local timezone)
 * @returns Object with data, loading state, error, current date, and setter
 */
export const useTodayAppointments = (initialDate?: string) => {
  // Default to today's date in local timezone if not provided
  const getToday = () => new Date().toISOString().split('T')[0];
  
  const [date, setDate] = useState<string>(initialDate || getToday());
  const [data, setData] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when date changes
    setIsLoading(true);
    setError(null);

    // Fetch appointments for the selected date
    getTodayAppointments(date)
      .then((appointments) => {
        setData(appointments);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
        setIsLoading(false);
      });
  }, [date]);

  return {
    data,
    isLoading,
    error,
    date,
    setDate,
  };
};
