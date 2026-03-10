-- Create whatsapp_templates table for Meta App Review
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'UTILITY',
  language TEXT NOT NULL DEFAULT 'en_US',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.whatsapp_templates IS 'WhatsApp message templates for Meta Business API';

-- Enable RLS (no client policies - only service role access)
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create index for listing templates
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_updated_at
  ON public.whatsapp_templates(updated_at DESC);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status
  ON public.whatsapp_templates(status);
