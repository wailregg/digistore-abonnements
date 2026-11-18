import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { fmtShort, monthKey, monthLabel, shiftMonth, today } from "../lib/dates";
import { clientName, fillTemplate, money, renewalCount, uid } from "../lib/logic";
import { contact } from "../lib/contact";
import { copyText, Icon, Nav, Sheet } from "../ui";

export function Money() {
  const { data, update, toast } = useStore();
  const now = today();
  const [month, setMonth] = useState(monthKey(now));
  const [addExpense, setAddExpense] = useState(false);
  const clients = new Map(data.clients.map((c) => [c.id, c]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a]));

  const v = useMemo(() => {
    const inMonth = data.subs.filter((s) => monthKey(s.start_date) === month);
    const paidSubs = inMonth.filter((s) => s.paid);
    const revenue = paidSubs.reduce((n, s) => n + (s.price ?? 0), 0);
    const exp = data.expenses.filter((e) => monthKey(e.date) === month);
    const costs = exp.reduce((n, e) => n + e.amount, 0);
    const byProduct = new Map<string, number>();
    for (const s of paidSubs) byProduct.set(s.product, (byProduct.get(s.product) ?? 0) + (s.price ?? 0));
    let other = 0;
    for (const e of exp) {
      const a = e.account_id ? accounts.get(e.account_id) : undefined;
      if (a) byProduct.set(a.product, (byProduct.get(a.product) ?? 0) - e.amount);
      else other += e.amount;
    }
    const profitRows = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);
    const unpaid = data.subs.filter((s) => !s.paid).sort((a, b) => a.start_date.localeCompare(b.start_date));

    const firstStart = new Map<string, string>();
    for (const s of data.subs) {
      const f = firstStart.get(s.client_id);
      if (!f || s.start_date < f) firstStart.set(s.client_id, s.start_date);
    }
    const sources = new Map<string, number>();
    let newClients = 0;
    for (const [cid, d] of firstStart) {
      if (monthKey(d) !== month) continue;
      newClients++;
      const src = clients.get(cid)?.source || "آخر";
      sources.set(src, (sources.get(src) ?? 0) + 1);
    }
    const ended = data.subs.filter((s) => monthKey(s.end_date) === month && s.end_date <= now);
    const renewed = ended.filter((s) =>
      data.subs.some((o) => o.id !== s.id && o.client_id === s.client_id && o.product === s.product && o.start_date >= s.start_date && o.created_at >= s.created_at),
    );
    const loyal = data.clients
      .map((c) => ({ c, n: renewalCount(c.id, data.subs) }))
      .filter((x) => x.n >= 3)
      .sort((a, b) => b.n - a.n);
    return {
      count: inMonth.length,
      revenue,
      costs,
      profit: revenue - costs,
      profitRows,
      other,
      unpaid,
      sources: [...sources.entries()].sort((a, b) => b[1] - a[1]),
      newClients,
      ended: ended.length,
      renewed: renewed.length,
      loyal,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, month, now]);

  const maxProfit = Math.max(1, ...v.profitRows.map((r) => Math.abs(r[1])));
  const maxSrc = Math.max(1, ...v.sources.map((r) => r[1]));

  return (
    <div className="app">
      <header className="hdr">
        <h1>الدراهم</h1>
        <div className="row between">
          <button className="btn icon" aria-label="الشهر اللي فات" onClick={() => setMonth(shiftMonth(month, -1))}>
            <Icon name="next" stroke={2.6} />
          </button>
          <span className="bb" style={{ fontSize: 18 }}>
            {monthLabel(month)}
          </span>
          <button className="btn icon" aria-label="الشهر الجاي" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey(now)}>
            <Icon name="chevron" stroke={2.6} />
          </button>
        </div>
      </header>

      <section className="sec" aria-label="ملخص الشهر">
        <div className="col" style={{ padding: 14, background: "var(--mint)", border: "2px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)" }}>
          <span className="b" style={{ fontSize: 13 }}>
            الربح هذا الشهر
          </span>
          <span style={{ fontSize: 38, lineHeight: 1.2, fontWeight: 900 }}>{money(v.profit)}</span>
          <span className="small">الدراهم اللي خلّصوها ناقص واش صرفت على الحسابات</span>
        </div>
        <div className="stats">
          <div className="stat" style={{ background: "var(--white)", cursor: "default" }}>
            <span className="b" style={{ fontSize: 13 }}>
              دخلّك
            </span>
            <span className="bb" style={{ fontSize: 22 }}>
              {money(v.revenue)}
            </span>
            <span className="small muted">{v.count} بيعة وتجديد</span>
          </div>
          <div className="stat" style={{ background: "var(--white)", cursor: "default" }}>
            <span className="b" style={{ fontSize: 13 }}>
              صرفت على الحسابات
            </span>
            <span className="bb" style={{ fontSize: 22 }}>
              {money(v.costs)}
            </span>
            <button className="btn-plain" style={{ padding: 0, minHeight: 28, fontSize: 12 }} onClick={() => setAddExpense(true)}>
              + زيد مصروف
            </button>
          </div>
        </div>
      </section>

      <section className="sec" aria-label="ما خلّصوش">
        <h2>ما خلّصوش · {v.unpaid.length}</h2>
        {v.unpaid.length === 0 && <div className="empty">كامل خلّصو.</div>}
        {v.unpaid.map((s) => {
          const c = clients.get(s.client_id);
          const text = fillTemplate(data.settings.templates.pay, { name: c?.name, product: s.product, end: s.end_date });
          const t = contact(c, text);
          return (
            <div key={s.id} className="box row" style={{ padding: "10px 12px" }}>
              <span aria-hidden="true" style={{ width: 12, alignSelf: "stretch", background: "var(--coral)", border: "2px solid var(--ink)", flex: "none" }} />
              <a className="col grow" href={`#/client/${s.client_id}`}>
                <span className="b" style={{ fontSize: 15 }}>
                  {clientName(c)}
                  {s.price ? ` · ${money(s.price)}` : ""}
                </span>
                <span className="small muted">
                  <span dir="ltr">{s.product}</span> · باع {fmtShort(s.start_date)}
                </span>
              </a>
              {t && (
                <a
                  className="btn btn-m"
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (t.copyFirst) void copyText(text);
                  }}
                >
                  ذكّرو
                </a>
              )}
              <button className="btn" onClick={() => void update("subscriptions", s.id, { paid: true }).then(() => toast("تسجّل: خلّص"))}>
                خلّص
              </button>
            </div>
          );
        })}
      </section>

      <section className="sec" aria-label="الربح على كل اشتراك">
        <h2>الربح على كل اشتراك</h2>
        <div className="box pad col" style={{ gap: 10 }}>
          {v.profitRows.length === 0 && v.other === 0 && <span className="small">ما كاين حتى بيعة هذا الشهر.</span>}
          {v.profitRows.map(([p, n]) => (
            <Bar key={p} label={<span dir="ltr">{p}</span>} value={money(n)} pct={(Math.abs(n) / maxProfit) * 100} color={n < 0 ? "var(--coral)" : "var(--yellow)"} />
          ))}
          {v.other > 0 && <Bar label="مصاريف أخرى" value={"− " + money(v.other)} pct={(v.other / maxProfit) * 100} color="var(--coral)" />}
        </div>
      </section>

      <section className="sec" aria-label="منين جاو الزبائن">
        <h2>منين جاو الزبائن الجداد · {v.newClients}</h2>
        <div className="box pad col" style={{ gap: 10 }}>
          {v.sources.length === 0 && <span className="small">ما كاين حتى زبون جديد هذا الشهر.</span>}
          {v.sources.map(([s, n]) => (
            <Bar key={s} label={s} value={`${n} زبون`} pct={(n / maxSrc) * 100} color="var(--mint)" />
          ))}
        </div>
      </section>

      <section className="sec" aria-label="الزبائن الأوفياء" style={{ paddingBottom: 24 }}>
        <div className="dark col" style={{ padding: 14, gap: 10, border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--mint)" }}>
          <span className="row bb" style={{ fontSize: 15 }}>
            <span style={{ color: "var(--yellow)" }}>
              <Icon name="star" size={22} />
            </span>
            {v.loyal.length} زبائن أوفياء (3 تجديدات ولا كثر)
          </span>
          {v.ended > 0 && (
            <span className="small muted">
              هذا الشهر: من {v.ended} اللي كمّلو، جدّدو {v.renewed}
            </span>
          )}
          {v.loyal.slice(0, 10).map(({ c, n }) => (
            <a key={c.id} href={`#/client/${c.id}`} className="row between" style={{ minHeight: 40, borderTop: "1px solid #444" }}>
              <span className="b">{clientName(c)}</span>
              <span className="small">{n} تجديدات</span>
            </a>
          ))}
        </div>
      </section>

      {addExpense && <ExpenseForm onClose={() => setAddExpense(false)} />}
      <Nav active="money" />
    </div>
  );
}

