import type { Account, Client, Data, Settings, Sub, TemplateKey } from "./types";
import { addDays, diffDays, fmtShort } from "./dates";

export const PRODUCTS = [
  "Netflix",
  "Shahid VIP",
  "Disney+",
  "HBO Max",
  "Crunchyroll",
  "Paramount+",
  "Spotify",
  "Telegram Premium",
] as const;

export const TINT: Record<string, string> = {
  Netflix: "var(--coral)",
  "Shahid VIP": "var(--mint)",
  "Disney+": "var(--sky)",
  "HBO Max": "var(--lilac)",
  Crunchyroll: "var(--yellow)",
  "Paramount+": "var(--sky)",
  Spotify: "var(--mint)",
  "Telegram Premium": "var(--sky)",
};

export const PAY_METHODS = ["BaridiMob", "CCP", "RedotPay", "Binance"];
export const SOURCES = ["Instagram", "TikTok", "الموقع", "صاحبو", "آخر"];

export const DEFAULT_SETTINGS: Settings = {
  default_device_limit: 5,
  templates: {
    welcome:
      "السلام عليكم {الاسم}، مرحبا بيك في DigiStore. هذي معلومات {الاشتراك}: الإيميل {الإيميل} · البروفايل {البروفايل}. ينتهي نهار {النهاية}.",
    renew: "السلام عليكم {الاسم}، اشتراك {الاشتراك} تاعك يكمّل نهار {النهاية}. تحب نجددهولك؟ DigiStore",
    ended: "السلام عليكم {الاسم}، اشتراك {الاشتراك} تاعك كمّل نهار {النهاية}. إذا تحب ترجعو، نجددهولك اليوم. DigiStore",
    move: "السلام عليكم {الاسم}، بدّلناك لحساب جديد: الإيميل {الإيميل} · البروفايل {البروفايل}. الاشتراك تاعك ما تبدّل فيه والو. DigiStore",
    pay: "السلام عليكم {الاسم}، مازال خلاص {الاشتراك} ما وصلنيش. تقدر تبعثو بـ BaridiMob ولا CCP. يعطيك الصحة. DigiStore",
    down: "السلام عليكم {الاسم}، كاين مشكل صغير في حساب {الاشتراك}. راني نصلّح فيه ويرجع في دقايق. سمحلي على الإزعاج. DigiStore",
  },
};

export const TEMPLATE_INFO: { key: TemplateKey; title: string; hint: string }[] = [
  { key: "welcome", title: "ترحيب (فيه الحساب)", hint: "بعد البيع" },
  { key: "renew", title: "تذكير التجديد", hint: "نهار النهاية" },
  { key: "ended", title: "كمّل وما جدّدش", hint: "بعد النهاية" },
  { key: "move", title: "تبديل الحساب", hint: "كل 30 يوم" },
  { key: "pay", title: "تذكير بالخلاص", hint: "ما خلّصش" },
  { key: "down", title: "الحساب طاح", hint: "لكل زبائن الحساب" },
];

export type Tone = "today" | "soon" | "ok" | "gone";

export const TONE_BG: Record<Tone, string> = {
  today: "var(--coral)",
  soon: "var(--yellow)",
  ok: "var(--mint)",
  gone: "var(--ink)",
};

export function toneOf(days: number): Tone {
  if (days < 0) return "gone";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "ok";
}

export function daysLeft(s: Sub, now: string): number {
  return diffDays(now, s.end_date);
}

/** The newest subscription of each client for each product. Older ones are history. */
export function currentSubs(subs: Sub[]): Sub[] {
  const best = new Map<string, Sub>();
  for (const s of subs) {
    const k = s.client_id + "|" + s.product;
    const b = best.get(k);
    if (!b || s.end_date > b.end_date || (s.end_date === b.end_date && s.created_at > b.created_at)) best.set(k, s);
  }
  return [...best.values()];
}

