-- PatPat Live — Fase 1, migracion 6: en_revision, reserva idempotente, vencimiento con tope.
-- Hallazgos de la revision de coherencia (26 Oct 2026):
--  1. La reserva expiraba mientras Ian verificaba el comprobante -> estado en_revision
--     (no expira, retiene stock) que marca el bot al recibir el comprobante.
--  2. reserve_product SUMABA cantidad en cada llamada -> un reintento reservaba doble.
--     Ahora p_qty = cantidad DESEADA del producto en el pedido (idempotente).
--  3. Cada producto agregado reinicia el reloj, con tope (max_reservation_minutes
--     desde el primer producto) para que nadie retenga piezas indefinidamente.
--  4. Humanos solo pueden cambiar estado/entrega/notas de un pedido (no total ni expires_at).
-- Errores nuevos: ORDEN_CAMPO_PROTEGIDO (PS005).

-- Tope de reserva configurable por organizacion
ALTER TABLE public.store_settings
  ADD COLUMN max_reservation_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_max_gte_reservation
  CHECK (max_reservation_minutes >= reservation_minutes);

-- Estado en_revision
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('reservado', 'en_revision', 'pagado', 'entregado', 'expirado', 'cancelado'));

ALTER TABLE public.orders ADD COLUMN review_started_at timestamptz;

COMMENT ON COLUMN public.orders.review_started_at IS
  'Cuando llego el comprobante y el pedido paso a en_revision. En revision el pedido no expira y retiene el stock hasta que un humano lo apruebe o rechace.';

CREATE INDEX idx_orders_in_review ON public.orders(organization_id) WHERE status = 'en_revision';

-- Transiciones + guarda de columnas + sellos
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_minutes integer;
BEGIN
  -- Llamadas de cliente (auth.uid() presente): solo estado, entrega y notas.
  -- Bot y cron (service_role / postgres) no tienen auth.uid() y quedan exentos.
  IF auth.uid() IS NOT NULL AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
    OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
    OR NEW.paid_by IS DISTINCT FROM OLD.paid_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.review_started_at IS DISTINCT FROM OLD.review_started_at
  ) THEN
    RAISE EXCEPTION 'ORDEN_CAMPO_PROTEGIDO: solo se pueden cambiar estado, entrega, direccion y notas'
      USING ERRCODE = 'PS005';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'reservado' AND NEW.status IN ('en_revision', 'pagado', 'expirado', 'cancelado'))
      OR (OLD.status = 'en_revision' AND NEW.status IN ('pagado', 'cancelado', 'reservado'))
      OR (OLD.status = 'pagado' AND NEW.status IN ('entregado', 'cancelado'))
    ) THEN
      RAISE EXCEPTION 'ORDEN_TRANSICION_INVALIDA: % -> % no permitido', OLD.status, NEW.status
        USING ERRCODE = 'PS003';
    END IF;

    IF NEW.status = 'pagado' THEN
      NEW.paid_at := now();
      NEW.paid_by := auth.uid();
    ELSIF NEW.status = 'en_revision' THEN
      NEW.review_started_at := now();
    ELSIF NEW.status = 'reservado' THEN
      -- en_revision -> reservado: "la imagen no era un comprobante"; reloj nuevo.
      SELECT reservation_minutes INTO v_minutes
      FROM public.store_settings WHERE organization_id = NEW.organization_id;
      NEW.expires_at := now() + make_interval(mins => COALESCE(v_minutes, 30));
      NEW.review_started_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Reserva idempotente: p_qty = cantidad DESEADA de este producto en el pedido
-- abierto (0 = quitarlo). Un reintento con la misma cantidad no cambia nada ni
-- extiende el reloj; el reloj solo se reinicia cuando la cantidad SUBE.
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
  v_has_order boolean;
  v_cur_qty integer := 0;
  v_unit_price numeric;
  v_delta integer;
  v_minutes integer;
  v_max_minutes integer;
  v_items integer;
