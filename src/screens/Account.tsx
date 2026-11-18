import { useState } from "react";
import { useStore } from "../lib/store";
import { daysLabel, fmtFull, fmtLong, fmtShort, today } from "../lib/dates";
import { accountEnd, accountLife, clientName, currentSubs, devicesUsed, fillTemplate, isActive, money, profileUse, TONE_BG, toneOf, uid } from "../lib/logic";
import { displayPhone } from "../lib/phone";
import { contact } from "../lib/contact";
import type { TemplateKey } from "../lib/types";
import { AccountEndBox, AccountForm } from "../components";
import { copyText, Header, Icon, Nav, Phone, ProductChip, Seg, Sheet } from "../ui";

export function AccountScreen({ id }: { id: string }) {
  const { data, update, remove, toast } = useStore();
  const now = today();
  const a = data.accounts.find((x) => x.id === id);
  const [showPass, setShowPass] = useState(false);
  const [tpl, setTpl] = useState<TemplateKey>("down");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);

  if (!a)
    return (
      <div className="app">
        <Header back={{ href: "#/clients", label: "الزبائن" }}>
          <h1>ما لقيتش هذا الحساب</h1>
        </Header>
        <Nav active="clients" />
      </div>
    );

  const cur = currentSubs(data.subs);
  const subs = cur
    .filter((s) => s.account_id === a.id && isActive(s, now))
    .sort((x, y) => (x.profile ?? 99) - (y.profile ?? 99));
  const used = devicesUsed(a.id, cur, now);
  const life = accountLife(a, now);
  const tone = life ? toneOf(life.left) : null;
  const beyond = life ? subs.filter((s) => s.end_date > life.end) : [];
  const emptyProfiles = [...profileUse(a, cur, now).entries()].filter(([p, l]) => p >= 1 && p <= a.profiles && l.length === 0).length;
  const clients = new Map(data.clients.map((c) => [c.id, c]));
  const spent = data.expenses.filter((e) => e.account_id === a.id).reduce((n, e) => n + e.amount, 0);

  async function setLimit(n: number) {
    await update("accounts", a!.id, { device_limit: Math.max(1, Math.min(50, n)) });
  }

  return (
    <div className="app">
      <Header back={{ href: `#/clients?p=${encodeURIComponent(a.product)}`, label: "الزبائن" }}>
        <div className="row between">
          <div className="row">
            <ProductChip product={a.product} />
            <h1>{a.label}</h1>
          </div>
          <button className="btn icon" aria-label="بدّل الحساب" onClick={() => setEditing(true)}>
            <Icon name="edit" />
          </button>
        </div>
        <div className="grid2">
          <button
            className="btn"
            style={{ justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}
            onClick={() => void copyText(a.email).then((ok) => toast(ok ? "تنسخ الإيميل" : "ما قدرتش ننسخ"))}
          >
            <span dir="ltr" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.email || "بلا إيميل"}
            </span>
            <Icon name="copy" size={16} />
          </button>
          <button
            className="btn"
            style={{ justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}
            onClick={() => {
              if (showPass) void copyText(a.password).then((ok) => toast(ok ? "تنسخ كلمة السر" : "ما قدرتش ننسخ"));
              setShowPass(true);
            }}
          >
            <span dir="ltr">{showPass ? a.password || "—" : "••••••"}</span>
            <Icon name={showPass ? "copy" : "eye"} size={16} />
          </button>
        </div>
        <span className="small" style={{ color: "#3d3b34" }}>
          اضغط على كلمة السر باش تبان، ومرة أخرى باش تنسخها.
        </span>
      </Header>

      <section className="sec" aria-label="حالة الحساب">
        {life && tone ? (
          <div
            className="col"
            style={{ padding: "14px", gap: 6, background: TONE_BG[tone], color: tone === "gone" ? "#fff" : "var(--ink)", border: "2px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)" }}
          >
            <span className="b" style={{ fontSize: 13 }}>
              الحساب عند المورّد {life.left < 0 ? "كمّل" : "يكمّل"}
            </span>
            <span style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 900 }}>{daysLabel(life.left)}</span>
            <span className="b" style={{ fontSize: 15 }}>
              {fmtLong(life.end)}
            </span>
            <div className="bar" aria-hidden="true" style={{ marginTop: 8, borderColor: tone === "gone" ? "#fff" : "var(--ink)" }}>
              <span style={{ width: `${(life.passed / life.total) * 100}%`, background: tone === "gone" ? "#fff" : "var(--ink)" }} />
            </div>
            <div className="row between small">
              <span>{life.start ? `تفعّل ${fmtFull(life.start)}` : "ما كاينش نهار التفعيل"}</span>
              <span>
                {life.passed} من {life.total} يوم
              </span>
            </div>
          </div>
        ) : (
          <button className="box pad col" style={{ gap: 6, textAlign: "start", background: "var(--yellow)", boxShadow: "5px 5px 0 var(--ink)" }} onClick={() => setEditing(true)}>
            <span className="bb" style={{ fontSize: 17 }}>
              حط نهار التفعيل تاع هذا الحساب
            </span>
            <span className="small b">البرنامج يحسب {a.days || 30} يوم ويقولك شحال باقي.</span>
          </button>
        )}
        <div className="stats">
          <div className="stat" style={{ cursor: "default", background: used > a.device_limit ? "var(--coral)" : "var(--mint)" }}>
            <span className="b" style={{ fontSize: 13 }}>
              الأجهزة
            </span>
            <span className="n" dir="ltr" style={{ fontSize: 30, alignSelf: "flex-start" }}>
              {used} / {a.device_limit}
            </span>
            <span className="small">{used > a.device_limit ? `زايد بـ ${used - a.device_limit}` : used === a.device_limit ? "عامر" : `باقي ${a.device_limit - used}`}</span>
          </div>
          <div className="stat" style={{ cursor: "default", background: emptyProfiles > 0 ? "var(--yellow)" : "var(--mint)" }}>
            <span className="b" style={{ fontSize: 13 }}>
              بروفايلات فارغين
            </span>
            <span className="n" dir="ltr" style={{ fontSize: 30, alignSelf: "flex-start" }}>
              {emptyProfiles} / {a.profiles}
            </span>
            <span className="small">{emptyProfiles > 0 ? "تقدر تبيعهم" : "كامل مبيوعين"}</span>
          </div>
        </div>
        <div className="row between">
          <span className="b" style={{ fontSize: 13 }}>
            الحد تاع الأجهزة في هذا الحساب
          </span>
          <div className="row" style={{ gap: 0, border: "2px solid var(--ink)", background: "var(--white)" }}>
            <button className="btn-plain" aria-label="نقّص" style={{ width: 44, fontSize: 20, justifyContent: "center" }} onClick={() => void setLimit(a.device_limit - 1)}>
              −
            </button>
            <span className="bb" style={{ minWidth: 40, textAlign: "center", fontSize: 17 }}>
              {a.device_limit}
            </span>
            <button className="btn-plain" aria-label="زيد" style={{ width: 44, fontSize: 20, justifyContent: "center" }} onClick={() => void setLimit(a.device_limit + 1)}>
              +
            </button>
          </div>
        </div>
        <button className="btn btn-y" onClick={() => setRenewing(true)}>
          <Icon name="refresh" size={18} />
          جدّدتو عند المورّد
        </button>
        {spent > 0 && <span className="small muted">صرفت عليه في المجموع: {money(spent)}</span>}
      </section>

      {beyond.length > 0 && (
        <section className="sec" aria-label="تنبيه">
          <div className="dark col" style={{ padding: 14, gap: 8, border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--mint)" }}>
            <span className="bb" style={{ fontSize: 15 }}>
              {beyond.length} زبائن يكمّلو بعد ما يكمّل الحساب
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.7, fontWeight: 600 }}>
              {beyond.map((s) => `${clientName(clients.get(s.client_id))} ${fmtShort(s.end_date)}`).join(" · ")}. جدّد الحساب عند المورّد قبل{" "}
              {fmtShort(life!.end)}، ولا بدّلهم لحساب آخر من البطاقة تاعهم.
            </span>
          </div>
        </section>
      )}

      <section className="sec" aria-label="رسالة لكل زبائن الحساب" style={{ paddingBottom: 24 }}>
        <h2>رسالة لكل زبائن الحساب</h2>
        <Seg
          options={[
            { value: "down" as TemplateKey, label: "الحساب طاح" },
            { value: "move" as TemplateKey, label: "تبدّل الحساب" },
            { value: "renew" as TemplateKey, label: "تذكير التجديد" },
          ]}
          value={tpl}
          onChange={(v) => {
            setTpl(v);
            setSent({});
          }}
        />
        <p className="msg">
          {fillTemplate(data.settings.templates[tpl], { name: "{الاسم}", product: a.product, email: a.email, profile: "{البروفايل}" })}
        </p>
        <span className="bb">
          تبعثت لـ {Object.values(sent).filter(Boolean).length} من {subs.length} زبائن
        </span>
        <div className="box divide">
          {subs.length === 0 && <div className="pad small">ما كاين حتى زبون نشط في هذا الحساب.</div>}
          {subs.map((s) => {
            const c = clients.get(s.client_id);
            const text = fillTemplate(data.settings.templates[tpl], {
              name: c?.name,
              product: a.product,
              end: s.end_date,
              email: a.email,
              profile: s.profile,
            });
            const t = contact(c, text);
            const done = !!sent[s.id];
            return (
              <div key={s.id} className="row" style={{ minHeight: 58, padding: "6px 12px" }}>
                <span className="slot" style={{ background: "var(--yellow)" }}>
                  {s.profile ?? "؟"}
                </span>
                <a className="col grow" href={`#/client/${s.client_id}`}>
                  <span className="b">
                    {clientName(c)} {s.devices > 1 && <span className="small muted">×{s.devices} أجهزة</span>}
                  </span>
                  <Phone value={displayPhone(c?.phone ?? "")} className="small muted" />
                </a>
                {t ? (
                  <a
                    className={"btn " + (done ? "btn-k" : "btn-m")}
                    style={{ minWidth: 92, ...(done ? { color: "#fff" } : {}) }}
                    href={t.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (t.copyFirst) void copyText(text);
                      setSent((x) => ({ ...x, [s.id]: true }));
                    }}
                  >
                    {done ? "تبعثت ✓" : "ابعث"}
                  </a>
                ) : (
                  <span className="small muted">بلا رقم</span>
                )}
              </div>
            );
          })}
        </div>
        <span className="small muted" style={{ lineHeight: 1.6 }}>
          بالصراحة: واتساب يتفتح لكل واحد والرسالة واجدة، وانت تضغط «ابعث». ما يبعثش وحدو.
        </span>
        <button
          className="btn-plain"
          style={{ alignSelf: "flex-start", color: "#b3261e" }}
          onClick={() => {
            if (confirm(`تحبس ${a.label}؟ يختفي من القوائم، والسجل يبقى.`))
              void update("accounts", a.id, { archived: true }).then(() => {
                toast("تحبس الحساب");
                location.hash = `#/clients?p=${encodeURIComponent(a.product)}`;
              });
          }}
        >
          <Icon name="trash" size={16} />
          حبّس هذا الحساب
        </button>
        {subs.length === 0 && (
          <button
            className="btn-plain"
            style={{ alignSelf: "flex-start", color: "#b3261e" }}
            onClick={() => {
              if (confirm(`تمسح ${a.label} نهائياً؟`))
                void remove("accounts", a.id).then(() => {
                  location.hash = `#/clients?p=${encodeURIComponent(a.product)}`;
                });
            }}
          >
            امسحو نهائياً
          </button>
        )}
      </section>

      {editing && <AccountForm product={a.product} account={a} onClose={() => setEditing(false)} />}
      {renewing && <SupplierRenew id={a.id} onClose={() => setRenewing(false)} />}
      <Nav active="clients" />
    </div>
  );
}

