// Password storage for CSV-fallback mode only (no Supabase connection).
// There's no server to check a password against, so this hashes it with the
// browser's built-in Web Crypto API (SHA-256 + a random per-account salt)
// and keeps the hash in localStorage - never the plain password. This is
// fine for a local demo fallback; it is not a substitute for real auth,
// which is what the Supabase path (src/lib/supabase.ts) provides.

const LOCAL_PASSWORDS_KEY = 'amazin_local_passwords';

interface StoredPassword {
  salt: string;
  hash: string;
}

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

const digest = async (text: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

const randomSalt = (): string => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

const readAll = (): Record<string, StoredPassword> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PASSWORDS_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeAll = (data: Record<string, StoredPassword>) => {
  try {
    localStorage.setItem(LOCAL_PASSWORDS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Could not save the local password:', error);
  }
};

export const setLocalPassword = async (username: string, password: string): Promise<void> => {
  const salt = randomSalt();
  const hash = await digest(salt + password);
  const all = readAll();
  all[username.toLowerCase()] = { salt, hash };
  writeAll(all);
};

export const verifyLocalPassword = async (username: string, password: string): Promise<boolean> => {
  const entry = readAll()[username.toLowerCase()];
  if (!entry) return false;
  const hash = await digest(entry.salt + password);
  return hash === entry.hash;
};

export const hasLocalPassword = (username: string): boolean => Boolean(readAll()[username.toLowerCase()]);
