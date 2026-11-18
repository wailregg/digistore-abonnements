import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { daysLabel, fmtShort, today } from "../lib/dates";
import { PRODUCTS, TONE_BG, accountLife, clientName, currentSubs, daysLeft, devicesUsed, isActive, toneOf } from "../lib/logic";
import { searchKey } from "../lib/phone";
import type { Sub } from "../lib/types";
import { AccountForm, SubRow } from "../components";
import { Icon, Nav, ProductChip } from "../ui";

export function Clients({ product }: { product?: string }) {
  const { data } = useStore();
  const now = today();
  const [q, setQ] = useState("");
  const [prod, setProd] = useState(product && PRODUCTS.includes(product as never) ? product : "Netflix");
  const [newAccount, setNewAccount] = useState(false);

  const cur = useMemo(() => currentSubs(data.subs), [data.subs]);
  const visible = (s: Sub) => daysLeft(s, now) >= -30;
  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients]);

  const key = searchKey(q);
  const results = useMemo(() => {
    if (!key) return [];
    return data.clients
      .filter((c) => (/^[\d]+$/.test(key) ? c.phone.includes(key) : c.phone.includes(key) || c.name.toLowerCase().includes(key)))
      .slice(0, 50);
  }, [key, data.clients]);

  const counts = new Map<string, number>();
  for (const s of cur) if (isActive(s, now)) counts.set(s.product, (counts.get(s.product) ?? 0) + 1);

  const accounts = data.accounts
    .filter((a) => a.product === prod && !a.archived)
    .sort((a, b) => a.label.localeCompare(b.label, "ar", { numeric: true }));
  const productSubs = cur.filter((s) => s.product === prod && visible(s));
  const accountIds = new Set(accounts.map((a) => a.id));
  const loose = productSubs
    .filter((s) => !s.account_id || !accountIds.has(s.account_id))
    .sort((a, b) => a.end_date.localeCompare(b.end_date));

  return (
    <div className="app">
      <header className="hdr">
        <div className="row between">
          <h1>الزبائن</h1>
          <a className="btn btn-k" href={`#/add?product=${encodeURIComponent(prod)}`} style={{ boxShadow: "3px 3px 0 #fff" }}>
            <Icon name="plus" size={18} stroke={2.6} />
            بيع جديد
          </a>
        </div>
        <div className="field">
          <label htmlFor="q">ابحث بالرقم ولا بالاسم (في كل الاشتراكات)</label>
          <div className="row box" style={{ padding: "0 12px", minHeight: 52, gap: 8 }}>
            <Icon name="search" stroke={2.4} />
            <input
              id="q"
              type="search"
              className="grow"
              style={{ border: 0, outline: "none", background: "transparent", fontSize: 16, fontWeight: 700, minHeight: 48 }}
              placeholder="الصق الرقم من واتساب ولا اكتب الاسم"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span className="small">
            يفهم الرقم بجوج الأشكال: <span dir="ltr">+213 661…</span> و <span dir="ltr">0661…</span>
          </span>
        </div>
      </header>

      {key ? (
        <section className="sec" aria-label="نتائج البحث" style={{ paddingBottom: 24 }}>
          <span className="bb">{results.length ? `لقيت ${results.length}` : "ما لقيت حتى واحد بهذا الرقم ولا الاسم"}</span>
          {results.length === 0 && (
            <a className="btn btn-y" href={`#/add?phone=${encodeURIComponent(q)}`}>
              <Icon name="plus" size={18} />
              سجّلو زبون جديد
            </a>
          )}
          {results.map((c) => {
            const subs = cur.filter((s) => s.client_id === c.id).sort((a, b) => b.end_date.localeCompare(a.end_date));
            return (
              <div key={c.id} className="box">
                {subs.length === 0 ? (
                  <a href={`#/client/${c.id}`} className="row pad b">
                    {clientName(c)}
                  </a>
                ) : (
                  <div className="divide">
                    {subs.map((s) => (
                      <div key={s.id}>
                        <div className="row" style={{ padding: "6px 12px 0" }}>
                          <ProductChip product={s.product} small />
                        </div>
                        <SubRow sub={s} client={c} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <>
          <section className="sec" aria-label="الاشتراكات">
            <div className="chips">
              {PRODUCTS.map((p) => (
                <button key={p} type="button" aria-pressed={p === prod} onClick={() => setProd(p)}>
                  <span dir="ltr">{p}</span>
                  <span className="count">{counts.get(p) ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="row wrap small" style={{ gap: "6px 14px" }} aria-label="معنى الألوان">
              {[
                ["var(--coral)", "اليوم"],
                ["var(--yellow)", "أقل من أسبوع"],
                ["var(--mint)", "نشط"],
                ["var(--ink)", "كمّل"],
              ].map(([bg, l]) => (
                <span key={l} className="row" style={{ gap: 5 }}>
                  <span className="dot" style={{ background: bg }} />
                  {l}
                </span>
              ))}
            </div>
          </section>

          <section className="sec" aria-label="الحسابات" style={{ paddingBottom: 24 }}>
            {accounts.map((a) => {
              const used = devicesUsed(a.id, cur, now);
              const over = used > a.device_limit;
              const life = accountLife(a, now);
              const beyond = life ? cur.filter((s) => s.account_id === a.id && isActive(s, now) && s.end_date > life.end).length : 0;
              const tone = life ? toneOf(life.left) : null;
              return (
                <div key={a.id} className="box">
                  <div className="row between dark" style={{ padding: "10px 12px" }}>
                    <div className="col">
                      <span className="bb" style={{ fontSize: 15 }}>
                        <span dir="ltr">{a.product}</span> · {a.label}
                      </span>
                      {a.email && (
                        <span dir="ltr" className="small muted phone">
                          {a.email}
                        </span>
                      )}
                    </div>
                    <span className="chip" style={{ background: over ? "var(--coral)" : used === a.device_limit ? "var(--yellow)" : "var(--mint)", color: "var(--ink)", borderColor: "transparent" }}>
                      أجهزة {used}/{a.device_limit}
                    </span>
                  </div>
                  <a
                    href={`#/account/${a.id}`}
                    className="col small b"
                    style={{ gap: 6, padding: "8px 12px", borderTop: "2px solid var(--ink)", background: tone ? TONE_BG[tone] : "var(--yellow)", color: tone === "gone" ? "#fff" : "var(--ink)" }}
                  >
                    <span className="row between">
                      <span className="bb" style={{ fontSize: 15 }}>
                        {life ? `الحساب: ${daysLabel(life.left)}` : "حط نهار التفعيل"}
                      </span>
                      <span className="row" style={{ gap: 2 }}>
                        تفاصيل
                        <Icon name="chevron" size={16} stroke={2.6} />
                      </span>
                    </span>
                    {life && (
                      <>
                        <div className="bar" aria-hidden="true" style={{ height: 10, borderColor: tone === "gone" ? "#fff" : "var(--ink)" }}>
                          <span style={{ width: `${(life.passed / life.total) * 100}%`, background: tone === "gone" ? "#fff" : "var(--ink)" }} />
                        </div>
                        <span>
                          {life.start ? `تفعّل ${fmtShort(life.start)} · ` : ""}
                          {life.left < 0 ? "كمّل" : "يكمّل"} {fmtShort(life.end)}
                          {beyond ? ` · ${beyond} زبائن يفوتوه` : ""}
                        </span>
                      </>
                    )}
                  </a>
                  {Array.from({ length: a.profiles }, (_, i) => i + 1).map((p) => {
                    const inProfile = productSubs.filter((s) => s.account_id === a.id && s.profile === p);
                    const activeOnes = inProfile.filter((s) => isActive(s, now));
                    return (
                      <div key={p} style={{ borderTop: "2px solid var(--ink)" }}>
                        {activeOnes.length === 0 && (
                          <a
                            href={`#/add?product=${encodeURIComponent(prod)}&account=${a.id}&profile=${p}`}
                            className="row"
                            style={{ minHeight: 58, padding: "8px 12px", background: "var(--paper)" }}
                          >
                            <span className="slot" style={{ borderStyle: "dashed" }}>
                              {p}
                            </span>
                            <span className="grow b muted" style={{ fontSize: 14 }}>
                              بروفايل فارغ
                            </span>
                            <span className="chip" style={{ background: "var(--yellow)" }}>
                              + بيعو
                            </span>
                          </a>
                        )}
                        {inProfile.map((s) => (
                          <SubRow key={s.id} sub={s} client={clients.get(s.client_id)} slot={p} shared={activeOnes.length > 1 && isActive(s, now)} />
                        ))}
                      </div>
                    );
                  })}
                  {productSubs
                    .filter((s) => s.account_id === a.id && (!s.profile || s.profile > a.profiles))
                    .map((s) => (
                      <div key={s.id} style={{ borderTop: "2px solid var(--ink)" }}>
                        <SubRow sub={s} client={clients.get(s.client_id)} slot="؟" />
                      </div>
                    ))}
                </div>
              );
            })}

            {loose.length > 0 && (
              <div className="box">
                <div className="row between dark" style={{ padding: "10px 12px" }}>
                  <span className="bb" style={{ fontSize: 15 }}>
                    <span dir="ltr">{prod}</span>
                    {accounts.length > 0 ? " · بلا حساب" : ""}
                  </span>
                  <span className="chip" style={{ background: "var(--yellow)", color: "var(--ink)", borderColor: "transparent" }}>
                    {loose.length} زبون
                  </span>
                </div>
                <div className="divide" style={{ borderTop: "2px solid var(--ink)" }}>
                  {loose.map((s) => (
                    <SubRow key={s.id} sub={s} client={clients.get(s.client_id)} />
                  ))}
                </div>
              </div>
            )}

            {accounts.length === 0 && loose.length === 0 && (
              <div className="empty">
                ما كاين حتى زبون في <span dir="ltr">{prod}</span>.
                <a className="btn btn-y" href={`#/add?product=${encodeURIComponent(prod)}`}>
                  سجّل أول بيع
                </a>
              </div>
            )}

            <button className="btn" onClick={() => setNewAccount(true)}>
              <Icon name="plus" size={18} />
              زيد حساب <span dir="ltr">{prod}</span> (إيميل وبروفايلات)
            </button>
          </section>
        </>
      )}

      {newAccount && <AccountForm product={prod} onClose={() => setNewAccount(false)} />}
      <Nav active="clients" />
    </div>
  );
}