BEGIN
  IF p_qty IS NULL OR p_qty < 0 THEN
    RAISE EXCEPTION 'SOLICITUD_INVALIDA: cantidad debe ser >= 0' USING ERRCODE = 'PS004';
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCTO_NO_DISPONIBLE: producto inexistente' USING ERRCODE = 'PS002';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE conversation_id = p_conversation
    AND status = 'reservado'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_has_order := FOUND;

  v_unit_price := v_product.price;
  IF v_has_order THEN
    SELECT quantity, unit_price INTO v_cur_qty, v_unit_price
    FROM public.order_items
    WHERE order_id = v_order.id AND product_id = v_product.id;
    IF NOT FOUND THEN
      v_cur_qty := 0;
      v_unit_price := v_product.price;
    END IF;
  END IF;

  v_delta := p_qty - v_cur_qty;

  IF v_delta = 0 THEN
    RETURN CASE WHEN v_has_order THEN v_order.id ELSE NULL END;
  END IF;

  IF v_delta > 0 THEN
    IF NOT v_product.active THEN
      RAISE EXCEPTION 'PRODUCTO_NO_DISPONIBLE: producto inactivo' USING ERRCODE = 'PS002';
    END IF;
    IF v_product.stock < v_delta THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE: % tiene % disponible(s), se pidieron % mas',
        v_product.code, v_product.stock, v_delta USING ERRCODE = 'PS001';
    END IF;
    IF v_has_order AND v_order.currency <> v_product.currency THEN
      RAISE EXCEPTION 'SOLICITUD_INVALIDA: moneda distinta a la del pedido abierto' USING ERRCODE = 'PS004';
    END IF;
  END IF;

  SELECT COALESCE(reservation_minutes, 30), COALESCE(max_reservation_minutes, 60)
  INTO v_minutes, v_max_minutes
  FROM public.store_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    v_minutes := 30;
    v_max_minutes := 60;
  END IF;

  IF NOT v_has_order THEN
    -- v_delta > 0 aqui: no hay pedido abierto y p_qty > 0
    INSERT INTO public.orders (
      organization_id, conversation_id, customer_phone, customer_name,
      currency, expires_at
    ) VALUES (
      p_org, p_conversation, p_phone, p_name,
      v_product.currency, now() + make_interval(mins => v_minutes)
    )
    RETURNING * INTO v_order;
  END IF;

  IF p_qty = 0 THEN
    DELETE FROM public.order_items
    WHERE order_id = v_order.id AND product_id = v_product.id;
  ELSE
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_order.id, v_product.id, p_qty, v_unit_price, v_unit_price * p_qty)
    ON CONFLICT (order_id, product_id) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          subtotal = public.order_items.unit_price * EXCLUDED.quantity;
  END IF;

  UPDATE public.products SET stock = stock - v_delta WHERE id = v_product.id;

  SELECT count(*) INTO v_items FROM public.order_items WHERE order_id = v_order.id;

  UPDATE public.orders
  SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM public.order_items WHERE order_id = v_order.id),
      -- el reloj solo se reinicia cuando la cantidad sube, con tope desde el primer producto
      expires_at = CASE
        WHEN v_delta > 0 THEN LEAST(
          now() + make_interval(mins => v_minutes),
          created_at + make_interval(mins => v_max_minutes))
        ELSE expires_at
      END,
      status = CASE WHEN v_items = 0 THEN 'cancelado' ELSE status END
  WHERE id = v_order.id;

  RETURN v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_product(uuid, uuid, text, text, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_product(uuid, uuid, text, text, uuid, integer)
  TO service_role;

-- El bot llama esto al recibir una imagen mientras hay un pedido abierto.
-- Devuelve el id del pedido, o NULL si no hay pedido que revisar (p. ej. ya expiro).
CREATE OR REPLACE FUNCTION public.mark_order_in_review(p_org uuid, p_conversation uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE organization_id = p_org
    AND conversation_id = p_conversation
    AND (status = 'en_revision' OR (status = 'reservado' AND expires_at > now()))
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.status = 'reservado' THEN
    UPDATE public.orders SET status = 'en_revision' WHERE id = v_order.id;
  END IF;
  RETURN v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_in_review(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_in_review(uuid, uuid) TO service_role;

-- Funciones de trigger: no deben ser invocables por RPC (el privilegio EXECUTE
-- solo se chequea al crear el trigger, no al dispararlo).
REVOKE ALL ON FUNCTION public.generate_product_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_stock() FROM PUBLIC, anon, authenticated;
