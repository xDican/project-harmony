-- Add optional service types to WhatsApp lines (bot booking flow)
ALTER TABLE whatsapp_lines
ADD COLUMN bot_service_types JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Track which service type was selected when booking via bot
ALTER TABLE appointments
ADD COLUMN service_type TEXT;
