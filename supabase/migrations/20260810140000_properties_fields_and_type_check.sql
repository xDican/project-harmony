-- Piloto bienes raices Bruno: ajustes post-QA de Diego (10 Ago 2026)
-- Campos nuevos + property_type pasa de texto libre a CHECK cerrado
-- (decision explicita de Diego, revierte a proposito la decision original
-- de Fase 1 que lo dejaba libre).

-- Limpieza de las 2 filas de prueba que Diego cargo probando el form
-- ('Casa', 'fggfdg') -- violarian el CHECK de abajo si no se borran antes.
DELETE FROM public.properties
WHERE organization_id = 'c8b1c83b-6982-4d08-bd80-e22388a699ab';

ALTER TABLE public.properties
  ADD COLUMN construction_size_m2 numeric,
  ADD COLUMN parking_spots integer,
  ADD COLUMN front_yard boolean NOT NULL DEFAULT false,
  ADD COLUMN back_yard boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.properties.construction_size_m2 IS
  'Area de construccion en metros cuadrados -- distinto de size_varas (terreno, en varas).';
COMMENT ON COLUMN public.properties.parking_spots IS 'Numero de parqueos.';
COMMENT ON COLUMN public.properties.front_yard IS 'Tiene patio frontal.';
COMMENT ON COLUMN public.properties.back_yard IS 'Tiene patio trasero.';

ALTER TABLE public.properties
  ADD CONSTRAINT properties_property_type_check
  CHECK (property_type IN ('casa', 'apartamento', 'townhouse', 'terreno'));
