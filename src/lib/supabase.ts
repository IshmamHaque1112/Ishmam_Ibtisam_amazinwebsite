import type { SupabaseClient } from '@supabase/supabase-js';

// Vite only exposes variables prefixed with VITE_. On Vercel these must be set
// in Project Settings → Environment Variables (then redeploy), because Vite
// bakes them into the bundle at build time. `.env.local` only works locally.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

// The Supabase client is loaded on demand. When the keys aren't set (CSV
// mode) its code is never downloaded, which keeps the main bundle smaller.
// Never throws: without a client the store falls back to the bundled CSV data
// (see src/db/storeData.ts).
export const getSupabase = (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(supabaseUrl as string, supabasePublishableKey as string))
      .catch(error => {
        console.error('Could not load the Supabase client:', error);
        return null;
      });
  }
  return clientPromise;
};

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing). ' +
      'Using the bundled CSV data instead.'
  );
}

// ---------- Auth ----------
// The site logs in by username, but Supabase Auth needs an email. Each
// username gets a synthetic, non-deliverable email under a reserved domain
// (usernames are already unique, so this can't collide). This account is
// used only to hold a password for sign-in - nothing is ever emailed to it.
const AUTH_EMAIL_DOMAIN = 'accounts.amazin.invalid';
export const usernameToAuthEmail = (username: string) => `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// Creates the Auth user that holds this username's password. Doesn't touch
// the public `customers` table - the caller inserts that row separately.
export const authSignUp = async (username: string, password: string): Promise<AuthResult> => {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: 'Sign-up needs a live Supabase connection.' };
  const { error } = await supabase.auth.signUp({ email: usernameToAuthEmail(username), password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

// Real verification: this fails if the password is wrong, unlike the old
// removed check which logged the person in either way.
export const authSignIn = async (username: string, password: string): Promise<AuthResult> => {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: 'Sign-in needs a live Supabase connection.' };
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToAuthEmail(username), password });
  if (error) return { ok: false, error: 'Incorrect username or password.' };
  return { ok: true };
};

export const authSignOut = async (): Promise<void> => {
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
};
