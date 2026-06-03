-- Motor de Agendamiento Multi-Recurso — Migration 7: trigger de capacidad visit-aware
-- Plan: .claude/plans/fase-5-es-el-shiny-orbit.md (Fase 5, Pieza 1)
-- Identica a 20260602120005_motor_06_capacity_trigger.sql EXCEPTO un predicado nuevo:
-- los procedimientos de la MISMA visita (visit_id) no cuentan entre si para capacidad.
--
-- Por que: una visita multi-procedimiento son citas secuenciales back-to-back (intervalos
-- disjuntos, nunca simultaneos). El unico solape posible entre ellas es el buffer, que por
-- diseno NO aplica dentro de una visita (el buffer = limpieza para la SIGUIENTE cita externa).
-- Sin esta exencion, dos procedimientos de una visita que comparten recurso se auto-bloquearian.
--
-- Backward-compat GARANTIZADO: el guard `NEW.visit_id IS NULL OR ...` deja el comportamiento
-- byte-identico para todo agendamiento de hoy (visit_id NULL). NOTA: el predicado solo
-- `a.visit_id IS DISTINCT FROM NEW.visit_id` NO basta porque `NULL IS DISTINCT FROM NULL` = FALSE,
-- lo que eximiria filas null no relacionadas entre si. El guard lo previene.

CREATE OR REPLACE FUNCTION public.validate_appointment_resource_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffer    INTEGER;
  v_new_start TIMESTAMPTZ;
  v_new_end   TIMESTAMPTZ;
  v_row       RECORD;
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

  -- Por cada recurso que requiere el servicio de NEW, contar consumo solapado
  FOR v_row IN
    SELECT
      r.display_name AS resource_name,
      r.quantity     AS capacity,
      sr_new.quantity_required AS required_now,
      COALESCE((
        SELECT SUM(sr_other.quantity_required)
        FROM public.appointments a
        JOIN public.service_resources sr_other ON sr_other.service_type_id = a.service_type_id
        JOIN public.service_types     st_other ON st_other.id = a.service_type_id
        WHERE sr_other.resource_id = sr_new.resource_id
          AND a.organization_id = NEW.organization_id
          AND a.id IS DISTINCT FROM NEW.id
          -- Exencion same-visit: los procedimientos de la misma visita no se cuentan entre si.
          AND (NEW.visit_id IS NULL OR a.visit_id IS DISTINCT FROM NEW.visit_id)
          AND a.appointment_at IS NOT NULL
          AND a.status NOT IN ('cancelada', 'cancelled', 'canceled')
          -- overlap
          AND v_new_start < (a.appointment_at
                + ((COALESCE(a.duration_minutes, 60) + COALESCE(st_other.buffer_minutes, 0)) * INTERVAL '1 minute'))
          AND a.appointment_at < v_new_end
      ), 0) AS used
    FROM public.service_resources sr_new
    JOIN public.resources r ON r.id = sr_new.resource_id AND r.is_active = true
    WHERE sr_new.service_type_id = NEW.service_type_id
  LOOP
    IF v_row.used + v_row.required_now > v_row.capacity THEN
      RAISE EXCEPTION
        'RESOURCE_CAPACITY_EXCEEDED: % (capacidad %, en uso %, requiere %)',
        v_row.resource_name, v_row.capacity, v_row.used, v_row.required_now
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_validate_resource_capacity ON public.appointments;
CREATE TRIGGER appointments_validate_resource_capacity
  BEFORE INSERT OR UPDATE OF appointment_at, duration_minutes, service_type_id, status
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_resource_capacity();

-- Es una funcion de trigger: no debe ser invocable como RPC. El trigger la ejecuta igual.
REVOKE EXECUTE ON FUNCTION public.validate_appointment_resource_capacity() FROM anon, authenticated;

COMMENT ON FUNCTION public.validate_appointment_resource_capacity() IS
  'Valida capacidad de recursos (cabinas/equipos) al crear/reagendar citas. Protege bot + edge functions. Exime procedimientos de la misma visita (visit_id). Motor multi-recurso Fase 5, 3 Jun 2026.';
