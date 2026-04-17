import { useEffect, useState, useCallback, useMemo } from 'react';
import { getWeekAppointments, AppointmentWithDetails } from '@/lib/api';

/**
 * Hook to fetch appointments for a week range using a single query
 *
 * @param options - Configuration object
 * @param options.doctorId - If provided, fetches appointments for specific doctor only
 * @param options.weekStart - ISO date string for the start of the week (YYYY-MM-DD)
 * @param options.enabled - If false, skips fetching
 * @returns Object with appointments grouped by date, loading state, and refetch function
 */
export const useWeekAppointments = (options: {
  doctorId?: string | null;
  weekStart: string; // ISO date string "YYYY-MM-DD"
  enabled?: boolean;
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

  // Calculate week end date string
  const weekEndStr = weekDates[weekDates.length - 1];

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Single query for entire week range
      const allAppointments = await getWeekAppointments(
        options.weekStart,
        weekEndStr,
        options.doctorId
      );

      // Group appointments by date
      const appointmentsByDate: Record<string, AppointmentWithDetails[]> = {};
      weekDates.forEach(date => {
        appointmentsByDate[date] = [];
      });
      allAppointments.forEach(apt => {
        if (appointmentsByDate[apt.date]) {
          appointmentsByDate[apt.date].push(apt);
        }
      });

      setData(appointmentsByDate);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch week appointments'));
      setIsLoading(false);
    }
  }, [options.weekStart, weekEndStr, options.doctorId, weekDates]);

  useEffect(() => {
    if (options.enabled === false) return;
    fetchAppointments();
  }, [fetchAppointments, options.enabled]);

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
