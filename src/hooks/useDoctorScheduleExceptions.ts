/**
 * useDoctorScheduleExceptions — hook para listar/crear/borrar bloqueos de
 * horario de un doctor.
 *
 * Fase 2 del bloqueador de horario (origen: Wilmer). Patron consistente con
 * usePromotions/useQuickReplies (useState + useCallback + useEffect, sin
 * react-query). Sin logica de presentacion aqui — los textos van en el
 * componente que consume el hook.
 */

import { useCallback, useEffect, useState } from "react";
import {
  checkConflicts,
  createException,
  deleteException,
  listExceptions,
  type ConflictingAppointment,
  type CreateExceptionResult,
  type DoctorScheduleException,
} from "@/lib/doctorScheduleExceptionsApi";

export function useDoctorScheduleExceptions(doctorId: string | undefined) {
  const [exceptions, setExceptions] = useState<DoctorScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!doctorId) {
      setExceptions([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const rows = await listExceptions(doctorId);
      setExceptions(rows);
    } catch (e) {
      console.error("[useDoctorScheduleExceptions] fetch failed:", e);
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  const checkConflictsFor = useCallback(
    async (startAt: string, endAt: string): Promise<ConflictingAppointment[]> => {
      if (!doctorId) return [];
      return checkConflicts(doctorId, startAt, endAt);
    },
    [doctorId],
  );

  const create = useCallback(
    async (
      startAt: string,
      endAt: string,
      reason?: string,
    ): Promise<CreateExceptionResult> => {
      if (!doctorId) return { success: false, error: "Sin doctor activo" };
      const result = await createException(doctorId, startAt, endAt, reason);
      if (result.success) await refetch();
      return result;
    },
    [doctorId, refetch],
  );

  const remove = useCallback(async (id: string) => {
    await deleteException(id);
    setExceptions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    exceptions,
    isLoading,
    error,
    refetch,
    checkConflicts: checkConflictsFor,
    createException: create,
    deleteException: remove,
  };
}
