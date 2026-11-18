// Reads the owner's old "les abonmont" folder (one sub-folder per product, Netflix split into
// account folders with one file per profile) and turns it into clients and subscriptions.
// Runs in the browser: the files never leave the owner's computer until he presses "import".
import { normPhone } from "./phone";
import { diffDays, toISO } from "./dates";

export type InFile = { path: string; text: string };

export type DateGuess = { raw: string; options: string[]; suggested: string | null; sure: boolean };

export type ParsedAccount = { key: string; product: string; label: string; email: string; activated: string | null };

export type Entry = {
  id: string;
  file: string;
  product: string;
  months: number;
  accountKey: string | null;
  profile: number | null;
  phone: string;
  name: string;
  devices: number;
  date: DateGuess | null;
  noPhone: boolean;
};

export type ParseResult = {
  entries: Entry[];
  accounts: ParsedAccount[];
  files: number;
  skipped: string[];
};

const PRODUCT_RULES: [RegExp, string][] = [
  [/netfli/i, "Netflix"],
  [/crunch/i, "Crunchyroll"],
  [/disney/i, "Disney+"],
  [/hbo/i, "HBO Max"],
  [/paramount/i, "Paramount+"],
  [/shahid/i, "Shahid VIP"],
  [/spoti/i, "Spotify"],
  [/telegram/i, "Telegram Premium"],
];

const DATE_RE = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})/;
const DATE_RE_G = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})/g;
const MONTHS_RE = /\{\s*(\d{1,2})\s*\}|(\d{1,2})\s*(?:mounth|month|mois|moins|شهر|أشهر)/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\s*213|0)[\s.-]*[5-7](?:[\s.-]*\d){8}/;
const HANDLE_RE = /@[A-Za-z0-9_.]{2,}/;
const STOP = new Set(["profile", "profle", "profil", "cliant", "client", "num", "account", "email", "of", "the", "mounth", "month", "moins", "mois", "txt", "x"]);

export function productOf(folder: string): string | null {
  for (const [re, p] of PRODUCT_RULES) if (re.test(folder)) return p;
  return null;
}

export function monthsIn(s: string): number | null {
  const m = s.match(MONTHS_RE);
  if (!m) return null;
  const n = Number(m[1] ?? m[2]);
  return n >= 1 && n <= 24 ? n : null;
}

function real(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1) return null;
  return toISO(dt);
}

/** "a-b-yyyy" is written both month-first and day-first in the old files. */
export function guessDate(raw: string, now: string): DateGuess | null {
  const m = raw.match(DATE_RE);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  const opts = [...new Set([real(y, a, b), real(y, b, a)].filter((x): x is string => !!x))];
  if (opts.length === 0) return null;
  const past = opts.filter((o) => diffDays(now, o) <= 1);
  const pool = past.length ? past : opts;
  const byDist = [...pool].sort((x, y2) => Math.abs(diffDays(now, x)) - Math.abs(diffDays(now, y2)));
  const label = `${m[1]}-${m[2]}-${m[3]}`;
  if (byDist.length === 1) return { raw: label, options: opts, suggested: byDist[0], sure: true };
  const near = Math.abs(diffDays(now, byDist[0]));
  const far = Math.abs(diffDays(now, byDist[1]));
  const sure = near <= 120 && far > 120;
  return { raw: label, options: byDist, suggested: byDist[0], sure };
}

/**
 * Activation day written next to an account's e-mail ("email of the account 10-31-2026", or
 * "x@y.com (11-04-2026)" inside the file). An account lasts 30 days, so only a reading from the
 * last 45 days (or tomorrow at most) makes sense; with exactly one such reading it is taken.
 */
export function accountDate(text: string, now: string): string | null {
  const g = guessDate(text, now);
  if (!g) return null;
  const recent = g.options.filter((o) => diffDays(o, now) >= -1 && diffDays(o, now) <= 45);
  if (recent.length === 1) return recent[0];
  return g.sure ? g.suggested : null;
}

function stemOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[^.]+$/, "");
}

function nameFrom(stem: string): string {
  const cleaned = stem
    .replace(DATE_RE_G, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[()[\]_]/g, " ")
    .toLowerCase();
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w) && !STOP.has(w) && w.length > 1);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function profileFrom(stem: string): number | null {
  const p = stem.match(/prof\w*\s*(\d{1,2})/i);
  if (p) return Number(p[1]);
  const lead = stem.match(/^(\d{1,2})\s+/);
  return lead ? Number(lead[1]) : null;
}

