import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Data, Settings, Table } from "./types";
import { DEFAULT_SETTINGS } from "./logic";
import { demoData } from "./demo";

// Public by design: access is protected by row-level security (owner only).
const SUPABASE_URL = "https://sgmovodxtxhxhmdfzwno.supabase.co";
const SUPABASE_KEY = "sb_publishable_As1BzvaHHTZ_8tF4EigDig_yNB1yG_S";

export const DEMO = import.meta.env.MODE === "demo" || new URLSearchParams(location.search).has("demo");

export const sb: SupabaseClient | null = DEMO
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "ds-abonnements-auth" },
    });

type Row = Record<string, unknown> & { id: string };

function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const s: Settings = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    if (r.key === "templates" && r.value && typeof r.value === "object") {
      s.templates = { ...s.templates, ...(r.value as Settings["templates"]) };
    }
    if (r.key === "default_device_limit" && typeof r.value === "number") s.default_device_limit = r.value;
  }
  return s;
}

async function check<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

// ---------- demo backend: browser storage with invented clients ----------
const DEMO_KEY = "ds-abonnements-demo";

function demoLoad(): Data {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {
    /* fall through */
  }
  const d = demoData();
  demoSave(d);
  return d;
}

function demoSave(d: Data) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(d));
  } catch {
    /* demo only */
  }
}

const tableKey: Record<Table, keyof Omit<Data, "settings">> = {
  clients: "clients",
  accounts: "accounts",
  subscriptions: "subs",
  expenses: "expenses",
};

// ---------- public API ----------
export async function loadAll(): Promise<Data> {
  if (!sb) return demoLoad();
  const [clients, accounts, subs, expenses, settings] = await Promise.all([
    check(sb.from("clients").select("*").limit(5000)),
    check(sb.from("accounts").select("*").limit(1000)),
    check(sb.from("subscriptions").select("*").limit(20000)),
    check(sb.from("expenses").select("*").limit(5000)),
    check(sb.from("settings").select("key,value")),
  ]);
  return {
    clients: clients as Data["clients"],
    accounts: accounts as Data["accounts"],
    subs: subs as Data["subs"],
    expenses: expenses as Data["expenses"],
    settings: mergeSettings(settings as { key: string; value: unknown }[]),
  };
}

export async function insertRows<T extends Row>(table: Table, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return [];
  if (!sb) {
    const d = demoLoad();
    (d[tableKey[table]] as unknown as T[]).push(...rows);
    demoSave(d);
    return rows;
  }
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const part = await check(sb.from(table).insert(rows.slice(i, i + 500)).select());
    out.push(...(part as T[]));
  }
  return out;
}

export async function updateRow<T extends Row>(table: Table, id: string, patch: Partial<T>): Promise<T> {
  if (!sb) {
    const d = demoLoad();
    const list = d[tableKey[table]] as unknown as T[];
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) throw new Error("not found");
    list[i] = { ...list[i], ...patch };
    demoSave(d);
    return list[i];
  }
  return (await check(sb.from(table).update(patch as never).eq("id", id).select().single())) as T;
}

export async function deleteRow(table: Table, id: string): Promise<void> {
  if (!sb) {
    const d = demoLoad();
    const k = tableKey[table];
    (d[k] as unknown as Row[]) = (d[k] as unknown as Row[]).filter((r) => r.id !== id);
    if (table === "clients") d.subs = d.subs.filter((s) => s.client_id !== id);
    demoSave(d);
    return;
  }
  await check(sb.from(table).delete().eq("id", id));
}

export async function saveSetting(key: keyof Settings, value: unknown): Promise<void> {
  if (!sb) {
    const d = demoLoad();
    (d.settings as Record<string, unknown>)[key] = value;
    demoSave(d);
    return;
  }
  await check(sb.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" }));
}

export async function isOwner(): Promise<boolean> {
  if (!sb) return true;
  const rows = await check(sb.from("app_owner").select("id"));
  return (rows as unknown[]).length > 0;
}
