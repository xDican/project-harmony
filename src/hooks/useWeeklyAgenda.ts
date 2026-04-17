import { useEffect, useState, useCallback, useMemo } from 'react';
import { getWeeklyAgenda, AppointmentWithDetails } from '@/lib/api';
import type { Doctor } from '@/types/doctor';

/**
 * Hook that fetches doctors + appointments in a single RPC call.
 * Replaces useWeekAppointments + useDoctors for AgendaSemanal.
 *
 * On 3G this saves ~8-15 seconds by eliminating 10+ round trips to Supabase.
 */
export const useWeeklyAgenda = (options: {
  userId: string | undefined;
  weekStart: string; // ISO "YYYY-MM-DD"
  doctorId?: string | null;
  enabled?: boolean;
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, AppointmentWithDetails[]>>({});
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

  const weekEndStr = weekDates[weekDates.length - 1];

  const fetchAgenda = useCallback(async () => {
    if (!options.userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWeeklyAgenda(
        options.userId,
        options.weekStart,
        weekEndStr,
        options.doctorId
      );

      setDoctors(result.doctors);

      // Group appointments by date
      const byDate: Record<string, AppointmentWithDetails[]> = {};
      weekDates.forEach(date => { byDate[date] = []; });
      result.appointments.forEach(apt => {
        if (byDate[apt.date]) {
          byDate[apt.date].push(apt);
        }
      });
      setAppointmentsByDate(byDate);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weekly agenda'));
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.weekStart, weekEndStr, options.doctorId, weekDates]);

  useEffect(() => {
    if (options.enabled === false) return;
    fetchAgenda();
  }, [fetchAgenda, options.enabled]);

  // Prefetch adjacent weeks in background after current week loads
  useEffect(() => {
    if (isLoading || !options.userId) return;
    const timer = setTimeout(() => {
      const prevStart = new Date(options.weekStart + 'T00:00:00');
      prevStart.setDate(prevStart.getDate() - 7);
      const nextStart = new Date(options.weekStart + 'T00:00:00');
      nextStart.setDate(nextStart.getDate() + 7);

      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const fmtEnd = (start: string) => {
        const d = new Date(start + 'T00:00:00');
        d.setDate(d.getDate() + 6);
        return fmt(d);
      };

      const prevStr = fmt(prevStart);
      const nextStr = fmt(nextStart);
      // Fire and forget — results warm the browser/Supabase cache
      getWeeklyAgenda(options.userId!, prevStr, fmtEnd(prevStr), options.doctorId).catch(() => {});
      getWeeklyAgenda(options.userId!, nextStr, fmtEnd(nextStr), options.doctorId).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading, options.userId, options.weekStart, options.doctorId]);

  const isSingleDoctorOrg = !isLoading && doctors.length === 1;
  const singleDoctor = isSingleDoctorOrg ? doctors[0] : null;

  const totalAppointments = useMemo(() => {
    return Object.values(appointmentsByDate).reduce((sum, apts) => sum + apts.length, 0);
  }, [appointmentsByDate]);

  return {
    doctors,
    appointmentsByDate,
    weekDates,
    isLoading,
    error,
    totalAppointments,
    isSingleDoctorOrg,
    singleDoctor,
    refetch: fetchAgenda,
  };
};
