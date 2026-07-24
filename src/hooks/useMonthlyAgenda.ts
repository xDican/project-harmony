import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getWeeklyAgenda, AppointmentWithDetails } from '@/lib/api';
import type { Doctor } from '@/types/doctor';

/**
 * Hook para la vista mensual del calendario — mismo endpoint que la vieja
 * agenda semanal (`getWeeklyAgenda`/`get_weekly_agenda`, generico en rango de
 * fechas pese al nombre), pidiendo el mes completo de `monthAnchor` en vez de
 * una semana fija de 7 dias.
 */
export const useMonthlyAgenda = (options: {
  userId: string | undefined;
  monthAnchor: string; // 'yyyy-MM-dd', cualquier dia del mes a mostrar
  doctorId?: string | null;
  enabled?: boolean;
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, AppointmentWithDetails[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Evita que una respuesta vieja (ej. mes anterior, superada por swipe rápido
  // o por un refetch manual disparado mientras la anterior seguía en vuelo)
  // pise datos más nuevos al llegar tarde.
  const requestIdRef = useRef(0);

  const monthStartStr = useMemo(
    () => format(startOfMonth(new Date(options.monthAnchor + 'T00:00:00')), 'yyyy-MM-dd'),
    [options.monthAnchor],
  );
  const monthEndStr = useMemo(
    () => format(endOfMonth(new Date(options.monthAnchor + 'T00:00:00')), 'yyyy-MM-dd'),
    [options.monthAnchor],
  );

  const fetchAgenda = useCallback(async () => {
    if (!options.userId) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWeeklyAgenda(options.userId, monthStartStr, monthEndStr, options.doctorId);
      if (requestIdRef.current !== requestId) return; // superada por un fetch más nuevo

      setDoctors(result.doctors);

      const byDate: Record<string, AppointmentWithDetails[]> = {};
      result.appointments.forEach((apt) => {
        (byDate[apt.date] ??= []).push(apt);
      });
      setAppointmentsByDate(byDate);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch monthly agenda'));
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [options.userId, monthStartStr, monthEndStr, options.doctorId]);

  useEffect(() => {
    if (options.enabled === false) return;
    fetchAgenda();
  }, [fetchAgenda, options.enabled]);

  // Cada clave nace junto con su primer appointment (`(byDate[d] ??= []).push(...)`
  // arriba), así que ninguna queda con length 0 — no hace falta filtrar.
  const daysWithAppointments = useMemo(
    () => new Set(Object.keys(appointmentsByDate)),
    [appointmentsByDate],
  );

  const isSingleDoctorOrg = !isLoading && doctors.length === 1;
  const singleDoctor = isSingleDoctorOrg ? doctors[0] : null;

  return {
    doctors,
    appointmentsByDate,
    daysWithAppointments,
    isLoading,
    error,
    isSingleDoctorOrg,
    singleDoctor,
    refetch: fetchAgenda,
  };
};
