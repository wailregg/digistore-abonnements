import { useState } from "react";
import { useStore } from "../lib/store";
import { DEMO, sb } from "../lib/backend";
import { TEMPLATE_INFO } from "../lib/logic";
import type { TemplateKey } from "../lib/types";
import { downloadBackup, lastBackup } from "../lib/backup";
import { clearPin, lockMinutes, setLockMinutes } from "../lib/pin";
import { fmtFull } from "../lib/dates";
import { Icon, Logo, Nav, Seg } from "../ui";

export function SettingsScreen() {
  const { data, setSetting, toast } = useStore();
  const [open, setOpen] = useState<TemplateKey | null>("welcome");
  const [draft, setDraft] = useState(data.settings.templates);
  const [lock, setLock] = useState(lockMinutes());
  const [limit, setLimit] = useState(data.settings.default_device_limit);
  const [backupAt, setBackupAt] = useState(lastBackup());

  async function saveTemplate(k: TemplateKey) {
    await setSetting("templates", { ...data.settings.templates, [k]: draft[k] });
    toast("تسجّلت الرسالة");
  }

  return (
    <div className="app">
      <header className="hdr">
        <h1>الإعدادات</h1>
      </header>

      <section className="sec" aria-label="الرسائل الجاهزة">
        <h2>الرسائل الجاهزة</h2>
        <span className="small muted">الكلمات بين {"{ }"} تتعمّر وحدها بمعلومات الزبون:</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {["{الاسم}", "{الاشتراك}", "{النهاية}", "{الإيميل}", "{البروفايل}"].map((t) => (
            <span key={t} className="chip" style={{ background: "var(--lilac)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="box divide">
          {TEMPLATE_INFO.map(({ key, title, hint }) => {
            const isOpen = open === key;
            return (
              <div key={key} style={{ background: isOpen ? "#fdf6d8" : "var(--white)" }}>
                <button
                  type="button"
                  className="row between full"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : key)}
                  style={{ minHeight: 52, padding: "0 12px", background: "transparent", border: 0, cursor: "pointer", textAlign: "right" }}
                >
                  <span className="b" style={{ fontSize: 15 }}>
                    {title}
                  </span>
                  <span className="small muted">{hint}</span>
                </button>
                {isOpen && (
                  <div className="col" style={{ padding: "0 12px 12px", gap: 8 }}>
                    <label className="small" htmlFor={"t-" + key}>
                      نص الرسالة
                    </label>
                    <textarea
                      id={"t-" + key}
                      className="input msg"
                      rows={4}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                    <button className="btn btn-y" style={{ alignSelf: "flex-start" }} onClick={() => void saveTemplate(key)}>
                      <Icon name="check" size={18} />
                      سجّل الرسالة
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec" aria-label="التذكير والحسابات">
        <h2>التذكير والحسابات</h2>
        <div className="box divide">
          <Line title="وقتاش يطلع التذكير" sub="نهار النهاية برك، في الصفحة الرئيسية" right={<span className="chip" style={{ background: "var(--yellow)" }}>نهار النهاية</span>} />
          <Line title="المدة" sub="شهر = 30 يوم بالضبط" right={<span className="chip">30 يوم</span>} />
          <div className="col" style={{ padding: "10px 12px", gap: 8 }}>
            <span className="b" style={{ fontSize: 15 }}>
              حد الأجهزة للحسابات الجداد
            </span>
            <div className="row">
              <input
                aria-label="حد الأجهزة"
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={{ width: 90 }}
              />
              <button className="btn" onClick={() => void setSetting("default_device_limit", Math.max(1, Math.min(50, limit))).then(() => toast("تسجّل"))}>
                سجّل
              </button>
            </div>
            <span className="small muted">كل حساب تقدر تبدّلو وحدو من الصفحة تاعو.</span>
          </div>
        </div>
      </section>

      <section className="sec" aria-label="الحماية">
        <h2>الحماية</h2>
        <div className="box divide">
          <div className="col" style={{ padding: "10px 12px", gap: 8 }}>
            <span className="b" style={{ fontSize: 15 }}>
              يتقفل وحدو بعد
            </span>
            <Seg
              options={[1, 5, 15, 60].map((m) => ({ value: m, label: m === 60 ? "ساعة" : `${m} دقايق` }))}
              value={lock}
              onChange={(m) => {
                setLock(m);
                setLockMinutes(m);
                toast("تسجّل");
              }}
            />
          </div>
          <Line
            title="بدّل الكود السري"
            sub="تختار كود جديد في هذا التيليفون"
            right={
              <button
                className="btn"
                onClick={() => {
                  if (!confirm("نبدّلو الكود؟ تختار واحد جديد دروك.")) return;
                  clearPin();
                  location.reload();
                }}
              >
                بدّل
              </button>
            }
          />
          <Line title="الباسووردات تاع الحسابات" sub="مخبيين، يبانو غير كي تضغط عليهم" right={<Icon name="lock" size={22} />} />
        </div>
        <div className="dark col" style={{ padding: 14, gap: 10, border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--mint)" }}>
          <span className="bb" style={{ fontSize: 15 }}>
            نسخة احتياطية (Excel)
          </span>
          <span className="small muted">
            {backupAt ? `آخر وحدة: ${fmtFull(backupAt)}` : "ما نزّلت حتى نسخة مازال"} · فيها كل الزبائن والاشتراكات. حطها في Google Drive ولا الـ PC.
          </span>
          <button
            className="btn btn-y"
            onClick={() => {
              downloadBackup(data);
              setBackupAt(lastBackup());
            }}
          >
            <Icon name="download" size={18} />
            نزّل نسخة دروك
          </button>
        </div>
        <a className="box row between" href="#/import" style={{ minHeight: 60, padding: "8px 12px" }}>
          <span className="col">
            <span className="b" style={{ fontSize: 15 }}>
              جيب الملفات القدام
            </span>
            <span className="small muted">مرة وحدة برك، من الدوسي «les abonmont» في الـ PC</span>
          </span>
          <Icon name="chevron" />
        </a>
      </section>

      <section className="sec" aria-label="ركّبو في التيليفون" style={{ paddingBottom: 24 }}>
        <h2>ركّبو في التيليفون</h2>
        <div className="box pad row" style={{ alignItems: "flex-start", gap: 14 }}>
          <div className="col" style={{ alignItems: "center", gap: 6 }}>
            <Logo size={60} />
            <span className="small">اشتراكاتي</span>
          </div>
          <ol className="b" style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 }}>
            <li>
              افتح هذا الرابط في <span dir="ltr">Chrome</span>.
            </li>
            <li>
              اضغط ⋮ ومبعد <span dir="ltr">«Ajouter à l'écran d'accueil»</span> ولا «Installer l'application».
            </li>
            <li>يطلعلك كيما تطبيق، بلوغو البرق.</li>
          </ol>
        </div>
        {!DEMO && (
          <button
            className="btn"
            onClick={() => {
              if (confirm("تخرج من الحساب في هذا التيليفون؟")) {
                clearPin();
                void sb?.auth.signOut();
              }
            }}
          >
            اخرج من الحساب
          </button>
        )}
      </section>

      <Nav active="settings" />
    </div>
  );
}

function Line({ title, sub, right }: { title: string; sub: string; right: React.ReactNode }) {
  return (
    <div className="row between" style={{ minHeight: 60, padding: "8px 12px" }}>
      <span className="col">
        <span className="b" style={{ fontSize: 15 }}>
          {title}
        </span>
        <span className="small muted">{sub}</span>
      </span>
      {right}
    </div>
  );
}
