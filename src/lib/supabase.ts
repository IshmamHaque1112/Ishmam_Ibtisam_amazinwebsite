import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite only exposes variables prefixed with VITE_. On Vercel these must be set
// in Project Settings → Environment Variables (then redeploy), because Vite
// bakes them into the bundle at build time. `.env.local` only works locally.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Never throw at import time: a missing variable used to crash the whole site
// with a blank page. Without credentials the store falls back to the bundled
// CSV data (see src/db/storeData.ts).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). ' +
      'Using the bundled CSV data instead.'
  );
}