function Bar({ label, value, pct, color }: { label: React.ReactNode; value: string; pct: number; color: string }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="row between b" style={{ fontSize: 13 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div aria-hidden="true" style={{ height: 12, background: "var(--paper)", border: "2px solid var(--ink)" }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", background: color, borderInlineEnd: "2px solid var(--ink)" }} />
      </div>
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { data, add, toast } = useStore();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  return (
    <Sheet title="مصروف جديد" onClose={onClose}>
      <div className="field">
        <label htmlFor="ex-amount">شحال (دج)</label>
        <input id="ex-amount" className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ex-date">النهار</label>
        <input id="ex-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ex-acc">على أنهي حساب</label>
        <select id="ex-acc" className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">بلا حساب</option>
          {data.accounts
            .filter((a) => !a.archived)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.product} · {a.label}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ex-note">ملاحظة</label>
        <input id="ex-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button
        className="btn btn-y btn-big"
        onClick={() => {
          const n = Math.round(Number(amount.replace(/\s/g, "")) || 0);
          if (n <= 0) return;
          void add("expenses", [{ id: uid(), date, amount: n, account_id: account || null, note, created_at: new Date().toISOString() }]).then(() => {
            toast("تسجّل المصروف");
            onClose();
          });
        }}
      >
        سجّل
      </button>
    </Sheet>
  );
}
