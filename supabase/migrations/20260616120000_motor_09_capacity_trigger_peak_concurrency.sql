-- Motor 09 — Fix de correctitud del trigger de capacidad de recursos.
--
-- BUG (hallado en E2E 16 Jun): la version anterior SUMABA quantity_required de TODAS
-- las citas que se solapan con la ventana del NEW. Eso sobre-cuenta citas SECUENCIALES
-- que usan el mismo recurso (ej. una limpieza 09:00-10:00 seguida de una laser
-- 10:00-10:45 en la misma cabina, nunca simultaneas) como si fueran simultaneas →
-- rechaza inserts validos y esconde disponibilidad real (fuga de oferta en clinicas
-- de alto volumen). Espeja el mismo fix en `_shared/availability.ts` (peakResourceUsage).
--
-- FIX: contar el PICO de uso simultaneo dentro de [v_new_start, v_new_end). La
-- concurrencia es constante a tramos y solo cambia en los INICIOS de cita; el pico se
-- da en uno de: el inicio de la ventana, o el inicio de cada cita existente dentro de
-- la ventana. Se evalua el uso concurrente en cada uno de esos puntos y se toma el max.
-- Half-open [start, end): una cita activa en el instante t si start <= t < end → lo
-- que termina justo cuando la ventana/otra empieza NO cuenta (back-to-back). Mantiene
-- intactas: degradacion (service_type_id/appointment_at NULL), exencion de visita
-- (mismo visit_id no se cuenta a si mismo), y el ERRCODE check_violation.

CREATE OR REPLACE FUNCTION public.validate_appointment_resource_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_buffer    INTEGER;
  v_new_start TIMESTAMPTZ;
  v_new_end   TIMESTAMPTZ;
  v_row       RECORD;
  v_peak      INTEGER;
BEGIN
  -- Degradacion elegante: nada que validar si no hay servicio/horario o si esta cancelada
  IF NEW.service_type_id IS NULL OR NEW.appointment_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('cancelada', 'cancelled', 'canceled') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(buffer_minutes, 0) INTO v_buffer
  FROM public.service_types
  WHERE id = NEW.service_type_id;

  v_new_start := NEW.appointment_at;
  v_new_end   := NEW.appointment_at
                 + ((COALESCE(NEW.duration_minutes, 60) + COALESCE(v_buffer, 0)) * INTERVAL '1 minute');

  -- Por cada recurso que requiere el servicio de NEW, calcular el PICO de uso
  -- simultaneo (no la suma) dentro de la ventana de NEW.
  FOR v_row IN
    SELECT
      r.display_name          AS resource_name,
      r.quantity              AS capacity,
      sr_new.quantity_required AS required_now,
      sr_new.resource_id      AS resource_id
    FROM public.service_resources sr_new
    JOIN public.resources r ON r.id = sr_new.resource_id AND r.is_active = true
    WHERE sr_new.service_type_id = NEW.service_type_id
  LOOP
    SELECT COALESCE(MAX(load_at), 0) INTO v_peak
    FROM (
      -- Uso concurrente de citas EXTERNAS en cada punto de evaluacion `pts.t`.
      SELECT (
        SELECT COALESCE(SUM(sr2.quantity_required), 0)
        FROM public.appointments  a2
        JOIN public.service_resources sr2 ON sr2.service_type_id = a2.service_type_id
        JOIN public.service_types     st2 ON st2.id = a2.service_type_id
        WHERE sr2.resource_id = v_row.resource_id
          AND a2.organization_id = NEW.organization_id
          AND a2.id IS DISTINCT FROM NEW.id
          AND (NEW.visit_id IS NULL OR a2.visit_id IS DISTINCT FROM NEW.visit_id)
          AND a2.appointment_at IS NOT NULL
          AND a2.status NOT IN ('cancelada', 'cancelled', 'canceled')
          AND a2.appointment_at <= pts.t
          AND (a2.appointment_at
                + ((COALESCE(a2.duration_minutes, 60) + COALESCE(st2.buffer_minutes, 0)) * INTERVAL '1 minute')) > pts.t
      ) AS load_at
      FROM (
        -- Puntos de evaluacion: inicio de la ventana + inicios de citas dentro de ella.
        SELECT v_new_start AS t
        UNION
        SELECT a3.appointment_at AS t
        FROM public.appointments  a3
        JOIN public.service_resources sr3 ON sr3.service_type_id = a3.service_type_id
        WHERE sr3.resource_id = v_row.resource_id
          AND a3.organization_id = NEW.organization_id
          AND a3.id IS DISTINCT FROM NEW.id
          AND (NEW.visit_id IS NULL OR a3.visit_id IS DISTINCT FROM NEW.visit_id)
          AND a3.appointment_at IS NOT NULL
          AND a3.status NOT IN ('cancelada', 'cancelled', 'canceled')
          AND a3.appointment_at >  v_new_start
          AND a3.appointment_at <  v_new_end
      ) pts
    ) loads;

    IF v_peak + v_row.required_now > v_row.capacity THEN
      RAISE EXCEPTION
        'RESOURCE_CAPACITY_EXCEEDED: % (capacidad %, pico en uso %, requiere %)',
        v_row.resource_name, v_row.capacity, v_peak, v_row.required_now
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
