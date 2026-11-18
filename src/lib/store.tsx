import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, Client, Data, Expense, Settings, Sub, Table } from "./types";
import { deleteRow, insertRows, loadAll, saveSetting, updateRow } from "./backend";

type Store = {
  data: Data;
  reload: () => Promise<void>;
  add: <K extends Table>(table: K, rows: RowOf<K>[]) => Promise<void>;
  update: <K extends Table>(table: K, id: string, patch: Partial<RowOf<K>>) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  toast: (msg: string) => void;
};

type RowOf<K extends Table> = K extends "clients"
  ? Client
  : K extends "accounts"
    ? Account
    : K extends "subscriptions"
      ? Sub
      : Expense;

const key: Record<Table, "clients" | "accounts" | "subs" | "expenses"> = {
  clients: "clients",
  accounts: "accounts",
  subscriptions: "subs",
  expenses: "expenses",
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("store missing");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? "" : cur)), 2600);
  }, []);

  const reload = useCallback(async () => {
    setError("");
    try {
      setData(await loadAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const fail = useCallback(
    (e: unknown) => {
      toast("ما تسجّلش: " + (e instanceof Error ? e.message : String(e)));
      throw e;
    },
    [toast],
  );

  const store = useMemo<Store | null>(() => {
    if (!data) return null;
    return {
      data,
      reload,
      toast,
      add: async (table, rows) => {
        try {
          const saved = await insertRows(table, rows as never[]);
          setData((d) => (d ? { ...d, [key[table]]: [...(d[key[table]] as unknown[]), ...saved] } : d));
        } catch (e) {
          fail(e);
        }
      },
      update: async (table, id, patch) => {
        try {
          const saved = await updateRow(table, id, patch as never);
          setData((d) =>
            d
              ? {
                  ...d,
                  [key[table]]: (d[key[table]] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...saved } : r)),
                }
              : d,
          );
        } catch (e) {
          fail(e);
        }
      },
      remove: async (table, id) => {
        try {
          await deleteRow(table, id);
          setData((d) => {
            if (!d) return d;
            const next = { ...d, [key[table]]: (d[key[table]] as { id: string }[]).filter((r) => r.id !== id) } as Data;
            if (table === "clients") next.subs = next.subs.filter((s) => s.client_id !== id);
            if (table === "accounts")
              next.subs = next.subs.map((s) => (s.account_id === id ? { ...s, account_id: null, profile: null } : s));
            return next;
          });
        } catch (e) {
          fail(e);
        }
      },
      setSetting: async (k, value) => {
        try {
          await saveSetting(k, value);
          setData((d) => (d ? { ...d, settings: { ...d.settings, [k]: value } } : d));
        } catch (e) {
          fail(e);
        }
      },
    };
  }, [data, reload, toast, fail]);

  if (error)
    return (
      <div className="center">
        <h2>ما قدرتش نجيب المعلومات</h2>
        <p className="small muted" dir="ltr">
          {error}
        </p>
        <button className="btn btn-y" onClick={() => void reload()}>
          عاود
        </button>
      </div>
    );
  if (!store)
    return (
      <div className="center">
        <span className="spinner" aria-hidden="true" />
        <span className="small">نجيب المعلومات…</span>
      </div>
    );
  return (
    <Ctx.Provider value={store}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}
