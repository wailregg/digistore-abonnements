import type { Data } from "./types";
import { displayPhone } from "./phone";
import { today } from "./dates";

const KEY = "ds-abonnements-last-backup";

export function lastBackup(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Excel-friendly file (UTF-8 with BOM, ";" separator for French Excel). */
export function downloadBackup(data: Data): void {
  const clients = new Map(data.clients.map((c) => [c.id, c]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  const head = ["الاسم", "الرقم", "الاشتراك", "المدة (شهر)", "البداية", "النهاية", "الحساب", "إيميل الحساب", "البروفايل", "الأجهزة", "السعر", "خلّص", "الدفع", "جا من", "ملاحظة"];
  const rows = [...data.subs]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((s) => {
      const c = clients.get(s.client_id);
      const a = s.account_id ? accounts.get(s.account_id) : undefined;
      return [
        c?.name ?? "",
        displayPhone(c?.phone ?? ""),
        s.product,
        s.months,
        s.start_date,
        s.end_date,
        a?.label ?? "",
        a?.email ?? "",
        s.profile ?? "",
        s.devices,
        s.price ?? "",
        s.paid ? "نعم" : "لا",
        s.pay_method,
        c?.source ?? "",
        [c?.note, s.note].filter(Boolean).join(" / "),
      ];
    });
  const esc = (v: unknown) => {
    const t = String(v ?? "");
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `abonnements-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  try {
    localStorage.setItem(KEY, today());
  } catch {
    /* ignore */
  }
}
