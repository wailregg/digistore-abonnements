import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { daysLabel, diffDays, fmtLong, fmtShort, monthsLabel, today } from "../lib/dates";
import {
  TINT,
  clientName,
  currentSubs,
  daysLeft,
  devicesUsed,
  fillTemplate,
  freeSlots,
  initial,
  isActive,
  moveDue,
  subWhere,
} from "../lib/logic";
import { displayPhone } from "../lib/phone";
import { contact } from "../lib/contact";
import type { Sub } from "../lib/types";
import { MessageBox } from "../components";
import { Avatar, copyText, Icon, Logo, Nav, Phone, ProductChip } from "../ui";

type Tab = "today" | "week" | "ended";

export function Home() {
  const { data } = useStore();
  const now = today();
  const [tab, setTab] = useState<Tab>("today");
  const [open, setOpen] = useState<string | null>(null);

  const v = useMemo(() => {
    const cur = currentSubs(data.subs);
    const rows = cur.map((s) => ({ s, d: daysLeft(s, now) }));
    const todayList = rows.filter((r) => r.d === 0);
    const week = rows.filter((r) => r.d >= 1 && r.d <= 7).sort((a, b) => a.d - b.d);
    const ended = rows.filter((r) => r.d < 0 && r.d >= -30).sort((a, b) => b.d - a.d);
    const active = rows.filter((r) => r.d >= 0);
    const moves = cur.map((s) => ({ s, m: moveDue(s, now) })).filter((x) => x.m) as { s: Sub; m: { due: string; month: number } }[];
    const accountAlerts = data.accounts
      .filter((a) => !a.archived)
      .map((a) => {
        const used = devicesUsed(a.id, cur, now);
        const supplierDays = a.supplier_end ? diffDays(now, a.supplier_end) : null;
        const beyond = a.supplier_end
          ? cur.filter((s) => s.account_id === a.id && isActive(s, now) && s.end_date > a.supplier_end!).length
          : 0;
        return { a, used, supplierDays, beyond };
      })
      .filter((x) => (x.supplierDays != null && x.supplierDays <= 7) || x.used > x.a.device_limit);
    return {
      cur,
      todayList,
      week,
      ended,
      activeCount: active.length,
      productCount: new Set(active.map((r) => r.s.product)).size,
      moves,
      accountAlerts,
    };
  }, [data, now]);

  const clients = new Map(data.clients.map((c) => [c.id, c]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  const list = tab === "today" ? v.todayList : tab === "week" ? v.week : v.ended;
  const go = (t: Tab) => {
    setTab(t);
    setOpen(null);
    document.getElementById("reminders")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="hdr" style={{ gap: 18, paddingBottom: 22 }}>
        <div className="row between">
          <div className="row">
            <Logo />
            <div className="col">
              <span dir="ltr" className="wordmark">
                DigiStore
              </span>
              <span className="small b">متتبّع الاشتراكات</span>
            </div>
          </div>
          <button className="btn icon" aria-label={`التذكيرات، ${v.todayList.length} اليوم`} onClick={() => go("today")} style={{ position: "relative" }}>
            <Icon name="bell" size={22} />
            {v.todayList.length > 0 && (
              <span className="chip" style={{ position: "absolute", top: -10, left: -10, background: "var(--coral)", padding: "0 5px" }}>
                {v.todayList.length}
              </span>
            )}
          </button>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <span className="small b">{fmtLong(now)}</span>
          <h1 style={{ fontSize: 28, lineHeight: 1.4 }}>
            {v.todayList.length > 0 ? (
              <>
                اليوم عندك <span className="mark">{v.todayList.length === 1 ? "تجديد واحد" : `${v.todayList.length} تجديدات`}</span>
              </>
            ) : (
              <>
                اليوم <span className="mark">ما كاين حتى تجديد</span>
              </>
            )}
          </h1>
        </div>
      </header>

      <section className="sec" aria-label="الأرقام">
        <div className="stats">
          <button className="stat" style={{ background: "var(--coral)" }} onClick={() => go("today")}>
            <span className="b" style={{ fontSize: 13 }}>
              يكمّلو اليوم
            </span>
            <span className="n">{v.todayList.length}</span>
            <span className="small">ابعثلهم دروك</span>
          </button>
          <button className="stat" style={{ background: "var(--yellow)" }} onClick={() => go("week")}>
            <span className="b" style={{ fontSize: 13 }}>
              هذا الأسبوع
            </span>
            <span className="n">{v.week.length}</span>
            <span className="small">للشوف برك، بلا تنبيه</span>
          </button>
          <button className="stat dark" style={{ boxShadow: "4px 4px 0 var(--mint)" }} onClick={() => go("ended")}>
            <span className="b" style={{ fontSize: 13 }}>
              كمّلو وما جدّدوش
            </span>
            <span className="n">{v.ended.length}</span>
            <span className="small">آخر 30 يوم</span>
          </button>
          <a className="stat" href="#/clients" style={{ background: "var(--mint)" }}>
            <span className="b" style={{ fontSize: 13 }}>
              نشطين
            </span>
            <span className="n">{v.activeCount}</span>
            <span className="small">على {v.productCount} اشتراكات</span>
          </a>
        </div>
      </section>

      {(v.moves.length > 0 || v.accountAlerts.length > 0) && (
        <section className="sec" aria-label="مهام الحسابات">
          <h2 style={{ fontSize: 22 }}>مهام الحسابات</h2>
          {v.moves.map(({ s, m }) => (
            <MoveCard key={s.id} sub={s} month={m.month} />
          ))}
          {v.accountAlerts.map(({ a, used, supplierDays, beyond }) => (
            <a key={a.id} href={`#/account/${a.id}`} className="box pad row">
              <span className="avatar" style={{ width: 44, height: 44, background: "var(--coral)" }}>
                <Icon name="alert" size={22} />
              </span>
              <div className="col grow">
                <span className="b" style={{ fontSize: 15 }}>
                  <span dir="ltr">{a.product}</span> · {a.label}
                  {supplierDays != null && supplierDays <= 7
                    ? supplierDays < 0
                      ? ` كمّل عند المورّد ${fmtShort(a.supplier_end!)}`
                      : ` يكمّل عند المورّد ${fmtShort(a.supplier_end!)}`
                    : ""}
                </span>
                <span className="small muted">
                  {beyond > 0 ? `${beyond} زبائن يفوتو هذا التاريخ · ` : ""}
                  {used} أجهزة من {a.device_limit}
                  {used > a.device_limit ? " (فوق الحد)" : ""}
                </span>
              </div>
              <Icon name="chevron" />
            </a>
          ))}
        </section>
      )}

      <section className="sec" id="reminders" aria-label="التذكيرات" style={{ paddingBottom: 24 }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <h2 style={{ fontSize: 22 }}>التذكيرات</h2>
          <span className="small muted">اضغط «واتساب» تشوف الرسالة</span>
        </div>
        <div className="seg">
          {(
            [
              ["today", "اليوم", v.todayList.length],
              ["week", "الأسبوع", v.week.length],
              ["ended", "كمّلو", v.ended.length],
            ] as const
          ).map(([k, label, n]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => go(k)}>
              {label} · {n}
            </button>
          ))}
        </div>
        {list.length === 0 && (
          <div className="empty">
            {tab === "today" ? "ما كاين حتى واحد يكمّل اليوم." : tab === "week" ? "ما كاين حتى واحد يكمّل هذا الأسبوع." : "ما كاين حتى واحد كمّل وما جدّدش."}
          </div>
        )}
        {list.map(({ s, d }) => {
          const c = clients.get(s.client_id);
          const where = subWhere(s, accounts);
          const a = s.account_id ? accounts.get(s.account_id) : undefined;
          const msg = fillTemplate(data.settings.templates[tab === "ended" ? "ended" : "renew"], {
            name: c?.name,
            product: s.product,
            end: s.end_date,
            email: a?.email,
            profile: s.profile,
          });
          const isOpen = open === s.id;
          return (
            <article key={s.id} className="box pad col" style={{ gap: 10 }}>
              <div className="row">
                <Avatar letter={initial(c)} bg={TINT[s.product] ?? "var(--white)"} />
                <div className="col grow">
                  <a href={`#/client/${s.client_id}`} className="b" style={{ fontSize: 16 }}>
                    {clientName(c)}
                  </a>
                  <Phone value={displayPhone(c?.phone ?? "")} className="small muted" />
                </div>
                <ProductChip product={s.product} />
              </div>
              <div className="row between">
                <div className="col">
                  <span className="row b" style={{ gap: 6, fontSize: 14 }}>
                    <span className="dot" style={{ background: tab === "today" ? "var(--coral)" : tab === "week" ? "var(--yellow)" : "var(--ink)" }} />
                    {daysLabel(d)} · {fmtShort(s.end_date)}
                  </span>
                  <span className="small muted">
                    {monthsLabel(s.months)}
                    {where ? " · " + where : ""}
                    {s.devices > 1 ? ` · ×${s.devices} أجهزة` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-m"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  style={{ flex: "none" }}
                >
                  <Icon name="chat" size={18} />
                  واتساب
                </button>
              </div>
              {isOpen && (
                <div style={{ paddingTop: 12, borderTop: "2px dashed var(--ink)" }}>
                  <MessageBox
                    client={c}
                    initial={msg}
                    extra={
                      <a className="btn" href={`#/add?renew=${s.id}`}>
                        <Icon name="refresh" size={18} />
                        جدّد
                      </a>
                    }
                  />
                </div>
              )}
            </article>
          );
        })}
      </section>

      <Nav active="home" />
    </div>
  );
}

function MoveCard({ sub, month }: { sub: Sub; month: number }) {
  const { data, update, toast } = useStore();
  const now = today();
  const c = data.clients.find((x) => x.id === sub.client_id);
  const from = data.accounts.find((a) => a.id === sub.account_id);
  const slots = freeSlots(sub.product, data, now, sub.account_id);
  const [pick, setPick] = useState(0);
  const target = slots[pick];
  const text = fillTemplate(data.settings.templates.move, {
    name: c?.name,
    product: sub.product,
    end: sub.end_date,
    email: target?.account.email,
    profile: target?.profile,
  });
  const link = contact(c, text);

  async function apply(markOnly: boolean) {
    const patch: Partial<Sub> = markOnly
      ? { last_move: now }
      : { last_move: now, account_id: target.account.id, profile: target.profile };
    await update("subscriptions", sub.id, patch);
    toast(markOnly ? "تسجّل بلي تبدّل" : `تبدّل لـ ${target.account.label} · بروفايل ${target.profile}`);
  }

  return (
    <article className="box pad col" style={{ gap: 10 }}>
      <div className="row">
        <span className="avatar" style={{ width: 44, height: 44, background: "var(--lilac)" }}>
          <Icon name="swap" size={22} />
        </span>
        <div className="col grow">
          <a href={`#/client/${sub.client_id}`} className="b" style={{ fontSize: 15 }}>
            بدّل {clientName(c)} لحساب جديد
          </a>
          <span className="small muted">
            <span dir="ltr">{sub.product}</span> {monthsLabel(sub.months)} · بدا الشهر {month} من {sub.months}
          </span>
        </div>
      </div>
      {target ? (
        <>
          <div className="row between b" style={{ padding: "8px 10px", background: "var(--paper)", border: "2px dashed var(--ink)", fontSize: 13 }}>
            <span>
              {from?.label ?? "؟"}
              {sub.profile ? ` · بروفايل ${sub.profile}` : ""}
            </span>
            <span aria-hidden="true">←</span>
            {slots.length > 1 ? (
              <select
                aria-label="الحساب الجديد"
                className="input"
                style={{ minHeight: 40, width: "auto", fontSize: 13, padding: "0 6px" }}
                value={pick}
                onChange={(e) => setPick(Number(e.target.value))}
              >
                {slots.map((sl, i) => (
                  <option key={sl.account.id + sl.profile} value={i}>
                    {sl.account.label} · بروفايل {sl.profile}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {target.account.label} · بروفايل {target.profile}
              </span>
            )}
          </div>
          <div className="grid2">
            {link ? (
              <a
                className="btn btn-m"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (link.copyFirst) void copyText(text);
                  void apply(false);
                }}
              >
                <Icon name="chat" size={18} />
                بدّل وابعثلو
              </a>
            ) : (
              <button className="btn btn-m" onClick={() => void copyText(text).then(() => apply(false))}>
                بدّل وانسخ الرسالة
              </button>
            )}
            <button className="btn" onClick={() => void apply(true)}>
              بدّلتو من قبل
            </button>
          </div>
        </>
      ) : (
        <div className="empty small">
          ما كاين حتى بروفايل فارغ في حساب آخر تاع <span dir="ltr">{sub.product}</span>. زيد حساب جديد من «الزبائن».
          <button className="btn" onClick={() => void apply(true)}>
            بدّلتو من قبل
          </button>
        </div>
      )}
    </article>
  );
}