export function parseFolder(files: InFile[], now: string): ParseResult {
  const entries: Entry[] = [];
  const accounts = new Map<string, ParsedAccount>();
  const skipped: string[] = [];
  let n = 0;

  // Normalise paths: drop everything up to and including the root folder the owner picked.
  const norm = files
    .filter((f) => /\.txt$/i.test(f.path))
    .map((f) => {
      const parts = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
      const i = parts.findIndex((p) => productOf(p));
      return { parts: i >= 0 ? parts.slice(i) : parts, text: f.text, path: f.path };
    });

  for (const f of norm) {
    const product = productOf(f.parts[0] ?? "");
    if (!product) {
      skipped.push(f.path);
      continue;
    }
    const folderMonths = monthsIn(f.parts[0]) ?? 1;
    const inAccount = f.parts.length >= 3;
    const accountFolder = inAccount ? f.parts[1] : null;
    const stem = stemOf(f.parts[f.parts.length - 1]);
    const lines = f.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Account e-mail file
    const email = f.text.match(EMAIL_RE);
    if (/email|account|compte/i.test(stem) && email) {
      const num = accountFolder?.match(/\((\d+)\)/)?.[1];
      const key = product + "|" + (accountFolder ?? "root");
      const label = num ? `حساب ${num}` : accounts.has(key) ? accounts.get(key)!.label : `حساب 1`;
      accounts.set(key, { key, product, label, email: email[0], activated: accountDate(stem + " " + f.text, now) });
      continue;
    }

    const accountKey = product + "|" + (accountFolder ?? "root");
    if (!accounts.has(accountKey) && accountFolder) {
      const num = accountFolder.match(/\((\d+)\)/)?.[1];
      accounts.set(accountKey, { key: accountKey, product, label: num ? `حساب ${num}` : accountFolder, email: "", activated: null });
    }

    const fileDate = guessDate(stem, now);
    // "{6}" in the file name belongs to the profile's first client; a duration written on its
    // own line inside the file ("1 mounth shahid vip") belongs to everyone in the file.
    const stemMonths = monthsIn(stem);
    let fileMonths: number | null = null;
    for (const l of lines) if (!PHONE_RE.test(l) && !HANDLE_RE.test(l.replace(EMAIL_RE, ""))) fileMonths = fileMonths ?? monthsIn(l);
    const profile = inAccount ? profileFrom(stem) : null;
    const fileName = nameFrom(stem);

    let found = 0;
    for (const l of lines) {
      const noEmail = l.replace(EMAIL_RE, " ");
      const ph = noEmail.match(PHONE_RE)?.[0] ?? noEmail.match(HANDLE_RE)?.[0];
      if (!ph) continue;
      const rest = noEmail.replace(ph, " ");
      const dev = rest.match(/x\s*(\d)/i);
      entries.push({
        id: `e${++n}`,
        file: f.parts.join(" / "),
        product,
        months: monthsIn(rest) ?? (found === 0 ? stemMonths : null) ?? fileMonths ?? folderMonths,
        accountKey: inAccount || accounts.has(accountKey) ? accountKey : null,
        profile,
        phone: normPhone(ph),
        name: found === 0 ? fileName : "",
        devices: dev ? Math.min(10, Math.max(1, Number(dev[1]))) : 1,
        date: guessDate(rest, now) ?? fileDate,
        noPhone: false,
      });
      found++;
    }
    if (found === 0) {
      entries.push({
        id: `e${++n}`,
        file: f.parts.join(" / "),
        product,
        months: stemMonths ?? fileMonths ?? folderMonths,
        accountKey: inAccount || accounts.has(accountKey) ? accountKey : null,
        profile,
        phone: "",
        name: fileName,
        devices: 1,
        date: fileDate,
        noPhone: true,
      });
    }
  }

  // Product-level account files (no sub-folder) also cover the clients written next to them.
  for (const e of entries) {
    if (!e.accountKey) {
      const k = e.product + "|root";
      if (accounts.has(k)) e.accountKey = k;
    }
  }

  return { entries, accounts: [...accounts.values()], files: norm.length, skipped };
}
