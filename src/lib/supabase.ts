import type { SupabaseClient } from '@supabase/supabase-js';

// Vite only exposes variables prefixed with VITE_. On Vercel these must be set
// in Project Settings → Environment Variables (then redeploy), because Vite
// bakes them into the bundle at build time. `.env.local` only works locally.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

// The Supabase client is loaded on demand. When the keys aren't set (CSV
// mode) its code is never downloaded, which keeps the main bundle smaller.
// Never throws: without a client the store falls back to the bundled CSV data
// (see src/db/storeData.ts).
export const getSupabase = (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(supabaseUrl as string, supabaseAnonKey as string))
      .catch(error => {
        console.error('Could not load the Supabase client:', error);
        return null;
      });
  }
  return clientPromise;
};

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). ' +
      'Using the bundled CSV data instead.'
  );
}
