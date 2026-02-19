-- STEP 6: Seed current WhatsApp line (register existing Twilio number)
-- NOTE: This is a data migration with environment-specific values.
-- Credentials are stored in the DB row, not in code.
-- When replaying on a fresh DB, replace placeholder values with actual credentials.

-- Insert the current Twilio number as a whatsapp_line
INSERT INTO public.whatsapp_lines (
  organization_id, label, phone_number, provider,
  twilio_account_sid, twilio_auth_token, twilio_phone_from,
  twilio_messaging_service_sid, twilio_template_confirmation,
  twilio_template_reminder, twilio_template_reschedule,
  bot_enabled, is_active
)
SELECT
  o.id,
  'Línea Principal',
  '+50493133496',
  'twilio',
  '{{TWILIO_ACCOUNT_SID}}',
  '{{TWILIO_AUTH_TOKEN}}',
  'whatsapp:+50493133496',
  '{{TWILIO_MESSAGING_SERVICE_SID}}',
  '{{TWILIO_TEMPLATE_CONFIRMATION}}',
  '{{TWILIO_TEMPLATE_REMINDER_24H}}',
  NULL,
  false,
  true
FROM public.organizations o WHERE o.slug = 'orioncare';

-- Link this line to all existing doctors via their calendars
INSERT INTO public.whatsapp_line_doctors (whatsapp_line_id, doctor_id, calendar_id)
SELECT wl.id, cd.doctor_id, cd.calendar_id
FROM public.whatsapp_lines wl
JOIN public.calendar_doctors cd ON true
WHERE wl.label = 'Línea Principal';