function SupplierRenew({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, update, add, toast } = useStore();
  const a = data.accounts.find((x) => x.id === id)!;
  const now = today();
  // The new 30 days count from the day he renews (he can change the date).
  const [activated, setActivated] = useState(now);
  const [days, setDays] = useState(a.days || 30);
  const [cost, setCost] = useState("");
  return (
    <Sheet title={`جدّدت ${a.label} عند المورّد`} onClose={onClose}>
      <div className="grid2">
        <div className="field">
          <label htmlFor="sr-act">نهار التفعيل الجديد</label>
          <input id="sr-act" className="input" type="date" value={activated} onChange={(e) => setActivated(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sr-days">يدوم (يوم)</label>
          <input id="sr-days" className="input" type="number" inputMode="numeric" min={1} max={366} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
      </div>
      <AccountEndBox activated={activated} days={days} />
      <div className="field">
        <label htmlFor="sr-cost">
          شحال خلّصت (دج) <span className="muted b">(باش يتحسب في «الدراهم»)</span>
        </label>
        <input id="sr-cost" className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <button
        className="btn btn-y btn-big"
        disabled={!activated}
        onClick={() =>
          void (async () => {
            const len = Math.min(366, Math.max(1, days || 30));
            await update("accounts", a.id, { activated_on: activated, days: len, supplier_end: accountEnd(activated, len) });
            const amount = Math.round(Number(cost.replace(/\s/g, "")) || 0);
            if (amount > 0)
              await add("expenses", [
                { id: uid(), date: now, amount, account_id: a.id, note: `تجديد ${a.label} عند المورّد`, created_at: new Date().toISOString() },
              ]);
            toast("تسجّل");
            onClose();
          })()
        }
      >
        سجّل
      </button>
    </Sheet>
  );
}
