-- PatPat Live — Fase 1, migracion 2/3: catalogo de productos + bucket de fotos.
-- Patron clonado de properties (20260810120000_bruno_properties_schema.sql).
-- Pieza unica = stock 1. Variantes (talla/color) = productos separados.

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'HNL',
  stock integer NOT NULL DEFAULT 1 CHECK (stock >= 0),
  photos text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_products_org_active ON public.products(organization_id, active);

COMMENT ON TABLE public.products IS
  'Catalogo de productos (vertical ventas / PatPat Live). stock se descuenta solo via reserve_product y se devuelve via trigger de orders.';

-- Codigo secuencial por organizacion (A101, A102, ...) con el prefijo de
-- store_settings. El advisory lock evita codigos duplicados si dos inserts
-- concurren (el MAX()+1 solo no es atomico).
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix text;
  next_num integer;
BEGIN
  IF NEW.code IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('products_code:' || NEW.organization_id::text, 0));

    SELECT code_prefix INTO v_prefix
    FROM public.store_settings
    WHERE organization_id = NEW.organization_id;
    v_prefix := COALESCE(v_prefix, 'A');

    SELECT COALESCE(MAX(substring(code from ('^' || v_prefix || '(\d+)$'))::integer), 100) + 1
    INTO next_num
    FROM public.products
    WHERE organization_id = NEW.organization_id;

    NEW.code := v_prefix || next_num;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_generate_code
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_code();

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Lectura: toda la org. Escritura: solo admin de la org (secretary no edita catalogo).
CREATE POLICY products_select ON public.products FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY products_insert ON public.products FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

CREATE POLICY products_update ON public.products FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

CREATE POLICY products_delete ON public.products FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  );

-- Bucket product-photos: clon de property-photos. Privado, 5MB, jpeg/png
-- (Meta WhatsApp da error 131053 con WebP). Path: {organization_id}/product-{uuid}.{ext}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png']
);

CREATE POLICY product_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY product_photos_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-photos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY product_photos_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-photos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT public.get_user_organizations(auth.uid())
    )
  );

CREATE POLICY product_photos_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-photos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
