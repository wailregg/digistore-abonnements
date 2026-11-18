// The secret code is per device. Only a salted hash is kept in this browser.
const KEY = "ds-abonnements-pin";
const LOCK_KEY = "ds-abonnements-lock-min";

async function hash(pin: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function read(): { salt: string; hash: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { salt: string; hash: string }) : null;
  } catch {
    return null;
  }
}

export function hasPin(): boolean {
  return read() !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.randomUUID();
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await hash(pin, salt) }));
}

export async function checkPin(pin: string): Promise<boolean> {
  const r = read();
  if (!r) return true;
  return (await hash(pin, r.salt)) === r.hash;
}

export function clearPin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function lockMinutes(): number {
  try {
    const v = Number(localStorage.getItem(LOCK_KEY));
    return v > 0 ? v : 5;
  } catch {
    return 5;
  }
}

export function setLockMinutes(m: number): void {
  try {
    localStorage.setItem(LOCK_KEY, String(m));
  } catch {
    /* ignore */
  }
}
