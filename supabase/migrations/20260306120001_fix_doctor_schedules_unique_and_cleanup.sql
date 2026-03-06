-- Fix: replace restrictive UNIQUE constraint that only allows 1 slot per day
-- with one that allows multiple slots per day (different start_time)
ALTER TABLE public.doctor_schedules
  DROP CONSTRAINT doctor_schedules_unique_doctor_dow;

ALTER TABLE public.doctor_schedules
  ADD CONSTRAINT doctor_schedules_unique_doctor_dow_start
  UNIQUE (doctor_id, day_of_week, start_time);

-- Cleanup Consultorio Familiar: move appointments from orphan to active calendar
UPDATE appointments SET calendar_id = 'aca2eab1-708c-4cba-a077-a663a1833450'
WHERE calendar_id = '6fe46416-ef9e-4144-a442-1ecaad97480c';

-- Delete whatsapp_line_doctors from orphan (active calendar already has its own)
DELETE FROM whatsapp_line_doctors
WHERE calendar_id = '6fe46416-ef9e-4144-a442-1ecaad97480c';

-- Delete orphan calendar (CASCADE deletes calendar_doctors and calendar_schedules)
DELETE FROM calendars WHERE id = '6fe46416-ef9e-4144-a442-1ecaad97480c';

-- Cleanup Nuva clinica: delete orphan calendar (no appointment dependencies)
DELETE FROM calendars WHERE id = 'e1c972de-6915-4e13-a0c7-997a663e154c';
