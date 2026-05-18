-- Sprint 3 Fase 5: habilitar Realtime para tablas del inbox.
-- Permite que el frontend reciba eventos INSERT/UPDATE en tiempo real
-- via supabase.channel(). Sin esto los cambios no se propagan.

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
