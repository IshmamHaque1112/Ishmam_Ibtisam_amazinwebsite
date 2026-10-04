// Provisions the pre-seeded sellers as Supabase Auth users and links each
// Auth UUID to its `customers` row. Run locally with the service-role key;
// never expose that key to Vite, the browser, source control, or logs.
//
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//   node scripts/seed-seller-auth-users.mjs
//
// Safe to rerun: existing Auth users are reused (their passwords are not
// changed) and the customer links are refreshed.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.');
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(here, '..', 'supabase', 'seller_auth_seed.csv');

// Small RFC 4180 reader so quoted seller names and escaped quotes are safe.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some(value => value !== '')) rows.push(row);
  const [headers = [], ...records] = rows;
  return records.map(values => Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] ?? '').trim()])));
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const required = ['seller_id', 'seller_username', 'password'];
if (!rows.length || required.some(key => !(key in rows[0]))) {
  console.error(`Expected CSV headers ${required.join(', ')} in ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const emailFor = username => `${username.trim().toLowerCase()}@accounts.amazin.invalid`;
const usersByEmail = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error(`Could not list existing Auth users: ${error.message}`); process.exit(1); }
  for (const user of data.users) if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
  if (data.users.length < 1000) break;
}

let created = 0, reused = 0, linked = 0, failed = 0;
for (const { seller_id: sellerId, seller_username: username, password } of rows) {
  const email = emailFor(username);
  let user = usersByEmail.get(email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      failed += 1;
      console.error(`FAILED ${username}: ${error?.message ?? 'Auth user was not returned'}`);
      continue;
    }
    user = data.user;
    usersByEmail.set(email, user);
    created += 1;
    console.log(`created ${username}`);
  } else {
    reused += 1;
    console.log(`reused ${username} (password unchanged)`);
  }

  const { data: customer, error: linkError } = await supabase
    .from('customers')
    .update({ auth_user_id: user.id })
    .eq('username', username.trim().toLowerCase())
    .eq('role', 'seller')
    .eq('managed_seller_id', sellerId)
    .select('username')
    .maybeSingle();
  if (linkError || !customer) {
    failed += 1;
    console.error(`FAILED ${username}: ${linkError?.message ?? 'Matching seller customer row not found; run supabase/seller-portal.sql first'}`);
    continue;
  }
  linked += 1;
}

console.log(`\nDone: ${created} created, ${reused} reused, ${linked} customer rows linked, ${failed} failed.`);
if (failed) process.exitCode = 1;
