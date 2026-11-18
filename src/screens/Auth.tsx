import { useState, type FormEvent } from "react";
import { sb } from "../lib/backend";
import { checkPin, clearPin, setPin } from "../lib/pin";
import { Logo } from "../ui";

function Brand() {
  return (
    <div className="col" style={{ alignItems: "center", gap: 12 }}>
      <Logo size={84} fill="#ffffff" />
      <span dir="ltr" className="wordmark" style={{ fontSize: 30 }}>
        DigiStore
      </span>
      <span className="mark bb">متتبّع الاشتراكات</span>
    </div>
  );
}

export function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "up") {
        const { error } = await sb.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
      }
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(
        /invalid login/i.test(m)
          ? "الإيميل ولا كلمة السر غالطين."
          : /database error|signups are closed/i.test(m)
            ? "الحساب تحلّ من قبل. ادخل بالإيميل وكلمة السر تاعك."
            : /password/i.test(m)
              ? "كلمة السر لازم 6 حروف ولا كثر."
              : m,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app grid-bg">
      <form className="center" onSubmit={submit} style={{ gap: 18 }}>
        <Brand />
        <h1 style={{ fontSize: 22 }}>{mode === "in" ? "ادخل لحسابك" : "أول مرة: حلّ حسابك"}</h1>
        <div className="field" style={{ width: "100%", maxWidth: 340, textAlign: "right" }}>
          <label htmlFor="email">الإيميل</label>
          <input
            id="email"
            className="input"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field" style={{ width: "100%", maxWidth: 340, textAlign: "right" }}>
          <label htmlFor="password">كلمة السر</label>
          <input
            id="password"
            className="input"
            type="password"
            dir="ltr"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-k btn-big full" style={{ maxWidth: 340 }} disabled={busy}>
          {busy ? "…" : mode === "in" ? "ادخل" : "حلّ الحساب وادخل"}
        </button>
        <button type="button" className="btn-plain" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "أول مرة؟ حلّ حسابك هنا" : "عندك حساب؟ ادخل"}
        </button>
        {mode === "up" && (
          <p className="small" style={{ maxWidth: 340, lineHeight: 1.7 }}>
            أول حساب يتحلّ هو اللي يولّي صاحب البرنامج. مبعد ما يقدر حتى واحد آخر يحلّ حساب.
          </p>
        )}
      </form>
    </div>
  );
}

function Keypad({ onDigit, onDel, extra }: { onDigit: (d: string) => void; onDel: () => void; extra?: { label: string; on: () => void } }) {
  return (
    <div className="keypad" dir="ltr">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      {extra ? (
        <button type="button" className="txt" onClick={extra.on}>
          {extra.label}
        </button>
      ) : (
        <span />
      )}
      <button type="button" onClick={() => onDigit("0")}>
        0
      </button>
      <button type="button" className="txt" onClick={onDel}>
        مسح
      </button>
    </div>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <div className="pin-dots" dir="ltr" role="img" aria-label={`${n} من 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < n ? "on" : ""} />
      ))}
    </div>
  );
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setP] = useState("");
  const [err, setErr] = useState("");

  async function push(d: string) {
    const next = (pin + d).slice(0, 4);
    setP(next);
    setErr("");
    if (next.length === 4) {
      if (await checkPin(next)) onUnlock();
      else {
        setErr("الكود غالط");
        setP("");
      }
    }
  }

  async function forgot() {
    if (!confirm("نسيت الكود؟ نخرجوك، وتدخل من جديد بالإيميل وكلمة السر، ومبعد تختار كود جديد.")) return;
    clearPin();
    await sb?.auth.signOut();
    location.reload();
  }

  return (
    <div className="app grid-bg">
      <div className="center" style={{ justifyContent: "space-between", paddingTop: 48 }}>
        <Brand />
        <div className="col" style={{ alignItems: "center", gap: 14 }}>
          <h1 style={{ fontSize: 20 }}>دخّل الكود السري</h1>
          <Dots n={pin.length} />
          {err ? <span className="err">{err}</span> : <span className="small">يتقفل وحدو كي تخرج من البرنامج</span>}
        </div>
        <Keypad onDigit={(d) => void push(d)} onDel={() => setP(pin.slice(0, -1))} extra={{ label: "نسيت", on: () => void forgot() }} />
      </div>
    </div>
  );
}

export function SetPinScreen({ onDone }: { onDone: () => void }) {
  const [first, setFirst] = useState("");
  const [pin, setP] = useState("");
  const [err, setErr] = useState("");

  async function push(d: string) {
    const next = (pin + d).slice(0, 4);
    setP(next);
    setErr("");
    if (next.length < 4) return;
    if (!first) {
      setFirst(next);
      setP("");
      return;
    }
    if (next === first) {
      await setPin(next);
      onDone();
    } else {
      setErr("ماشي كيف كيف، عاود");
      setFirst("");
      setP("");
    }
  }

  return (
    <div className="app grid-bg">
      <div className="center" style={{ justifyContent: "space-between", paddingTop: 48 }}>
        <Brand />
        <div className="col" style={{ alignItems: "center", gap: 14 }}>
          <h1 style={{ fontSize: 20 }}>{first ? "عاود الكود مرة أخرى" : "اختار كود سري من 4 أرقام"}</h1>
          <Dots n={pin.length} />
          {err ? <span className="err">{err}</span> : <span className="small">الكود يتسجل في هذا التيليفون برك</span>}
        </div>
        <Keypad onDigit={(d) => void push(d)} onDel={() => setP(pin.slice(0, -1))} />
      </div>
    </div>
  );
}
