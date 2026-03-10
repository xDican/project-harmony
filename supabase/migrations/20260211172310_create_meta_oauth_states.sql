-- Create meta_oauth_states table for Meta OAuth flow
CREATE TABLE IF NOT EXISTS public.meta_oauth_states (
  state UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Add comment
COMMENT ON TABLE public.meta_oauth_states IS 'Stores OAuth state tokens for Meta OAuth flow';

-- Enable RLS
ALTER TABLE public.meta_oauth_states ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - only service role should access this table
-- Edge functions use service role key to bypass RLS

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_created_at
  ON public.meta_oauth_states(created_at);

-- Optional: Create function to clean up old states (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_meta_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.meta_oauth_states
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;
