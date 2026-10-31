-- PatPat Live — Fase 1, migracion 3/3: pedidos, reserva atomica de stock y expiracion.
--
-- Ciclo de vida:  reservado -> pagado -> entregado
--                 reservado -> expirado | cancelado     pagado -> cancelado
-- Quien: el bot crea 'reservado' (solo via reserve_product, service_role);
-- un humano (admin/secretary de la org) marca pagado/entregado/cancelado;
-- el cron marca expirado. El stock se descuenta al reservar y se devuelve en
-- UN solo lugar (trigger AFTER UPDATE), venga del cron o de un humano.
--
-- Errores de negocio (el hook parsea error.message):
--   STOCK_INSUFICIENTE (PS001), PRODUCTO_NO_DISPONIBLE (PS002),
--   ORDEN_TRANSICION_INVALIDA (PS003), SOLICITUD_INVALIDA (PS004)

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'reservado'
    CHECK (status IN ('reservado', 'pagado', 'entregado', 'expirado', 'cancelado')),
  delivery_method text CHECK (delivery_method IN ('envio', 'retiro')),
  delivery_address text,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  currency text NOT NULL DEFAULT 'HNL',
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  paid_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_org_status ON public.orders(organization_id, status, created_at DESC);
CREATE INDEX idx_orders_conversation ON public.orders(conversation_id);
CREATE INDEX idx_orders_expiry ON public.orders(expires_at) WHERE status = 'reservado';

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0), -- snapshot del precio al reservar
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  UNIQUE (order_id, product_id)
);

CREATE INDEX idx_order_items_product ON public.order_items(product_id);

COMMENT ON TABLE public.orders IS
  'Pedidos de la vertical ventas. Creados solo por reserve_product (service_role); humanos solo cambian estado.';

-- Producto de interes del lead (mismo patron que interest_property_id)
ALTER TABLE public.conversations
  ADD COLUMN interest_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.conversations.interest_product_id IS
  'Producto de interes del lead (vertical ventas). Se fija al matchear el codigo de la captura.';

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: sin policy de INSERT en orders/order_items => authenticated no puede crear.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select ON public.orders FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY orders_update ON public.orders FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY orders_delete ON public.orders FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

CREATE POLICY order_items_select ON public.order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders
    WHERE organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  ));

-- Transiciones validas + sello de pago
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'reservado' AND NEW.status IN ('pagado', 'expirado', 'cancelado'))
      OR (OLD.status = 'pagado' AND NEW.status IN ('entregado', 'cancelado'))
    ) THEN
      RAISE EXCEPTION 'ORDEN_TRANSICION_INVALIDA: % -> % no permitido', OLD.status, NEW.status
        USING ERRCODE = 'PS003';
    END IF;

    IF NEW.status = 'pagado' THEN
      NEW.paid_at := now();
      NEW.paid_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_validate_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

-- Devolver stock al expirar/cancelar. SECURITY DEFINER: el humano que cancela
-- (secretary) no tiene permiso de UPDATE sobre products por RLS.
CREATE OR REPLACE FUNCTION public.release_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('expirado', 'cancelado') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.products p
    SET stock = p.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_release_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_order_stock();

-- Reserva atomica: bloquea la fila del producto, valida stock, descuenta y
-- agrega a la orden abierta de la conversacion (o crea una). Precio siempre de BD.
CREATE OR REPLACE FUNCTION public.reserve_product(
  p_org uuid,
  p_conversation uuid,
  p_phone text,
  p_name text,
  p_product uuid,
  p_qty integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_minutes integer;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RAISE EXCEPTION 'SOLICITUD_INVALIDA: cantidad debe ser >= 1' USING ERRCODE = 'PS004';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation AND organization_id = p_org
  ) THEN
    RAISE EXCEPTION 'SOLICITUD_INVALIDA: conversacion no pertenece a la organizacion' USING ERRCODE = 'PS004';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product AND organization_id = p_org
  FOR UPDATE;

  IF NOT FOUND OR NOT v_product.active THEN
    RAISE EXCEPTION 'PRODUCTO_NO_DISPONIBLE: producto inexistente o inactivo' USING ERRCODE = 'PS002';
  END IF;

  IF v_product.stock < p_qty THEN
    RAISE EXCEPTION 'STOCK_INSUFICIENTE: % tiene % disponible(s), se pidieron %',
      v_product.code, v_product.stock, p_qty USING ERRCODE = 'PS001';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE conversation_id = p_conversation
    AND status = 'reservado'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT reservation_minutes INTO v_minutes
    FROM public.store_settings WHERE organization_id = p_org;

    INSERT INTO public.orders (
      organization_id, conversation_id, customer_phone, customer_name,
      currency, expires_at
    ) VALUES (
      p_org, p_conversation, p_phone, p_name,
      v_product.currency, now() + make_interval(mins => COALESCE(v_minutes, 30))
    )
    RETURNING * INTO v_order;
  ELSIF v_order.currency <> v_product.currency THEN
    RAISE EXCEPTION 'SOLICITUD_INVALIDA: moneda distinta a la del pedido abierto' USING ERRCODE = 'PS004';
  END IF;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, subtotal)
  VALUES (v_order.id, v_product.id, p_qty, v_product.price, v_product.price * p_qty)
  ON CONFLICT (order_id, product_id) DO UPDATE
    SET quantity = public.order_items.quantity + EXCLUDED.quantity,
        subtotal = public.order_items.subtotal + EXCLUDED.subtotal;

  UPDATE public.products SET stock = stock - p_qty WHERE id = v_product.id;

  UPDATE public.orders
  SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM public.order_items WHERE order_id = v_order.id)
  WHERE id = v_order.id;

  RETURN v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_product(uuid, uuid, text, text, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_product(uuid, uuid, text, text, uuid, integer)
  TO service_role;

-- Expiracion: el trigger orders_release_stock devuelve el stock.
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.orders
    SET status = 'expirado'
    WHERE status = 'reservado' AND expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_reservations()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_reservations() TO service_role;

-- Cron cada minuto, SQL directo (sin edge function ni anon key).
SELECT cron.schedule(
  'expire-order-reservations',
  '* * * * *',
  $$select public.expire_reservations()$$
);
