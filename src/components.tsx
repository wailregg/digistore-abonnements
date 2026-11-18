import { useState, type ReactNode } from "react";
import type { Account, Client, Sub } from "./lib/types";
import { contact } from "./lib/contact";
import { daysLabel, fmtShort, today } from "./lib/dates";
import { clientName, daysLeft, nextMove, toneOf } from "./lib/logic";
import { displayPhone } from "./lib/phone";
import { useStore } from "./lib/store";
import { copyText, Icon, Phone, Sheet, ToneChip } from "./ui";

/** Editable prefilled message plus the button that sends it. */
export function MessageBox({
  client,
  initial,
  onSent,
  extra,
}: {
  client: Client | undefined;
  initial: string;
  onSent?: () => void;
  extra?: ReactNode;
}) {
  const [text, setText] = useState(initial);
  const target = contact(client, text);
  const id = "m-" + (client?.id ?? "x");
  return (
    <div className="col" style={{ gap: 10 }}>
      <label className="small muted" htmlFor={id}>
        الرسالة جاهزة، تقدر تبدّلها قبل ما تبعث
      </label>
      <textarea id={id} className="input msg" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid2">
        {target ? (
          <a
            className="btn btn-y"
            href={target.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (target.copyFirst) void copyText(text);
              onSent?.();
            }}
          >
            <Icon name="chat" size={18} />
            {target.label}
          </a>
        ) : (
          <button className="btn btn-y" type="button" onClick={() => void copyText(text).then(() => onSent?.())}>
            <Icon name="copy" size={18} />
            انسخ الرسالة
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}

/** One client line inside an account or product list. */
export function SubRow({
  sub,
  client,
  slot,
  shared,
}: {
  sub: Sub;
  client: Client | undefined;
  slot?: number | string;
  shared?: boolean;
}) {
  const now = today();
  const d = daysLeft(sub, now);
  const tone = toneOf(d);
  const move = d >= 0 ? nextMove(sub, now) : null;
  const tags: { label: string; bg: string }[] = [];
  if (shared) tags.push({ label: "يتقاسمو البروفايل", bg: "var(--lilac)" });
  if (sub.devices > 1) tags.push({ label: `×${sub.devices} أجهزة`, bg: "var(--sky)" });
  if (sub.months > 1) tags.push({ label: `${sub.months} أشهر`, bg: "var(--white)" });
  if (move) tags.push({ label: `تبديل الحساب: ${move === now ? "اليوم" : fmtShort(move)}`, bg: move <= now ? "var(--coral)" : "var(--white)" });
  if (!sub.paid) tags.push({ label: "ما خلّصش", bg: "var(--coral)" });
  return (
    <a href={`#/client/${sub.client_id}`} className="row" style={{ minHeight: 58, padding: "8px 12px", opacity: d < 0 ? 0.75 : 1 }}>
      {slot != null && (
        <span className="slot" style={{ background: tone === "gone" ? "var(--ink)" : tone === "ok" ? "var(--mint)" : tone === "today" ? "var(--coral)" : "var(--yellow)", color: tone === "gone" ? "#fff" : "var(--ink)" }}>
          {slot}
        </span>
      )}
      <div className="col grow">
        <span className="b" style={{ fontSize: 15 }}>
          {clientName(client)}
        </span>
        <Phone value={displayPhone(client?.phone ?? "")} className="small muted" />
        {tags.length > 0 && (
          <span className="row wrap" style={{ gap: 4, marginTop: 3 }}>
            {tags.map((t) => (
              <span key={t.label} className="chip" style={{ background: t.bg, fontSize: 11, padding: "0 6px", borderWidth: 1.5 }}>
                {t.label}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 4, flex: "none" }}>
        <ToneChip tone={tone}>{daysLabel(d)}</ToneChip>
        <span className="small">{d < 0 ? "كمّل " : "ينتهي "}{fmtShort(sub.end_date)}</span>
      </div>
    </a>
  );
}

/** Add or edit a shared account (Netflix etc.). */
export function AccountForm({ product, account, onClose }: { product: string; account?: Account; onClose: () => void }) {
  const { data, add, update, toast } = useStore();
  const count = data.accounts.filter((a) => a.product === product).length;
  const [label, setLabel] = useState(account?.label ?? `حساب ${count + 1}`);
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState(account?.password ?? "");
  const [profiles, setProfiles] = useState(account?.profiles ?? 5);
  const [limit, setLimit] = useState(account?.device_limit ?? data.settings.default_device_limit);
  const [supplierEnd, setSupplierEnd] = useState(account?.supplier_end ?? "");
  const [note, setNote] = useState(account?.note ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const row = {
        product,
        label: label.trim() || `حساب ${count + 1}`,
        email: email.trim(),
        password,
        profiles: Math.min(20, Math.max(1, profiles)),
        device_limit: Math.min(50, Math.max(1, limit)),
        supplier_end: supplierEnd || null,
        note,
      };
      if (account) await update("accounts", account.id, row);
      else
        await add("accounts", [
          { ...row, id: crypto.randomUUID(), archived: false, created_at: new Date().toISOString() },
        ]);
      toast("تسجّل الحساب");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={account ? "بدّل الحساب" : `حساب جديد · ${product}`} onClose={onClose}>
      <div className="field">
        <label htmlFor="af-label">الاسم</label>
        <input id="af-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="af-email">إيميل الحساب</label>
        <input id="af-email" className="input" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="af-pass">كلمة السر تاع الحساب</label>
        <input id="af-pass" className="input" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="af-prof">شحال من بروفايل</label>
          <input id="af-prof" className="input" type="number" inputMode="numeric" min={1} max={20} value={profiles} onChange={(e) => setProfiles(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="af-lim">حد الأجهزة</label>
          <input id="af-lim" className="input" type="number" inputMode="numeric" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="af-sup">وقتاش يكمّل عند المورّد</label>
        <input id="af-sup" className="input" type="date" value={supplierEnd} onChange={(e) => setSupplierEnd(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="af-note">ملاحظة</label>
        <textarea id="af-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn btn-y btn-big" disabled={busy} onClick={() => void save()}>
        <Icon name="check" />
        سجّل
      </button>
    </Sheet>
  );
}