export function isActive(s: Sub, now: string): boolean {
  return s.end_date >= now;
}

export function accountLabel(a: Account | undefined): string {
  return a ? a.label : "";
}

export function subWhere(s: Sub, accounts: Map<string, Account>): string {
  const a = s.account_id ? accounts.get(s.account_id) : undefined;
  const parts: string[] = [];
  if (a) parts.push(a.label);
  if (s.profile) parts.push(`بروفايل ${s.profile}`);
  return parts.join(" · ");
}

export function devicesUsed(accountId: string, current: Sub[], now: string): number {
  return current.filter((s) => s.account_id === accountId && isActive(s, now)).reduce((n, s) => n + s.devices, 0);
}

export function profileUse(account: Account, current: Sub[], now: string): Map<number, Sub[]> {
  const m = new Map<number, Sub[]>();
  for (let p = 1; p <= account.profiles; p++) m.set(p, []);
  for (const s of current) {
    if (s.account_id !== account.id || !isActive(s, now)) continue;
    const p = s.profile ?? 0;
    if (!m.has(p)) m.set(p, []);
    m.get(p)!.push(s);
  }
  return m;
}

export function freeSlots(product: string, data: Data, now: string, excludeAccount?: string | null) {
  const current = currentSubs(data.subs);
  const out: { account: Account; profile: number }[] = [];
  const accounts = data.accounts
    .filter((a) => a.product === product && !a.archived && a.id !== excludeAccount)
    .sort((a, b) => a.label.localeCompare(b.label, "ar", { numeric: true }));
  for (const a of accounts) {
    if (devicesUsed(a.id, current, now) >= a.device_limit) continue;
    const use = profileUse(a, current, now);
    for (let p = 1; p <= a.profiles; p++) if ((use.get(p) ?? []).length === 0) out.push({ account: a, profile: p });
  }
  return out;
}

/** Multi-month clients on a shared account change account every 30 days. */
export function moveDue(s: Sub, now: string): { due: string; month: number } | null {
  if (s.months <= 1 || !s.account_id) return null;
  const passed = diffDays(s.start_date, now);
  if (passed < 30 || now >= s.end_date) return null;
  const k = Math.floor(passed / 30);
  if (k >= s.months) return null;
  const due = addDays(s.start_date, 30 * k);
  if (s.last_move && s.last_move >= due) return null;
  return { due, month: k + 1 };
}

export function nextMove(s: Sub, now: string): string | null {
  if (s.months <= 1 || !s.account_id) return null;
  const passed = Math.max(0, diffDays(s.start_date, now));
  const k = Math.floor(passed / 30) + 1;
  if (k >= s.months) return null;
  return addDays(s.start_date, 30 * k);
}

export function renewalCount(clientId: string, subs: Sub[]): number {
  return Math.max(0, subs.filter((s) => s.client_id === clientId).length - 1);
}

export function clientName(c: Client | undefined): string {
  if (!c) return "؟";
  return c.name || (c.phone ? c.phone : "بلا اسم");
}

export function initial(c: Client | undefined): string {
  if (!c || !c.name) return "؟";
  return c.name.trim().charAt(0).toUpperCase();
}

export function fillTemplate(
  tpl: string,
  v: { name?: string; product?: string; end?: string; email?: string; profile?: string | number | null },
): string {
  return tpl
    .replace(/\s?\{الاسم\}/g, v.name ? " " + v.name : "")
    .replace(/\{الاشتراك\}/g, v.product ?? "")
    .replace(/\{النهاية\}/g, v.end ? fmtShort(v.end) : "")
    .replace(/\{الإيميل\}/g, v.email || "…")
    .replace(/\{البروفايل\}/g, v.profile != null && v.profile !== "" ? String(v.profile) : "…")
    .replace(/ ،/g, "،");
}

export function money(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " دج";
}

export function uid(): string {
  return crypto.randomUUID();
}
