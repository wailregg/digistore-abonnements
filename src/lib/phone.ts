// Phones are stored as 0XXXXXXXXX. WhatsApp shows +213 XXX..., so both forms must match.

export function isHandle(s: string): boolean {
  return s.startsWith("@");
}

export function normPhone(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const handle = raw.match(/@[\w.]+/);
  if (handle && !/\d{6,}/.test(raw.replace(/\s/g, ""))) return handle[0].toLowerCase();
  let digits = raw.replace(/[^\d+]/g, "");
  digits = digits.replace(/^(\+|00)?213/, "0");
  digits = digits.replace(/\+/g, "");
  if (/^[567]\d{8}$/.test(digits)) digits = "0" + digits;
  return digits;
}

/** For search: any piece of a phone, in any form, or text. */
export function searchKey(input: string): string {
  const t = input.trim();
  if (/^[+\d\s().-]+$/.test(t)) {
    return t.replace(/[^\d+]/g, "").replace(/^(\+|00)?213/, "0").replace(/\+/g, "");
  }
  return t.toLowerCase();
}

export function displayPhone(p: string): string {
  if (!p || isHandle(p)) return p;
  if (/^0\d{9}$/.test(p)) return `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 8)} ${p.slice(8)}`;
  return p;
}

export function waNumber(p: string): string | null {
  if (!/^0\d{9}$/.test(p)) return null;
  return "213" + p.slice(1);
}

export function waLink(phone: string, text: string): string | null {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function igLink(phone: string): string | null {
  if (!isHandle(phone)) return null;
  return `https://ig.me/m/${phone.slice(1)}`;
}
