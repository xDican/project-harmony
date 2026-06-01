-- Coexistence Fase B (B5): watchdog que apaga sync_in_progress.
--
-- Meta NO emite un evento history_sync_completed. Usamos debounce: cada mensaje
-- historico refresca last_historical_webhook_at (lo hace meta-webhook). Si una
-- linea con sync_in_progress=true lleva >5 min sin recibir mensajes historicos,
-- asumimos que el sync termino y apagamos la bandera (limpia el badge
-- "Sincronizando historial" de B6 y reactiva el procesamiento normal).
--
-- Pura SQL via pg_cron: la logica es un solo UPDATE sobre una tabla chica (1 fila
-- por linea, ~0 filas matchean casi siempre). No necesita edge function — sin cold
-- start, sin HTTP, sin auth. cron.schedule hace upsert por jobname, re-aplicar es seguro.
--
-- Frecuencia cada 2 min (no cada min): el debounce es de 5 min, asi que */2 apaga la
-- bandera ~5-7 min tras terminar el sync (imperceptible) y reduce a la mitad las filas
-- en cron.job_run_details. El query en si es despreciable; el unico costo que escala
-- con la frecuencia son esos logs de ejecucion.

SELECT cron.schedule(
  'coexistence-sync-watchdog',
  '*/2 * * * *', -- cada 2 minutos
  $$
  UPDATE public.whatsapp_lines
  SET sync_in_progress = false
  WHERE sync_in_progress = true
    AND (
      last_historical_webhook_at IS NULL
      OR last_historical_webhook_at < now() - interval '5 minutes'
    );
  $$
);
