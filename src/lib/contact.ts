import type { Client } from "./types";
import { igLink, isHandle, waLink } from "./phone";

/** Where a prefilled message goes: WhatsApp for a phone, Instagram DM for a handle (text copied first). */
export function contact(c: Client | undefined, text: string): { href: string; label: string; copyFirst: boolean } | null {
  if (!c) return null;
  const wa = waLink(c.phone, text);
  if (wa) return { href: wa, label: "ابعث في واتساب", copyFirst: false };
  const ig = isHandle(c.phone) ? igLink(c.phone) : null;
  if (ig) return { href: ig, label: "انسخ وافتح إنستغرام", copyFirst: true };
  return null;
}
