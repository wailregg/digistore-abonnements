import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { addDays, diffDays, endFor, fmtLong, fmtShort, monthsLabel, today } from "../lib/dates";
import { PAY_METHODS, PRODUCTS, SOURCES, clientName, currentSubs, devicesUsed, fillTemplate, freeSlots, isActive, profileUse, uid } from "../lib/logic";
import { displayPhone, normPhone } from "../lib/phone";
import { contact } from "../lib/contact";
import type { Client, Sub } from "../lib/types";
import { copyText, Icon, Seg } from "../ui";

type Slot = { account_id: string | null; profile: number | null; label: string; sub: string; tag: string };

export function AddSale({ query }: { query: URLSearchParams }) {
  const { data, add, update, toast } = useStore();
  const now = today();

  const editSub = data.subs.find((s) => s.id === query.get("edit"));
  const renewSub = data.subs.find((s) => s.id === query.get("renew"));
  const base = editSub ?? renewSub;
  const fixedClient = data.clients.find((c) => c.id === (base?.client_id ?? query.get("client")));

  const [phone, setPhone] = useState(fixedClient ? displayPhone(fixedClient.phone) : query.get("phone") ?? "");
  const known: Client | undefined = useMemo(() => {
    if (fixedClient) return fixedClient;
    const p = normPhone(phone);
    if (p.length < 4) return undefined;
    return data.clients.find((c) => c.phone === p);
  }, [phone, fixedClient, data.clients]);

  const [name, setName] = useState<string | null>(null);
  const [product, setProduct] = useState(base?.product ?? query.get("product") ?? "Netflix");
  const [months, setMonths] = useState(base?.months ?? 1);
  const renewStart = renewSub ? (renewSub.end_date > now ? renewSub.end_date : now) : null;
  const initialStart = editSub?.start_date ?? renewStart ?? now;
  const [startMode, setStartMode] = useState<"today" | "yesterday" | "custom">(
    initialStart === now ? "today" : initialStart === addDays(now, -1) ? "yesterday" : "custom",
  );
  const [customDate, setCustomDate] = useState(initialStart);
  const [slotKey, setSlotKey] = useState<string | null>(
    base ? `${base.account_id ?? ""}|${base.profile ?? ""}` : query.get("account") ? `${query.get("account")}|${query.get("profile") ?? ""}` : null,
  );
  const [devices, setDevices] = useState(base?.devices ?? 1);
  const [pay, setPay] = useState(base?.pay_method || "BaridiMob");
  const [price, setPrice] = useState(base?.price != null ? String(base.price) : "");
  const [paid, setPaid] = useState(editSub ? editSub.paid : true);
  const [source, setSource] = useState<string | null>(null);
  const [note, setNote] = useState(editSub?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const nameValue = name ?? known?.name ?? "";
  const sourceValue = source ?? known?.source ?? "Instagram";
  const start = startMode === "today" ? now : startMode === "yesterday" ? addDays(now, -1) : customDate || now;
  const end = endFor(start, months);
  const left = diffDays(now, end);

  const accountsFor = data.accounts.filter((a) => a.product === product && !a.archived);
  const knownCurrent = known ? currentSubs(data.subs).find((s) => s.client_id === known.id && s.product === product) : undefined;
  // Who else is in a profile right now (the client being edited or renewed does not count).
  const cur = useMemo(() => currentSubs(data.subs), [data.subs]);
  const othersIn = (accountId: string | null, profile: number | null): string[] => {
    if (!accountId || profile == null) return [];
    const acc = data.accounts.find((a) => a.id === accountId);
    if (!acc) return [];
    const byId = new Map(data.clients.map((c) => [c.id, c]));
    return (profileUse(acc, cur, now).get(profile) ?? [])
      .filter((s) => s.client_id !== base?.client_id && s.client_id !== known?.id)
      .map((s) => clientName(byId.get(s.client_id)));
  };
  const slots: Slot[] = useMemo(() => {
    if (accountsFor.length === 0) return [];
    const out: Slot[] = [];
    const accs = new Map(data.accounts.map((a) => [a.id, a]));
    const same = base?.account_id ? base : knownCurrent?.account_id ? knownCurrent : undefined;
    if (same?.account_id && accs.get(same.account_id)) {
      out.push({
        account_id: same.account_id,
        profile: same.profile,
        label: editSub ? "البلاصة تاعو دروك" : "نفس البروفايل تاعو",
        sub: `${accs.get(same.account_id)!.label}${same.profile ? ` · بروفايل ${same.profile}` : ""}`,
        tag: "مقترح",
      });
    }
    const q = query.get("account");
    if (q && accs.get(q) && !out.some((o) => o.account_id === q && String(o.profile ?? "") === (query.get("profile") ?? ""))) {
      const qp = Number(query.get("profile")) || null;
      const others = othersIn(q, qp);
      out.push({
        account_id: q,
        profile: qp,
        label: "البروفايل اللي اخترت",
        sub: `${accs.get(q)!.label} · بروفايل ${query.get("profile")}${others.length ? ` · مع ${others.join("، ")}` : ""}`,
        tag: others.length ? "مشترك" : "فارغ",
      });
    }
    for (const f of freeSlots(product, data, now)) {
      if (out.some((o) => o.account_id === f.account.id && o.profile === f.profile)) continue;
      out.push({
        account_id: f.account.id,
        profile: f.profile,
        label: out.length === 0 ? "أول بروفايل فارغ" : "بروفايل فارغ",
        sub: `${f.account.label} · بروفايل ${f.profile}`,
        tag: out.length === 0 ? "مقترح" : "فارغ",
      });
    }
    // Profiles that already have someone: another client can share them.
    for (const a of accountsFor.slice().sort((x, y) => x.label.localeCompare(y.label, "ar", { numeric: true }))) {
      for (let p = 1; p <= a.profiles; p++) {
        if (out.some((o) => o.account_id === a.id && o.profile === p)) continue;
        const others = othersIn(a.id, p);
        if (others.length === 0) continue;
        out.push({ account_id: a.id, profile: p, label: "بروفايل مشترك", sub: `${a.label} · بروفايل ${p} · مع ${others.join("، ")}`, tag: "مشترك" });
      }
    }
    out.push({ account_id: null, profile: null, label: "بلا حساب", sub: "تختارو مبعد", tag: "" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, data, known?.id]);

  const slot = slots.find((s) => `${s.account_id ?? ""}|${s.profile ?? ""}` === slotKey) ?? slots[0];
  const account = slot?.account_id ? data.accounts.find((a) => a.id === slot.account_id) : undefined;
  const sharedWith = slot ? othersIn(slot.account_id, slot.profile) : [];
  // Devices on the account once this sale is saved (the sub being edited or renewed is replaced, not added).
  const devicesAfter = account
    ? devicesUsed(account.id, cur, now) - (base && base.account_id === account.id && cur.includes(base) && isActive(base, now) ? base.devices : 0) + devices
    : 0;
  const monthOptions = [...new Set([1, 3, 6, 12, months])].sort((a, b) => a - b);

  const welcome = fillTemplate(data.settings.templates.welcome, {
    name: nameValue,
    product,
    end,
    email: account?.email,
    profile: slot?.profile,
  });
  const welcomeTarget = contact(known ?? ({ phone: normPhone(phone) } as Client), welcome);

  async function save(): Promise<string | null> {
    setErr("");
    const p = normPhone(phone);
    if (!known && !p && !nameValue.trim()) {
      setErr("اكتب الرقم ولا الاسم على الأقل.");
      return null;
    }
    setBusy(true);
    try {
      let clientId = known?.id;
      if (!clientId) {
        clientId = uid();
        await add("clients", [
          { id: clientId, phone: p, name: nameValue.trim(), source: sourceValue, note: "", created_at: new Date().toISOString() },
        ]);
      } else if ((name != null && name.trim() !== known!.name) || (source != null && source !== known!.source)) {
        await update("clients", clientId, { name: nameValue.trim(), source: sourceValue });
      }
      const row: Omit<Sub, "id" | "created_at" | "last_move"> = {
        client_id: clientId,
        product,
        months,
        start_date: start,
        end_date: end,
        account_id: slot?.account_id ?? null,
        profile: slot?.profile ?? null,
        devices,
        price: price.trim() ? Math.max(0, Math.round(Number(price.replace(/\s/g, "")) || 0)) : null,
        paid,
        pay_method: pay,
        note,
      };
      if (editSub) await update("subscriptions", editSub.id, row);
      else await add("subscriptions", [{ ...row, id: uid(), last_move: null, created_at: new Date().toISOString() }]);
      toast(editSub ? "تسجّل التبديل" : "تسجّل البيع");
      return clientId;
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }

  const title = editSub ? "بدّل الاشتراك" : renewSub ? "تجديد" : "بيع جديد";

  return (
    <div className="app">
      <header className="hdr" style={{ gap: 8 }}>
        <div className="row between">
          <h1>{title}</h1>
          <a className="btn icon" aria-label="سكّر" href={fixedClient ? `#/client/${fixedClient.id}` : "#/"}>
            <Icon name="x" stroke={2.6} />
          </a>
        </div>
        <p className="b" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          اكتب الرقم، اختار الاشتراك والمدة. تاريخ النهاية يتحسب وحدو: 30 يوم لكل شهر.
        </p>
      </header>

      <form className="sec" style={{ gap: 18 }} onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="phone">رقم الهاتف ولا حساب إنستغرام</label>
          <input
            id="phone"
            className="input"
            type="text"
            inputMode="tel"
            dir="ltr"
            style={{ textAlign: "right", fontSize: 17, fontWeight: 800, boxShadow: "4px 4px 0 var(--ink)" }}
            placeholder="0661 00 12 34 ولا @instagram"
            value={phone}
            disabled={!!fixedClient}
            onChange={(e) => setPhone(e.target.value)}
          />
          {known && !fixedClient && (
            <div className="row" style={{ marginTop: 6, padding: "10px 12px", background: "var(--mint)", border: "2px solid var(--ink)" }}>
              <Icon name="check" stroke={2.6} />
              <span className="grow b" style={{ fontSize: 13, lineHeight: 1.6 }}>
                زبون قديم: {clientName(known)}.
                {knownCurrent ? ` عندو ${knownCurrent.product} ${diffDays(now, knownCurrent.end_date) >= 0 ? "يكمّل" : "كمّل"} ${fmtShort(knownCurrent.end_date)}.` : ""} عمّرنا معلوماتو.
              </span>
              <a className="btn" href={`#/client/${known.id}`} style={{ minHeight: 44, fontSize: 12 }}>
                البطاقة
              </a>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="name">
            الاسم <span className="muted b">(اختياري)</span>
          </label>
          <input id="name" className="input" value={nameValue} onChange={(e) => setName(e.target.value)} placeholder="مثلاً ياسين" />
        </div>

        <fieldset>
          <legend className="legend">الاشتراك</legend>
          <div className="grid3">
            {PRODUCTS.map((p) => (
              <button
                key={p}
                type="button"
                className="btn"
                dir="ltr"
                aria-pressed={p === product}
                style={{ minHeight: 48, padding: "4px 6px", fontSize: 13, fontWeight: 800, lineHeight: 1.2, ...(p === product ? { background: "var(--ink)", color: "var(--yellow)" } : {}) }}
                onClick={() => {
                  setProduct(p);
                  setSlotKey(null);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="legend">المدة</legend>
          <Seg options={monthOptions.map((m) => ({ value: m, label: monthsLabel(m) }))} value={months} onChange={setMonths} />
        </fieldset>

        <fieldset>
          <legend className="legend">بدا نهار</legend>
          <Seg
            options={[
              { value: "today", label: `اليوم ${fmtShort(now)}` },
              { value: "yesterday", label: `البارح ${fmtShort(addDays(now, -1))}` },
              { value: "custom", label: startMode === "custom" ? fmtShort(customDate || now) : "نهار آخر" },
            ]}
            value={startMode}
            onChange={setStartMode}
          />
          {startMode === "custom" && (
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="day" className="small muted">
                اختار النهار من الكالندرية
              </label>
              <input id="day" className="input" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
          )}
        </fieldset>

        {slots.length > 0 && (
          <fieldset>
            <legend className="legend">الحساب والبروفايل</legend>
            <div className="col" style={{ gap: 8 }}>
              {slots.slice(0, 4).map((s) => {
                const k = `${s.account_id ?? ""}|${s.profile ?? ""}`;
                const on = slot && `${slot.account_id ?? ""}|${slot.profile ?? ""}` === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={!!on}
                    onClick={() => setSlotKey(k)}
                    className="btn"
                    style={{ minHeight: 56, justifyContent: "space-between", textAlign: "right", ...(on ? { background: "var(--ink)", color: "var(--yellow)" } : {}) }}
                  >
                    <span className="col">
                      <span className="bb">{s.label}</span>
                      <span className="small">{s.sub}</span>
                    </span>
                    {s.tag && (
                      <span className="chip" style={{ background: "var(--mint)", color: "var(--ink)", fontSize: 11 }}>
                        {s.tag}
                      </span>
                    )}
                  </button>
                );
              })}
              {slots.length > 4 && (
                <select
                  aria-label="بروفايل آخر"
                  className="input"
                  value={slot ? `${slot.account_id ?? ""}|${slot.profile ?? ""}` : ""}
                  onChange={(e) => setSlotKey(e.target.value)}
                >
                  {slots.map((s) => (
                    <option key={`${s.account_id}|${s.profile}`} value={`${s.account_id ?? ""}|${s.profile ?? ""}`}>
                      {s.label} · {s.sub}
                    </option>
                  ))}
                </select>
              )}
              {sharedWith.length > 0 && (
                <span className="small b" style={{ padding: "8px 10px", background: "var(--lilac)", border: "2px solid var(--ink)", lineHeight: 1.6 }}>
                  يتقاسم بروفايل {slot?.profile} مع {sharedWith.join("، ")}. كل واحد يبقى بالرقم تاعو، والتواريخ تاعو، والتذكير تاعو.
                </span>
              )}
              {account && devicesAfter > account.device_limit && (
                <span className="small b" style={{ padding: "8px 10px", background: "var(--coral)", border: "2px solid var(--ink)", lineHeight: 1.6 }}>
                  {account.label} يولّي فيه {devicesAfter} أجهزة، والحد {account.device_limit}.
                </span>
              )}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="legend">عدد الأجهزة في البروفايل</legend>
          <Seg
            options={[
              { value: 1, label: "جهاز واحد" },
              { value: 2, label: "جوج أجهزة ×2" },
            ]}
            value={devices}
            onChange={setDevices}
          />
          <span className="small muted" style={{ display: "block", marginTop: 8 }}>
            {devices === 2 ? "يتحسبو جوج أجهزة في عدّاد الحساب." : "بروفايل واحد = جهاز واحد."}
          </span>
        </fieldset>

        <fieldset>
          <legend className="legend">الدفع</legend>
          <Seg options={PAY_METHODS.map((m) => ({ value: m, label: m }))} value={pay} onChange={setPay} ltr />
        </fieldset>

        <div className="grid2" style={{ gap: 10, alignItems: "end" }}>
          <div className="field">
            <label htmlFor="price">السعر (دج)</label>
            <input id="price" className="input" inputMode="numeric" placeholder="مثلاً 1000" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <Seg
            options={[
              { value: true, label: "خلّص" },
              { value: false, label: "ما خلّصش" },
            ]}
            value={paid}
            onChange={setPaid}
          />
        </div>

        {!fixedClient && (
          <fieldset>
            <legend className="legend">منين جا الزبون</legend>
            <div className="row wrap" style={{ gap: 8 }}>
              {SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn"
                  aria-pressed={s === sourceValue}
                  onClick={() => setSource(s)}
                  style={{ minHeight: 44, fontSize: 13, fontWeight: 800, ...(s === sourceValue ? { background: "var(--ink)", color: "var(--yellow)" } : {}) }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="field">
          <label htmlFor="note">
            ملاحظة <span className="muted b">(اختياري)</span>
          </label>
          <textarea id="note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </form>

      <section aria-live="polite" aria-label="تاريخ النهاية" className="col" style={{ margin: "24px 16px 0", padding: 16, gap: 6, background: "var(--mint)", border: "2px solid var(--ink)", boxShadow: "5px 5px 0 var(--ink)" }}>
        <span className="b" style={{ fontSize: 13 }}>
          يكمّل في (تحسب وحدو)
        </span>
        <span style={{ fontSize: 26, lineHeight: 1.25, fontWeight: 900 }}>{fmtLong(end)}</span>
        <span className="b" style={{ fontSize: 13 }}>
          {30 * months} يوم · من {fmtLong(start)}
        </span>
        <span className="chip" style={{ alignSelf: "flex-start", background: "var(--white)", whiteSpace: "normal" }}>
          {left > 0 ? `باقي ${left} يوم` : left === 0 ? "يكمّل اليوم" : `كمّل من ${-left} يوم`} · التذكير يطلع نهار النهاية
        </span>
        {months > 1 && slot?.account_id && (
          <span className="chip" style={{ alignSelf: "flex-start", background: "var(--lilac)", whiteSpace: "normal" }}>
            يتبدّل الحساب كل 30 يوم · أول تبديل {fmtShort(addDays(start, 30))}
          </span>
        )}
        {!paid && (
          <span className="chip" style={{ alignSelf: "flex-start", background: "var(--coral)", whiteSpace: "normal" }}>
            ما خلّصش: يطلع في «الدراهم» باش تذكّرو
          </span>
        )}
      </section>

      <div className="col" style={{ padding: "20px 16px 28px", gap: 10 }}>
        {err && <p className="err">{err}</p>}
        <button
          type="button"
          className="btn btn-y btn-big"
          disabled={busy}
          onClick={() =>
            void save().then((id) => {
              if (id) location.hash = `#/client/${id}`;
            })
          }
        >
          <Icon name="check" stroke={2.8} />
          {editSub ? "سجّل التبديل" : "سجّل البيع"}
        </button>
        {!editSub && welcomeTarget && (
          <a
            className="btn btn-m"
            style={{ minHeight: 52 }}
            href={welcomeTarget.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (welcomeTarget.copyFirst) void copyText(welcome);
              void save().then((id) => {
                if (id) location.hash = `#/client/${id}`;
              });
            }}
          >
            <Icon name="chat" size={18} />
            سجّل وابعث رسالة الترحيب (الإيميل والبروفايل)
          </a>
        )}
        <a className="btn-plain" style={{ justifyContent: "center" }} href={fixedClient ? `#/client/${fixedClient.id}` : "#/"}>
          إلغاء
        </a>
      </div>
    </div>
  );
}
