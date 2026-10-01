// One-time setup: creates a real Supabase Auth user for each of the 25 demo
// customers already in the `customers` table, using the passwords in
// scripts/customer-auth-seed.csv. Without this, those accounts exist in the
// catalog (customers table) but can't log in, since a password system needs
// an Auth user to check the password against.
//
// Run locally, never in the browser or in CI logs - it needs the Supabase
// SERVICE ROLE key, which can create/modify any user and must never be
// exposed to the client (that's why the app itself only ever uses the anon
// key - see src/lib/supabase.ts).
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/seed-auth-users.mjs
//
// Find both values in the Supabase dashboard under
// Project Settings -> API ("Project URL" and "service_role secret").
// Safe to re-run: existing Auth users are skipped, not recreated.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.');
  process.exit(1);
}

// Must match usernameToAuthEmail() in src/lib/supabase.ts exactly, or the
// app will look for a different email than the one created here.
const AUTH_EMAIL_DOMAIN = 'accounts.amazin.invalid';
const usernameToAuthEmail = username => `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(here, 'customer-auth-seed.csv');

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

const rows = parseCsv(readFileSync(csvPath, 'utf-8'));
console.log(`Loaded ${rows.length} accounts from ${csvPath}`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

let created = 0;
let skipped = 0;
let failed = 0;

for (const { username, password } of rows) {
  const email = usernameToAuthEmail(username);
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // demo accounts, no real inbox to confirm from
  });

  if (!error) {
    created += 1;
    console.log(`  created  ${username}`);
  } else if (error.message.toLowerCase().includes('already registered')) {
    skipped += 1;
    console.log(`  skipped  ${username} (already exists)`);
  } else {
    failed += 1;
    console.error(`  FAILED   ${username}: ${error.message}`);
  }
}

console.log(`\nDone. ${created} created, ${skipped} already existed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
