// Cliente Supabase singleton del proyecto.
// Generado inicialmente por Lovable; editado manualmente para fix de Realtime.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://soxrlxvivuplezssgssq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: window.localStorage,
    storageKey: 'sb-soxrlxvivuplezssgssq-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Sprint 3 Fase 5: forzar que el WebSocket de Realtime use el JWT del user
// para que las policies RLS lo identifiquen como auth.uid() (no como anon).
// Sin esto, los channels reciben anon role y RLS bloquea los eventos.
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.access_token) {
    supabase.realtime.setAuth(data.session.access_token);
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  } else {
    // Logout: reset al anon key (default del cliente)
    supabase.realtime.setAuth(SUPABASE_PUBLISHABLE_KEY);
  }
});