-- Add 3-day reminder columns to appointments table
-- Opt-in per appointment: checkbox in NuevaCita enables reminder_3d_enabled
-- Default false so existing appointments and bot-created ones are unaffected

ALTER TABLE appointments
  ADD COLUMN reminder_3d_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN reminder_3d_sent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN reminder_3d_sent_at TIMESTAMPTZ DEFAULT NULL;
