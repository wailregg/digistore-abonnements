import { useState } from "react";
import { useStore } from "../lib/store";
import { daysLabel, diffDays, fmtDayMonth, fmtFull, fmtLong, monthsLabel, today } from "../lib/dates";
import { TINT, clientName, currentSubs, daysLeft, fillTemplate, initial, renewalCount, toneOf, TONE_BG, SOURCES } from "../lib/logic";
import { displayPhone, normPhone } from "../lib/phone";
import { contact } from "../lib/contact";
import { MessageBox } from "../components";
import { Avatar, copyText, Header, Icon, Nav, Phone, ProductChip, Seg, Sheet } from "../ui";

export function ClientCard({ id }: { id: string }) {
  const { data, update, remove, toast } = useStore();
  const now = today();
  const c = data.clients.find((x) => x.id === id);
  const [msgFor, setMsgFor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [noteEdit, setNoteEdit] = useState(false);
  const [note, setNote] = useState(c?.note ?? "");

  if (!c)
    return (
      <div className="app">
        <Header back={{ href: "#/clients", label: "الزبائن" }}>
          <h1>ما لقيتش هذا الزبون</h1>
        </Header>
        <Nav active="clients" />
      </div>
    );

  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  const all = data.subs.filter((s) => s.client_id === c.id).sort((a, b) => b.start_date.localeCompare(a.start_date));
  const current = currentSubs(all).sort((a, b) => b.end_date.localeCompare(a.end_date));
  const renewals = renewalCount(c.id, data.subs);
  const first = all.length ? all[all.length - 1].start_date : null;
  const wa = contact(c, "");

  return (
    <div className="app">
      <Header back={{ href: "#/clients", label: "الزبائن" }}>
        <div className="row" style={{ gap: 14 }}>
          <Avatar letter={initial(c)} bg="var(--mint)" size={64} />
          <div className="col grow">
            <h1>{clientName(c)}</h1>
            <Phone value={displayPhone(c.phone)} className="b" />
            <span className="small" style={{ color: "#3d3b34" }}>
              {first ? `زبون من ${fmtDayMonth(first)} · ${all.length} مشتريات` : "ما شرا والو مازال"}
              {c.source ? ` · جا من ${c.source}` : ""}
            </span>
            {renewals >= 3 && (
              <span className="chip row" style={{ alignSelf: "flex-start", marginTop: 4, gap: 4, background: "var(--ink)", color: "var(--yellow)" }}>
                <Icon name="star" size={14} stroke={2.4} />
                زبون وفي · {renewals} تجديدات · تقدر تديرلو تخفيض
              </span>
            )}
          </div>
          <button className="btn icon" aria-label="بدّل معلومات الزبون" onClick={() => setEditing(true)}>
            <Icon name="edit" />
          </button>
        </div>
        <div className="grid3">
          {wa ? (
            <a className="btn btn-m" href={wa.href} target="_blank" rel="noreferrer">
              <Icon name="chat" size={18} />
              {wa.copyFirst ? "إنستغرام" : "واتساب"}
            </a>
          ) : (
            <span />
          )}
          {/^0\d{9}$/.test(c.phone) ? (
            <a className="btn" href={`tel:${c.phone}`}>
              <Icon name="phone" size={18} />
              اتصل
            </a>
          ) : (
            <span />
          )}
          <button className="btn" onClick={() => void copyText(c.phone).then((ok) => toast(ok ? "تنسخ الرقم" : "ما قدرتش ننسخ"))}>
            <Icon name="copy" size={18} />
            انسخ
          </button>
        </div>
      </Header>

      <section className="sec">
        <div className="row between">
          <h2 style={{ fontSize: 18 }}>{current.length > 1 ? "الاشتراكات تاعو" : "الاشتراك"}</h2>
          <a className="btn" href={`#/add?client=${c.id}`}>
            <Icon name="plus" size={18} />
            اشتراك آخر
          </a>
        </div>
        {current.length === 0 && <div className="empty">ما عندو حتى اشتراك.</div>}
        {current.map((s) => {
          const d = daysLeft(s, now);
          const tone = toneOf(d);
          const a = s.account_id ? accounts.get(s.account_id) : undefined;
          const total = diffDays(s.start_date, s.end_date);
          const passed = Math.min(total, Math.max(0, diffDays(s.start_date, now)));
          const tpl = d < 0 ? "ended" : !s.paid ? "pay" : "renew";
          return (
            <div key={s.id} className="box" style={{ boxShadow: "5px 5px 0 var(--ink)" }}>
              <div className="row between" style={{ padding: "12px 14px", borderBottom: "2px solid var(--ink)" }}>
                <ProductChip product={s.product} />
                <span className="b" style={{ fontSize: 13 }}>
                  {monthsLabel(s.months)}
                  {a ? ` · ${a.label}` : ""}
                  {s.profile ? ` · بروفايل ${s.profile}` : ""}
                </span>
              </div>
              <div className="col" style={{ padding: "16px 14px", gap: 6, background: TONE_BG[tone], color: tone === "gone" ? "#fff" : "var(--ink)", borderBottom: "2px solid var(--ink)" }}>
                <span className="b" style={{ fontSize: 13 }}>
                  {d < 0 ? "كمّل" : "ينتهي"}
                </span>
                <span style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 900 }}>{daysLabel(d)}</span>
                <span className="b" style={{ fontSize: 15 }}>
                  {fmtLong(s.end_date)}
                </span>
                <div className="bar" aria-hidden="true" style={{ marginTop: 8, borderColor: tone === "gone" ? "#fff" : "var(--ink)" }}>
                  <span style={{ width: `${total ? (passed / total) * 100 : 100}%` }} />
                </div>
                <div className="row between small">
                  <span>بدا {fmtFull(s.start_date)}</span>
                  <span>
                    {passed} من {total} يوم
                  </span>
                </div>
              </div>
              <div className="grid2" style={{ gap: 0 }}>
                <Cell label="الحساب" value={a ? (a.email || a.label) : "—"} ltr={!!a?.email} />
                <Cell label="الدفع" value={`${s.pay_method || "—"} · ${s.paid ? "خلّص" : "ما خلّصش"}${s.price ? ` · ${s.price} دج` : ""}`} side />
                <Cell label="الأجهزة" value={s.devices > 1 ? `×${s.devices} أجهزة` : "جهاز واحد"} last />
                <Cell label="ملاحظة" value={s.note || "—"} side last />
              </div>
              <div className="grid2" style={{ padding: 12, borderTop: "2px solid var(--ink)" }}>
                <a className="btn btn-y" href={`#/add?renew=${s.id}`} style={{ flexDirection: "column", gap: 0, minHeight: 52 }}>
                  <span>جدّد {monthsLabel(s.months)}</span>
                </a>
                <button className="btn btn-m" onClick={() => setMsgFor(msgFor === s.id ? null : s.id)}>
                  <Icon name="chat" size={18} />
                  {tpl === "pay" ? "ذكّرو بالخلاص" : "ابعث تذكير"}
                </button>
                {!s.paid && (
                  <button
                    className="btn"
                    onClick={() => void update("subscriptions", s.id, { paid: true }).then(() => toast("تسجّل: خلّص"))}
                  >
                    <Icon name="check" size={18} />
                    خلّص
                  </button>
                )}
                <a className="btn" href={`#/add?edit=${s.id}`}>
                  <Icon name="edit" size={18} />
                  بدّل
                </a>
              </div>
              {msgFor === s.id && (
                <div style={{ padding: 12, borderTop: "2px dashed var(--ink)" }}>
                  <MessageBox
                    client={c}
                    initial={fillTemplate(data.settings.templates[tpl], {
                      name: c.name,
                      product: s.product,
                      end: s.end_date,
                      email: a?.email,
                      profile: s.profile,
                    })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="sec">
        <h2 style={{ fontSize: 18 }}>السجل</h2>
        <ol className="box divide" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {all.map((s, i) => {
            const isFirst = i === all.length - 1;
            const a = s.account_id ? accounts.get(s.account_id) : undefined;
            return (
              <li key={s.id} className="row" style={{ padding: 12, alignItems: "flex-start", gap: 12 }}>
                <span className="dot" style={{ marginTop: 5, background: TINT[s.product] ?? "var(--white)" }} />
                <div className="col grow">
                  <span className="small muted b">{fmtDayMonth(s.start_date)}</span>
                  <span className="b" style={{ fontSize: 14 }}>
                    {isFirst ? "أول شراء: " : all.slice(i + 1).some((o) => o.product === s.product) ? "تجديد " : ""}
                    <span dir="ltr">{s.product}</span> {monthsLabel(s.months)}
                    {a ? ` · ${a.label}` : ""}
                    {s.profile ? ` · بروفايل ${s.profile}` : ""}
                    {s.price ? ` · ${s.price} دج` : ""}
                  </span>
                </div>
                <button
                  className="btn-plain"
                  aria-label="امسح هذا الشراء"
                  onClick={() => {
                    if (confirm("تمسح هذا الشراء من السجل؟")) void remove("subscriptions", s.id).then(() => toast("تمسح"));
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            );
          })}
          {all.length === 0 && <li className="pad small">ما كاين والو.</li>}
        </ol>
      </section>

      <section className="sec" style={{ paddingBottom: 24 }}>
        <div className="row between">
          <h2 style={{ fontSize: 18 }}>ملاحظة</h2>
          {!noteEdit && (
            <button className="btn-plain" onClick={() => setNoteEdit(true)}>
              <Icon name="edit" size={16} />
              بدّل
            </button>
          )}
        </div>
        {noteEdit ? (
          <div className="col" style={{ gap: 8 }}>
            <label className="small" htmlFor="cnote">
              ملاحظة على هذا الزبون
            </label>
            <textarea id="cnote" className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              className="btn btn-y"
              onClick={() => void update("clients", c.id, { note }).then(() => setNoteEdit(false))}
            >
              سجّل
            </button>
          </div>
        ) : (
          <p className="msg" style={{ background: "var(--white)", borderStyle: "dashed" }}>
            {c.note || "ما كاين حتى ملاحظة."}
          </p>
        )}
        <button
          className="btn-plain"
          style={{ alignSelf: "flex-start", color: "#b3261e" }}
          onClick={() => {
            if (confirm(`تمسح ${clientName(c)} وكل السجل تاعو؟ ما يرجعش.`))
              void remove("clients", c.id).then(() => {
                toast("تمسح الزبون");
                location.hash = "#/clients";
              });
          }}
        >
          <Icon name="trash" size={16} />
          امسح الزبون
        </button>
      </section>

      {editing && <EditClient id={c.id} onClose={() => setEditing(false)} />}
      <Nav active="clients" />
    </div>
  );
}

function Cell({ label, value, side, last, ltr }: { label: string; value: string; side?: boolean; last?: boolean; ltr?: boolean }) {
  return (
    <div
      className="col"
      style={{
        padding: "10px 14px",
        borderBottom: last ? 0 : "2px solid var(--ink)",
        borderInlineStart: side ? "2px solid var(--ink)" : 0,
      }}
    >
      <span className="small muted">{label}</span>
      <span className="b" dir={ltr ? "ltr" : undefined} style={{ fontSize: 14, alignSelf: "flex-start", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function EditClient({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, update, toast } = useStore();
  const c = data.clients.find((x) => x.id === id)!;
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone);
  const [source, setSource] = useState(c.source || "Instagram");
  return (
    <Sheet title="معلومات الزبون" onClose={onClose}>
      <div className="field">
        <label htmlFor="ec-name">الاسم</label>
        <input id="ec-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ec-phone">الرقم ولا حساب إنستغرام</label>
        <input id="ec-phone" className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <fieldset>
        <legend className="legend">منين جا</legend>
        <Seg options={SOURCES.map((s) => ({ value: s, label: s }))} value={source} onChange={setSource} />
      </fieldset>
      <button
        className="btn btn-y btn-big"
        onClick={() =>
          void update("clients", id, { name: name.trim(), phone: normPhone(phone), source }).then(() => {
            toast("تسجّل");
            onClose();
          })
        }
      >
        سجّل
      </button>
    </Sheet>
  );
}
