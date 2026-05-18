-- Sprint 3 Fase 5 (hotfix): policy SELECT adicional en message_logs para
-- permitir Realtime entregue eventos a usuarios de la org.
--
-- Las policies existentes (v3_message_logs_select_admin_org, _doctor_own)
-- usan has_role() con clausulas compuestas. Realtime de Supabase a veces no
-- evalua bien policies con funciones SECURITY DEFINER complejas y no entrega
-- los eventos INSERT/UPDATE al cliente aunque el SELECT manual si funcione.
--
-- Esta policy es OR-aditiva: cualquier miembro activo de la org puede leer
-- sus mensajes. Coherente con la policy de conversations (mismo nivel de acceso).

CREATE POLICY message_logs_select_org_member ON public.message_logs FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

COMMENT ON POLICY message_logs_select_org_member ON public.message_logs IS
  'Sprint 3 Fase 5: simplifica SELECT para que Realtime pueda entregar eventos. Coexiste con v3_admin_org y v3_doctor_own (OR de policies).';
