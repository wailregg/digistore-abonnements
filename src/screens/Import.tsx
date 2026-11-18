import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { endFor, fmtDayMonth, monthsLabel, today } from "../lib/dates";
import { uid } from "../lib/logic";
import { displayPhone } from "../lib/phone";
import { parseFolder, type Entry, type ParseResult } from "../lib/importer";
import type { Account, Client, Sub } from "../lib/types";
import { Header, Icon, Phone, ProductChip } from "../ui";

export function ImportScreen() {
  const { data, add, toast } = useStore();
  const now = today();
  const [res, setRes] = useState<ParseResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // raw date -> ISO
  const [missing, setMissing] = useState<Record<string, string>>({}); // entry id -> ISO or "skip"
  const [keepNoPhone, setKeepNoPhone] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ clients: number; subs: number; accounts: number } | null>(null);
  const [readErr, setReadErr] = useState("");

  async function pick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setReadErr("");
    try {
      const files = await Promise.all(
        [...list]
          .filter((f) => /\.txt$/i.test(f.name))
          .map(async (f) => ({ path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, text: await f.text() })),
      );
      const r = parseFolder(files, now);
      if (r.entries.length === 0) setReadErr("ما لقيت حتى زبون في هذا الدوسي. اختار الدوسي «les abonmont» نيشان.");
      setRes(r);
    } catch (e) {
      setReadErr(e instanceof Error ? e.message : String(e));
    }
  }

  const unsure = useMemo(() => {
    if (!res) return [];
    const m = new Map<string, { raw: string; options: string[]; suggested: string | null; count: number }>();
    for (const e of res.entries) {
      if (!e.date || e.date.sure) continue;
      const x = m.get(e.date.raw);
      if (x) x.count++;
      else m.set(e.date.raw, { raw: e.date.raw, options: e.date.options, suggested: e.date.suggested, count: 1 });
    }
    return [...m.values()];
  }, [res]);

  const noDate = res ? res.entries.filter((e) => !e.date && (keepNoPhone || !e.noPhone)) : [];
  const noPhone = res ? res.entries.filter((e) => e.noPhone) : [];
  const dateOf = (e: Entry): string | null => {
    if (!e.date) return missing[e.id] && missing[e.id] !== "skip" ? missing[e.id] : null;
    if (e.date.sure) return e.date.suggested;
    return answers[e.date.raw] ?? null;
  };
  const allAnswered = unsure.every((u) => answers[u.raw]) && noDate.every((e) => missing[e.id]);

  const existingByPhone = new Map(data.clients.filter((c) => c.phone).map((c) => [c.phone, c]));
  const dupKey = (clientId: string, product: string, start: string) => `${clientId}|${product}|${start}`;
  const existingSubs = new Set(data.subs.map((s) => dupKey(s.client_id, s.product, s.start_date)));

  async function save() {
    if (!res) return;
    setBusy(true);
    try {
      const ts = new Date().toISOString();
      // Accounts
      const accIds = new Map<string, string>();
      const newAccounts: Account[] = [];
      for (const a of res.accounts) {
        const ex = data.accounts.find((x) => x.product === a.product && x.label === a.label && !x.archived);
        if (ex) accIds.set(a.key, ex.id);
        else {
          const id = uid();
          accIds.set(a.key, id);
          newAccounts.push({
            id,
            product: a.product,
            label: a.label,
            email: a.email,
            password: "",
            profiles: 5,
            device_limit: data.settings.default_device_limit,
            supplier_end: null,
            note: "من الملفات القدام",
            archived: false,
            created_at: ts,
          });
        }
      }
      // Clients and subscriptions
      const newClients: Client[] = [];
      const byPhone = new Map(existingByPhone);
      const newSubs: Sub[] = [];
      let skipped = 0;
      for (const e of res.entries) {
        if (e.noPhone && !keepNoPhone) continue;
        const start = dateOf(e);
        if (!start) continue;
        let client = e.phone ? byPhone.get(e.phone) : undefined;
        if (!client) {
          client = {
            id: uid(),
            phone: e.phone,
            name: e.name,
            source: "",
            note: e.noPhone ? "بلا رقم في الملف القديم" : "",
            created_at: ts,
          };
          newClients.push(client);
          if (e.phone) byPhone.set(e.phone, client);
        }
        const k = dupKey(client.id, e.product, start);
        if (existingSubs.has(k)) {
          skipped++;
          continue;
        }
        existingSubs.add(k);
        newSubs.push({
          id: uid(),
          client_id: client.id,
          product: e.product,
          months: e.months,
          start_date: start,
          end_date: endFor(start, e.months),
          account_id: e.accountKey ? accIds.get(e.accountKey) ?? null : null,
          profile: e.profile,
          devices: e.devices,
          price: null,
          paid: true,
          pay_method: "",
          last_move: null,
          note: "من الملفات القدام",
          created_at: ts,
        });
      }
      await add("accounts", newAccounts);
      await add("clients", newClients);
      await add("subscriptions", newSubs);
      setDone({ clients: newClients.length, subs: newSubs.length, accounts: newAccounts.length });
      if (skipped) toast(`${skipped} كانو مسجلين من قبل، ما عاودتهمش`);
    } catch {
      /* toast already shown by the store */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <Header back={{ href: "#/settings", label: "الإعدادات" }}>
        <h1>جيب الملفات القدام</h1>
        <p className="b" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          مرة وحدة برك، من الـ PC. البرنامج يقرا الدوسي «les abonmont» ويعمّر كل شي. انت تجاوب غير على الحوايج المشكوك فيها.
        </p>
      </Header>

      {done ? (
        <section className="sec" style={{ paddingBottom: 24 }}>
          <div className="col" style={{ padding: 16, gap: 6, background: "var(--mint)", border: "2px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)" }}>
            <span style={{ fontSize: 22, fontWeight: 900 }}>كمّلنا!</span>
            <span className="b">
              {done.clients} زبون · {done.subs} اشتراك · {done.accounts} حساب دخلو البرنامج.
            </span>
            <span className="small">زيد كلمات السر وتواريخ المورّد لكل حساب من «الزبائن».</span>
          </div>
          <a className="btn btn-y btn-big" href="#/">
            روح للرئيسية
          </a>
        </section>
      ) : !res ? (
        <section className="sec" style={{ paddingBottom: 24 }}>
          <Mapping />
          <label className="btn btn-y btn-big" style={{ cursor: "pointer" }}>
            <Icon name="folder" />
            اختار الدوسي «les abonmont»
            <input
              type="file"
              multiple
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => void pick(e.target.files)}
            />
          </label>
          <div className="small muted col" style={{ lineHeight: 1.7, gap: 4 }}>
            <span>الدوسي راه في:</span>
            <span dir="ltr" style={{ alignSelf: "flex-end", textAlign: "left", wordBreak: "break-all" }}>
              C:\DigiStore Project\01 Comptes clients (privé)\les abonmont
            </span>
            <span>Chrome يسقسيك «Importer» ولا «Charger»: قبل. الملفات ما يتبدّلو والو.</span>
          </div>
          {readErr && <p className="err">{readErr}</p>}
        </section>
      ) : (
        <>
          <section className="sec">
            <div className="box pad col" style={{ gap: 10 }}>
              <span className="bb" style={{ fontSize: 18 }}>
                قريت {res.files} ملف
              </span>
              <div className="col small" style={{ gap: 6, fontSize: 13 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="dot" style={{ background: "var(--mint)" }} />
                  {res.entries.length} بيعة · {new Set(res.entries.filter((e) => e.phone).map((e) => e.phone)).size} زبون · {res.accounts.length} حساب
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="dot" style={{ background: "var(--yellow)" }} />
                  {unsure.length} تواريخ مشكوك فيها · {noDate.length} بلا تاريخ
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="dot" style={{ background: "var(--white)" }} />
                  {noPhone.length} بلا رقم (ملف فارغ ولا ما فيه رقم)
                </span>
              </div>
            </div>
          </section>

          {unsure.map((u, i) => (
            <section key={u.raw} className="sec">
              <div className="box pad col" style={{ gap: 10, boxShadow: "5px 5px 0 var(--ink)" }}>
                <span className="small bb">
                  سؤال {i + 1} من {unsure.length + noDate.length} · {u.count} ملف
                </span>
                <span className="b">مكتوب في الملف:</span>
                <span dir="ltr" className="chip" style={{ alignSelf: "flex-start", fontSize: 24, background: "var(--yellow)" }}>
                  {u.raw}
                </span>
                <span className="bb">واش يعني؟</span>
                {u.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="btn"
                    aria-pressed={answers[u.raw] === o}
                    style={{ justifyContent: "space-between", fontSize: 16, ...(answers[u.raw] === o ? { background: "var(--ink)", color: "var(--yellow)" } : {}) }}
                    onClick={() => setAnswers({ ...answers, [u.raw]: o })}
                  >
                    <span>{fmtDayMonth(o)}</span>
                    {o === u.suggested && (
                      <span className="chip" style={{ background: "var(--mint)", color: "var(--ink)", fontSize: 11 }}>
                        الأقرب لليوم
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}

          {noDate.map((e, i) => (
            <section key={e.id} className="sec">
              <div className="box pad col" style={{ gap: 10 }}>
                <span className="small bb">
                  سؤال {unsure.length + i + 1} من {unsure.length + noDate.length} · ما لقيتش التاريخ
                </span>
                <span className="small muted" dir="auto">
                  {e.file}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <ProductChip product={e.product} small />
                  <Phone value={displayPhone(e.phone) || "بلا رقم"} className="b" />
                </span>
                <label className="small" htmlFor={"d-" + e.id}>
                  وقتاش بدا؟
                </label>
                <input
                  id={"d-" + e.id}
                  className="input"
                  type="date"
                  value={missing[e.id] && missing[e.id] !== "skip" ? missing[e.id] : ""}
                  onChange={(ev) => setMissing({ ...missing, [e.id]: ev.target.value })}
                />
                <button
                  type="button"
                  className="btn"
                  aria-pressed={missing[e.id] === "skip"}
                  onClick={() => setMissing({ ...missing, [e.id]: "skip" })}
                  style={missing[e.id] === "skip" ? { background: "var(--ink)", color: "#fff" } : undefined}
                >
                  ما تسجلوش
                </button>
              </div>
            </section>
          ))}

          {noPhone.length > 0 && (
            <section className="sec">
              <label className="box pad row" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={keepNoPhone} onChange={(e) => setKeepNoPhone(e.target.checked)} style={{ width: 22, height: 22 }} />
                <span className="b">سجّل حتى اللي ما عندهمش رقم ({noPhone.length})</span>
              </label>
            </section>
          )}

          <section className="sec">
            <button type="button" className="btn" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
              {showAll ? "خبّي القائمة" : `شوف كل البيعات (${res.entries.length}) قبل`}
            </button>
            {showAll && (
              <div className="box divide">
                {res.entries.map((e) => {
                  const d = dateOf(e);
                  return (
                    <div key={e.id} className="row" style={{ padding: "8px 12px", minHeight: 52 }}>
                      <ProductChip product={e.product} small />
                      <div className="col grow">
                        <span className="b" style={{ fontSize: 14 }}>
                          {e.name || <Phone value={displayPhone(e.phone) || "بلا رقم"} />}
                        </span>
                        <span className="small muted">
                          {monthsLabel(e.months)}
                          {e.accountKey ? " · " + (res.accounts.find((a) => a.key === e.accountKey)?.label ?? "") : ""}
                          {e.profile ? ` · بروفايل ${e.profile}` : ""}
                          {e.devices > 1 ? ` · ×${e.devices}` : ""}
                        </span>
                      </div>
                      <span className="small b">{d ? fmtDayMonth(d) : "؟"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="sec" style={{ paddingBottom: 28 }}>
            <Mapping />
            {!allAnswered && <span className="small b">جاوب على الأسئلة الفوق قبل.</span>}
            <button className="btn btn-y btn-big" disabled={!allAnswered || busy} onClick={() => void save()}>
              {busy ? "نعمّر…" : "كمّل وعمّر البرنامج"}
            </button>
            <button type="button" className="btn-plain" onClick={() => setRes(null)} style={{ justifyContent: "center" }}>
              اختار دوسي آخر
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function Mapping() {
  const k = (t: string) => (
    <span dir="ltr" className="bb" style={{ padding: "0 6px", background: "var(--yellow)", color: "var(--ink)" }}>
      {t}
    </span>
  );
  return (
    <div className="dark col" style={{ padding: 14, gap: 8, border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--mint)" }}>
      <span className="bb" style={{ fontSize: 15 }}>
        فهمت الكتيبة تاعك
      </span>
      <div className="col" style={{ gap: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
        <span>{k("x 2")} ← جوج أجهزة في بروفايل واحد</span>
        <span>
          {k("{6}")} ولا {k("{3}")} ← 6 ولا 3 أشهر، وتبديل الحساب كل 30 يوم
        </span>
        <span>رقم ثاني في نفس البروفايل ← زبون ثاني يتقاسم البروفايل</span>
        <span>ملف الإيميل ← إيميل الحساب</span>
        <span>دوسي «1 mounth (N)» ← حساب N</span>
      </div>
    </div>
  );
}
