import type { ReactNode } from "react";
import { TINT, TONE_BG, type Tone } from "./lib/logic";

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
      <path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-5-6.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />,
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" />
      <path d="M5 15H3V3h12v2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  back: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m15 18-6-6 6-6" />,
  next: <path d="m9 18 6-6-6-6" />,
  swap: (
    <>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h14" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H7" />
    </>
  ),
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />,
  folder: <path d="M3 6h7l2 2h9v12H3z" />,
};

export function Icon({ name, size = 20, stroke = 2.2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ size = 42, fill = "#f6d96b" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="11" y="11" width="50" height="50" fill="#111111" />
      <rect x="4" y="4" width="50" height="50" fill={fill} stroke="#111111" strokeWidth="5" />
      <path d="M33.5 11 16 35.5h13L26.5 51 42 26.5H29.5z" fill="#111111" stroke="#111111" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductChip({ product, small }: { product: string; small?: boolean }) {
  return (
    <span className="chip" dir="ltr" style={{ background: TINT[product] ?? "var(--white)", fontSize: small ? 11 : 12 }}>
      {product}
    </span>
  );
}

export function ToneChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="chip" style={{ background: TONE_BG[tone], color: tone === "gone" ? "#fff" : "var(--ink)" }}>
      {children}
    </span>
  );
}

export function Phone({ value, className }: { value: string; className?: string }) {
  if (!value) return null;
  return (
    <span dir="ltr" className={"phone " + (className ?? "")}>
      {value}
    </span>
  );
}

export function Avatar({ letter, bg, size = 44 }: { letter: string; bg: string; size?: number }) {
  return (
    <span aria-hidden="true" className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}>
      {letter}
    </span>
  );
}

export function Seg<T extends string | number | boolean>({
  options,
  value,
  onChange,
  cols,
  ltr,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
  ltr?: boolean;
}) {
  return (
    <div className="seg" style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          dir={ltr ? "ltr" : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Header({ children, back }: { children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="hdr">
      {back && (
        <a href={back.href} className="back">
          <Icon name="back" />
          {back.label}
        </a>
      )}
      {children}
    </header>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{title}</h2>
          <button className="btn icon" aria-label="سكّر" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const NAV = [
  { href: "#/", label: "الرئيسية", icon: "home", key: "home" },
  { href: "#/clients", label: "الزبائن", icon: "users", key: "clients" },
  { href: "#/add", label: "بيع جديد", icon: "plus", key: "add" },
  { href: "#/money", label: "الدراهم", icon: "cash", key: "money" },
  { href: "#/settings", label: "الإعدادات", icon: "sliders", key: "settings" },
];

export function Nav({ active }: { active: string }) {
  return (
    <nav className="nav" aria-label="القائمة">
      {NAV.map((n) => (
        <a
          key={n.key}
          href={n.href}
          aria-current={active === n.key ? "page" : undefined}
          className={(n.key === "add" ? "add " : "") + (active === n.key ? "on" : "")}
        >
          <Icon name={n.icon} size={22} stroke={n.key === "add" ? 2.6 : 2.2} />
          {n.label}
        </a>
      ))}
    </nav>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
