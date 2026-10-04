// Provision the existing shopper and seller seed accounts in Supabase Auth,
// then link each Auth user to its existing public.customers row. Run only in
// a trusted local/server environment with the Supabase secret key. The legacy
// service-role key is accepted as a fallback while projects migrate.
//
// Usage (PowerShell):
//   $env:SUPABASE_URL = 'https://your-project.supabase.co'
//   $env:SUPABASE_SECRET_KEY = 'your-sb_secret-key'
//   node scripts/seed-all-auth-users.mjs 'C:\path\to\customer_auth_seed.csv'
//
// Customer CSV email values are intentionally ignored: Amazin currently logs
// in by username, mapped to username@accounts.amazin.invalid. Existing Auth
// users are reused without changing their passwords.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const customerCsvPath = process.argv[2];
if (!supabaseUrl || !secretKey || !customerCsvPath) {
  console.error('Usage: set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), then pass the customer_auth_seed.csv path.');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\r' || char === '\n') {
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

function readSeed(filePath, requiredHeaders) {
  const rows = parseCsv(readFileSync(filePath, 'utf8'));
  if (!rows.length || requiredHeaders.some(header => !(header in rows[0]))) {
    throw new Error(`CSV ${filePath} must include columns: ${requiredHeaders.join(', ')}`);
  }
  return rows;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const sellerCsvPath = path.join(here, '..', 'supabase', 'seller_auth_seed.csv');
const customerRows = readSeed(customerCsvPath, ['username', 'password']);
const sellerRows = readSeed(sellerCsvPath, ['seller_id', 'seller_username', 'password']);
const accounts = [
  ...customerRows.map(row => ({ kind: 'shopper', username: row.username, password: row.password })),
  ...sellerRows.map(row => ({ kind: 'seller', username: row.seller_username, password: row.password, sellerId: row.seller_id }))
];

const authEmail = username => `${username.trim().toLowerCase()}@accounts.amazin.invalid`;
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const usersByEmail = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Could not list existing Auth users: ${error.message}`);
  for (const user of data.users) if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
  if (data.users.length < 1000) break;
}

let created = 0, reused = 0, linked = 0, failed = 0;
for (const account of accounts) {
  const email = authEmail(account.username);
  let user = usersByEmail.get(email);
  const existed = Boolean(user);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: account.password, email_confirm: true });
    if (error || !data.user) {
      failed += 1;
      console.error(`FAILED ${account.kind} ${account.username}: ${error?.message ?? 'Auth user was not returned'}`);
      continue;
    }
    user = data.user;
    usersByEmail.set(email, user);
    created += 1;
  } else {
    reused += 1;
  }

  let query = supabase.from('customers').update({ auth_user_id: user.id }).eq('username', account.username.trim().toLowerCase());
  query = account.kind === 'seller'
    ? query.eq('role', 'seller').eq('managed_seller_id', account.sellerId)
    : query.neq('role', 'seller');
  const { data: customer, error: linkError } = await query.select('username').maybeSingle();
  if (linkError || !customer) {
    failed += 1;
    console.error(`FAILED ${account.kind} ${account.username}: ${linkError?.message ?? 'matching customers row not found; seed customers and sellers first'}`);
    continue;
  }
  linked += 1;
  console.log(`${existed ? 'reused' : 'created'} and linked ${account.kind} ${account.username}`);
}

console.log(`\nDone: ${created} Auth users created, ${reused} reused, ${linked} customer rows linked, ${failed} failed.`);
if (failed) process.exitCode = 1;
