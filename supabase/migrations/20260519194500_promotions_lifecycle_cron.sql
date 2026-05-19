-- Sprint 5: cron diario para gestionar ciclo de vida de promociones
-- Se ejecuta diariamente a las 12 UTC (6am Honduras UTC-6).
-- Invoca la edge function mark-promotions-expired que hace:
--   - active → expired (valid_to < today)
--   - draft  → active  (valid_from <= today AND valid_to >= today)
--   - draft  → expired (valid_to < today sin haberse activado)

-- Patron del proyecto: usar anon key Bearer (igual que send-reminders cron).
-- La edge function valida internamente con service_role para acceder a la DB.

SELECT cron.schedule(
  'mark-promotions-lifecycle-daily',
  '0 12 * * *', -- 12:00 UTC = 6:00 am Honduras
  $$
  select net.http_post(
    url := 'https://soxrlxvivuplezssgssq.supabase.co/functions/v1/mark-promotions-expired',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U'
    ),
    body := '{}'::jsonb
  );
  $$
);
