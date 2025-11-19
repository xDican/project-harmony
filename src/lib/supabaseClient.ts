import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
// Currently configured but not used - will be integrated later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
