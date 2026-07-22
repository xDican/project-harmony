-- Bloqueador de horario (Fase 1): schema + RLS + trigger de conflicto.
-- Feature originado por Wilmer Guevara (cliente ancla, org 1-doctor/1-calendario):
-- necesita bloquear rangos puntuales (horas a semanas) en su propio calendario para
-- que el motor de disponibilidad deje de ofrecerlos como libres. NO reemplaza
-- doctor_schedules/calendar_schedules (horario semanal recurrente) — es una resta
-- puntual sobre el calculo de disponibilidad (fase 2, _shared/availability.ts,
-- fuera de alcance de esta migracion).

CREATE TABLE IF NOT EXISTS public.doctor_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doctor_schedule_exceptions_end_after_start CHECK (end_at > start_at)
);

COMMENT ON TABLE public.doctor_schedule_exceptions IS
  'Bloqueos puntuales de rango continuo (no recurrentes) sobre el calendario de un doctor. Resta al calculo de disponibilidad (fase 2). Inmutable: se borra y se recrea, no se edita. Bloqueador de horario, 22 Jul 2026.';
COMMENT ON COLUMN public.doctor_schedule_exceptions.reason IS
  'Motivo opcional visible solo para admin/secretary/el propio doctor (ej. "vacaciones", "compromiso personal"). No se expone al paciente ni al bot.';
COMMENT ON COLUMN public.doctor_schedule_exceptions.created_by IS
  'Solo auditoria (quien lo creo). Los permisos NUNCA se derivan de esta columna, se resuelven via RLS (has_role + current_doctor_id).';

-- Indice compuesto: cubre tanto "todos los bloqueos de este doctor" (prefijo
-- doctor_id) como "bloqueos de este doctor que se solapan con [a,b)" (el trigger
-- de conflicto de citas de esta misma migracion, y en fase 2 el calculo de
-- disponibilidad). No se usa GiST/EXCLUDE porque el solapamiento real (contra
-- `appointments`, no contra si misma) se valida en el trigger, que necesita
-- devolver detalle (conteo + ids) y no solo rechazar — un EXCLUDE constraint
-- no permite eso.
CREATE INDEX IF NOT EXISTS doctor_schedule_exceptions_doctor_range_idx
  ON public.doctor_schedule_exceptions(doctor_id, start_at, end_at);

-- RLS
ALTER TABLE public.doctor_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/secretary ven cualquier bloqueo de su organizacion (via join a
-- doctors, ya que esta tabla no tiene organization_id propia); doctor ve solo
-- el suyo. Mirror exacto del patron de `appointments`, NO del patron mas
-- restrictivo de `doctor_schedules` (decision explicita de Diego).
CREATE POLICY doctor_schedule_exceptions_select
  ON public.doctor_schedule_exceptions
  FOR SELECT
  TO authenticated
  USING (
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
      AND doctor_id IN (
        SELECT d.id FROM public.doctors d
        WHERE d.organization_id IN (SELECT get_user_organizations(auth.uid()))
      )
    )
    OR (
      has_role(auth.uid(), 'doctor'::app_role)
      AND doctor_id = current_doctor_id()
    )
  );

-- INSERT: mismo criterio aplicado a la fila propuesta.
CREATE POLICY doctor_schedule_exceptions_insert
  ON public.doctor_schedule_exceptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
      AND doctor_id IN (
        SELECT d.id FROM public.doctors d
        WHERE d.organization_id IN (SELECT get_user_organizations(auth.uid()))
      )
    )
    OR (
      has_role(auth.uid(), 'doctor'::app_role)
      AND doctor_id = current_doctor_id()
    )
  );

-- DELETE: mismo criterio. No hay politica de UPDATE a proposito (ver migracion
-- del diseño): con RLS habilitado y sin policy de UPDATE, cualquier intento de
-- UPDATE es denegado por defecto para todos los roles, incluso admin — la
-- inmutabilidad ("se borra y se crea de nuevo") queda garantizada a nivel de DB,
-- no solo como convencion de UI/API.
CREATE POLICY doctor_schedule_exceptions_delete
  ON public.doctor_schedule_exceptions
  FOR DELETE
  TO authenticated
  USING (
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
      AND doctor_id IN (
        SELECT d.id FROM public.doctors d
        WHERE d.organization_id IN (SELECT get_user_organizations(auth.uid()))
      )
    )
    OR (
      has_role(auth.uid(), 'doctor'::app_role)
      AND doctor_id = current_doctor_id()
    )
  );

-- Trigger de conflicto: rechaza el bloqueo si hay citas activas (no canceladas)
-- que se solapan con [start_at, end_at). Defensa doble junto con un pre-chequeo
-- en el hook de fase 2 (que muestra al usuario la lista legible de citas antes
-- de intentar el INSERT); este trigger es la red de seguridad atomica contra
-- condiciones de carrera.
CREATE OR REPLACE FUNCTION public.validate_doctor_schedule_exception_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict_count INTEGER;
  v_conflict_ids   UUID[];
BEGIN
  SELECT COUNT(*), COALESCE(ARRAY_AGG(a.id ORDER BY a.appointment_at), '{}')
  INTO v_conflict_count, v_conflict_ids
  FROM public.appointments a
  WHERE a.doctor_id = NEW.doctor_id
    AND a.appointment_at IS NOT NULL
    AND NOT (a.status = ANY (ARRAY['cancelled', 'canceled', 'cancelada']))
    AND a.appointment_at < NEW.end_at
    AND (a.appointment_at
          + (COALESCE(a.duration_minutes, 60) * INTERVAL '1 minute')) > NEW.start_at;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION
      'DOCTOR_SCHEDULE_CONFLICT: % cita(s) activa(s) se solapan con el bloqueo propuesto (doctor_id=%, appointment_ids=%)',
      v_conflict_count, NEW.doctor_id, v_conflict_ids
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS doctor_schedule_exceptions_conflict_check ON public.doctor_schedule_exceptions;
CREATE TRIGGER doctor_schedule_exceptions_conflict_check
  BEFORE INSERT ON public.doctor_schedule_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_doctor_schedule_exception_conflicts();
