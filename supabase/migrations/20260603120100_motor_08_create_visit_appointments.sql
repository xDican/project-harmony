-- Motor de Agendamiento Multi-Recurso — Migration 8: RPC de insert atomico de visita
-- Plan: .claude/plans/fase-5-es-el-shiny-orbit.md (Fase 5, Pieza 2)
--
-- Inserta N citas (una por procedimiento) que comparten un visit_id, en UNA transaccion.
-- El trigger de capacidad (motor_07, visit-aware) corre por fila: las filas de la misma
-- visita ya insertadas NO cuentan entre si (exencion same-visit), pero TODO lo externo
-- sigue contando. Si cualquier fila excede capacidad -> RAISE -> rollback de TODA la visita
-- (cero visitas parciales). Atomicidad garantizada por Postgres.
--
-- Modelo de seguridad: SECURITY DEFINER + chequeo defensivo de org unica. La autorizacion
-- real (roles, ownership de doctor, patient-org) vive en la edge function create-visit que
-- la invoca con service-role, igual que create-appointment hoy. REVOKE a anon/authenticated:
-- no es invocable por clientes directos, solo por el service-role de la EF.

DROP FUNCTION IF EXISTS public.create_visit_appointments(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_visit_appointments(
  p_procedures jsonb,
  p_visit_id   uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE (
  id              uuid,
  visit_id        uuid,
  seq             int,
  doctor_id       uuid,
  service_type_id uuid,
  service_type    text,
  date            date,
  "time"          time,
  appointment_at  timestamptz,
  duration_minutes int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elem jsonb;
  v_time text;
BEGIN
  IF jsonb_typeof(p_procedures) <> 'array' OR jsonb_array_length(p_procedures) = 0 THEN
    RAISE EXCEPTION 'VISIT_EMPTY' USING ERRCODE = 'check_violation';
  END IF;

  -- Todas las filas deben ser de la misma organizacion (chequeo defensivo)
  IF (SELECT count(DISTINCT e->>'organization_id')
        FROM jsonb_array_elements(p_procedures) e) > 1 THEN
    RAISE EXCEPTION 'VISIT_ORG_MISMATCH' USING ERRCODE = 'check_violation';
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_procedures) LOOP
    -- normalizar HH:MM -> HH:MM:SS
    v_time := v_elem->>'time';
    IF v_time ~ '^\d{2}:\d{2}$' THEN
      v_time := v_time || ':00';
    END IF;

    INSERT INTO public.appointments (
      visit_id, doctor_id, patient_id, organization_id, calendar_id,
      service_type_id, service_type, date, "time", appointment_at, duration_minutes,
      status, notes,
      confirmation_message_sent,
      reminder_24h_sent, reminder_24h_sent_at,
      reminder_3d_enabled, reminder_3d_sent, reminder_3d_sent_at,
      reschedule_notified_at
    )
    VALUES (
      p_visit_id,
      (v_elem->>'doctor_id')::uuid,
      (v_elem->>'patient_id')::uuid,
      (v_elem->>'organization_id')::uuid,
      NULLIF(v_elem->>'calendar_id', '')::uuid,
      (v_elem->>'service_type_id')::uuid,
      v_elem->>'service_type',
      (v_elem->>'date')::date,
      v_time::time,
      ((v_elem->>'date') || 'T' || v_time || '-06:00')::timestamptz,
      (v_elem->>'duration_minutes')::int,
      'agendada',
      NULLIF(v_elem->>'notes', ''),
      false,
      -- recordatorio 24h: la EF suprime las filas no-primeras pasando reminder_24h_sent=true
      COALESCE((v_elem->>'reminder_24h_sent')::boolean, false),
      NULL,
      COALESCE((v_elem->>'reminder_3d_enabled')::boolean, false),
      false,
      NULL,
      NULL
    );
  END LOOP;

  RETURN QUERY
    SELECT a.id, a.visit_id,
           row_number() OVER (ORDER BY a.appointment_at)::int AS seq,
           a.doctor_id, a.service_type_id, a.service_type,
           a.date, a."time", a.appointment_at, a.duration_minutes
    FROM public.appointments a
    WHERE a.visit_id = p_visit_id
    ORDER BY a.appointment_at;
END;
$$;

-- Cerrar la RPC: NO debe ser invocable por clientes (anon/authenticated) via REST.
-- La autorizacion vive en la edge function create-visit (service-role). Revocar de
-- PUBLIC (default grant de Postgres) ademas de anon/authenticated, y conceder solo a
-- service_role. Sin esto, un usuario autenticado podria insertar citas saltandose el EF.
REVOKE EXECUTE ON FUNCTION public.create_visit_appointments(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_visit_appointments(jsonb, uuid) TO service_role;

COMMENT ON FUNCTION public.create_visit_appointments(jsonb, uuid) IS
  'Inserta atomicamente N citas (procedimientos) que comparten visit_id. Trigger de capacidad valida cada fila con exencion same-visit; fallo en cualquiera revierte toda la visita. Motor multi-recurso Fase 5, 3 Jun 2026.';
