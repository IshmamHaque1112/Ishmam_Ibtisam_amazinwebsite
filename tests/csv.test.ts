import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/db/csv';

test('parses quoted fields with commas and escaped quotes', () => {
  const rows = parseCsv('id,name\r\n1,"Rake, Steel ""Pro"""\n');
  assert.deepEqual(rows, [{ id: '1', name: 'Rake, Steel "Pro"' }]);
});

test('the bundled customer data ships no password column', () => {
  // src/data/*.csv is bundled into the public JavaScript, so nothing secret
  // may live there.
  const text = readFileSync(new URL('../../src/data/customers.csv', import.meta.url), 'utf8');
  const [first] = parseCsv(text);
  assert.ok(first.username);
  assert.equal('password' in first, false);
});
