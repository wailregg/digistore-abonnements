// Dates are plain "YYYY-MM-DD" strings in local time. One month = 30 days (owner's rule).

const MONTHS = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function endFor(start: string, months: number): string {
  return addDays(start, 30 * months);
}

/** b - a in whole days */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function fmtShort(s: string): string {
  const d = parseISO(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function fmtFull(s: string): string {
  const d = parseISO(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtLong(s: string): string {
  const d = parseISO(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDayMonth(s: string): string {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayName(s: string): string {
  return DAYS[parseISO(s).getDay()];
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysLabel(n: number): string {
  if (n === 0) return "اليوم";
  if (n === 1) return "غدوة";
  if (n === 2) return "باقي يومين";
  if (n > 2 && n <= 10) return `باقي ${n} أيام`;
  if (n > 10) return `باقي ${n} يوم`;
  const p = -n;
  if (p === 1) return "كمّل البارح";
  return p <= 10 ? `كمّل من ${p} أيام` : `كمّل من ${p} يوم`;
}

export function monthsLabel(m: number): string {
  if (m === 1) return "شهر";
  if (m === 2) return "شهرين";
  if (m >= 3 && m <= 10) return `${m} أشهر`;
  return `${m} شهر`;
}
