// Local check of the importer on the owner's real folder. Prints counts and shapes only:
// no phone, name or e-mail is printed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseFolder } from "../src/lib/importer";

const root = process.argv[2];
if (!root) throw new Error("usage: bun scripts/check-import.ts <folder>");

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const base = join(root, "..");
const files = walk(root).map((p) => ({ path: relative(base, p).replace(/\\/g, "/"), text: readFileSync(p, "utf8") }));
const now = new Date().toISOString().slice(0, 10);
const r = parseFolder(files, now);

const byProduct = new Map<string, number>();
for (const e of r.entries) byProduct.set(e.product + " " + e.months + "m", (byProduct.get(e.product + " " + e.months + "m") ?? 0) + 1);
const mask = (s: string) => (s ? (s.startsWith("@") ? "@handle" : `phone(${s.length})`) : "none");
console.log({
  files: r.files,
  skipped: r.skipped.length,
  entries: r.entries.length,
  accounts: r.accounts.map((a) => ({ product: a.product, label: a.label, hasEmail: !!a.email })),
  byProduct: Object.fromEntries(byProduct),
  sureDates: r.entries.filter((e) => e.date?.sure).length,
  unsureDates: [...new Set(r.entries.filter((e) => e.date && !e.date.sure).map((e) => e.date!.raw))],
  noDate: r.entries.filter((e) => !e.date).length,
  noPhone: r.entries.filter((e) => e.noPhone).length,
  withName: r.entries.filter((e) => e.name).length,
  devices2: r.entries.filter((e) => e.devices > 1).length,
  withProfile: r.entries.filter((e) => e.profile != null).length,
  uniquePhones: new Set(r.entries.filter((e) => e.phone).map((e) => e.phone)).size,
});
console.log(
  "shapes:",
  r.entries.map((e) => `${e.product}|${e.months}m|acc:${e.accountKey ? "y" : "n"}|p:${e.profile ?? "-"}|${mask(e.phone)}|x${e.devices}|${e.date ? (e.date.sure ? "sure:" + e.date.suggested : "ASK:" + e.date.raw) : "NODATE"}`).join("\n"),
);
