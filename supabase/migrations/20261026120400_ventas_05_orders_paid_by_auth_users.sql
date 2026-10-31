-- PatPat Live — Fase 1, migracion 5: orders.paid_by -> auth.users.
-- Hallazgo en verificacion: 2 de 68 miembros activos de org_members no tienen
-- fila en public.users, asi que marcar un pedido como pagado fallaria por FK
-- para ellos. auth.uid() siempre existe en auth.users (igual que org_members.user_id).

ALTER TABLE public.orders DROP CONSTRAINT orders_paid_by_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_paid_by_fkey
  FOREIGN KEY (paid_by) REFERENCES auth.users(id) ON DELETE SET NULL;
