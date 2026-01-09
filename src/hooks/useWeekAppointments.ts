import { useEffect, useState, useCallback, useMemo } from 'react';
import { getTodayAppointments, getTodayAppointmentsByDoctor, AppointmentWithDetails } from '@/lib/api';

/**
 * Hook to fetch appointments for a week range
 * 
 * @param options - Configuration object
 * @param options.doctorId - If provided, fetches appointments for specific doctor only
 * @param options.weekStart - ISO date string for the start of the week (YYYY-MM-DD)
 * @returns Object with appointments grouped by date, loading state, and refetch function
 */
export const useWeekAppointments = (options: { 
  doctorId?: string | null; 
  weekStart: string; // ISO date string "YYYY-MM-DD"
}) => {
  const [data, setData] = useState<Record<string, AppointmentWithDetails[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Generate array of 7 dates starting from weekStart
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = new Date(options.weekStart + 'T00:00:00');
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    
    return dates;
  }, [options.weekStart]);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch appointments for all 7 days in parallel
      const fetchPromises = weekDates.map(date => {
        if (options.doctorId) {
          return getTodayAppointmentsByDoctor(options.doctorId, date);
        }
        return getTodayAppointments(date);
      });

      const results = await Promise.all(fetchPromises);
      
      // Group appointments by date
      const appointmentsByDate: Record<string, AppointmentWithDetails[]> = {};
      weekDates.forEach((date, index) => {
        appointmentsByDate[date] = results[index] || [];
      });

      setData(appointmentsByDate);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch week appointments'));
      setIsLoading(false);
    }
  }, [weekDates, options.doctorId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Get total count of appointments in the week
  const totalAppointments = useMemo(() => {
    return Object.values(data).reduce((sum, appointments) => sum + appointments.length, 0);
  }, [data]);

  return {
    data,
    weekDates,
    isLoading,
    error,
    totalAppointments,
    refetch: fetchAppointments,
  };
};
