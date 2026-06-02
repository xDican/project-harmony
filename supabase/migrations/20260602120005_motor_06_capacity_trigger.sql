-- Motor de Agendamiento Multi-Recurso — Migration 6/6: trigger de capacidad de recursos
-- Plan: .claude/plans/no-quiero-que-revises-deep-rocket.md
-- Defensa en profundidad: valida que ninguna cita exceda la capacidad de un recurso.
-- Protege AMBOS caminos de escritura (bot INSERT directo + create-appointment EF) con UNA logica.
-- Degradacion elegante: sin service_type_id o sin receta -> no-op (clientes actuales intactos).
--
-- Overlap entre intervalos [start, start+duration+buffer):
--   NEW_start < OTHER_end  AND  OTHER_start < NEW_end
-- El buffer ocupa cabina+profesional (no la maquina), pero se aplica al intervalo completo
-- de forma conservadora en v1 (simple y seguro). Sin cooldown de maquina (Skin Medic A4.6).

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
  'Valida capacidad de recursos (cabinas/equipos) al crear/reagendar citas. Protege bot + edge functions. Motor multi-recurso 2 Jun 2026.';
