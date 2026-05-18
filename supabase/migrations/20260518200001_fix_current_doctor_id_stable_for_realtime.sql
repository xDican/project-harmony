-- Sprint 3 Fase 5 (hotfix): cambiar current_doctor_id() de VOLATILE a STABLE.
--
-- Problema: las RLS policies en message_logs / conversations usan
-- current_doctor_id() (v3_message_logs_select_doctor_own y similar).
-- Cuando Supabase Realtime evalua las policies para decidir si entrega un
-- evento al cliente, las funciones VOLATILE rompen la evaluacion y NO se
-- entregan eventos al cliente — el WS queda subscrito pero silencioso.
--
-- La funcion solo hace SELECT (sin INSERT/UPDATE) y no depende de side
-- effects entre llamadas, asi que STABLE es la categoria correcta.
-- Esto ademas habilita optimizaciones del planner.

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.doctor_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = u.id
        AND om.role = 'doctor'::app_role
        AND om.is_active = true
    );
$function$;

COMMENT ON FUNCTION public.current_doctor_id() IS
  'STABLE para que Supabase Realtime pueda evaluar policies que la usan. Sin esto, los eventos postgres_changes no se entregan.';
