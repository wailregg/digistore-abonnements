// Invented data for the demo mode (?demo). No real client is in here.
import type { Account, Client, Data, Sub } from "./types";
import { addDays, endFor, today } from "./dates";
import { DEFAULT_SETTINGS } from "./logic";

export function demoData(): Data {
  const now = today();
  const ts = new Date().toISOString();
  let n = 0;
  const id = () => `demo-${++n}`;

  const acc = (product: string, label: string, email: string, supplierIn: number | null, limit = 5): Account => ({
    id: id(),
    product,
    label,
    email,
    password: "demo-pass",
    profiles: 5,
    device_limit: limit,
    // supplierIn = days left; a Netflix account lasts 30 days from its activation day.
    activated_on: supplierIn == null ? null : addDays(now, supplierIn - 30),
    days: 30,
    supplier_end: supplierIn == null ? null : addDays(now, supplierIn),
    note: "",
    archived: false,
    created_at: ts,
  });
  const a1 = acc("Netflix", "حساب 1", "compte1@example.com", 21);
  const a2 = acc("Netflix", "حساب 2", "compte2@example.com", 7);
  const a3 = acc("Netflix", "حساب 3", "compte3@example.com", 28);
  const accounts = [a1, a2, a3];

  const clients: Client[] = [];
  const subs: Sub[] = [];
  const person = (name: string, phone: string, source = "Instagram"): Client => {
    const c: Client = { id: id(), name, phone, source, note: "", created_at: ts };
    clients.push(c);
    return c;
  };
  const sub = (
    c: Client,
    product: string,
    startOffset: number,
    o: Partial<Pick<Sub, "months" | "account_id" | "profile" | "devices" | "price" | "paid" | "pay_method" | "last_move">> = {},
  ) => {
    const months = o.months ?? 1;
    const start = addDays(now, startOffset);
    subs.push({
      id: id(),
      client_id: c.id,
      product,
      months,
      start_date: start,
      end_date: endFor(start, months),
      account_id: o.account_id ?? null,
      profile: o.profile ?? null,
      devices: o.devices ?? 1,
      price: o.price ?? 1000,
      paid: o.paid ?? true,
      pay_method: o.pay_method ?? "BaridiMob",
      last_move: o.last_move ?? null,
      note: "",
      created_at: ts,
    });
  };

  const yassine = person("ياسين", "0661001234");
  sub(yassine, "Netflix", -120, { account_id: a2.id, profile: 3 });
  sub(yassine, "Netflix", -90, { account_id: a2.id, profile: 3 });
  sub(yassine, "Netflix", -60, { account_id: a2.id, profile: 3 });
  sub(yassine, "Netflix", -30, { account_id: a2.id, profile: 3 });
  sub(yassine, "Shahid VIP", -59, { price: 800 });
  sub(person("مريم", "0550008721", "TikTok"), "Netflix", -21, { account_id: a1.id, profile: 1 });
  sub(person("نور", "@nour.dz"), "Netflix", -17, { account_id: a1.id, profile: 2 });
  sub(person("سارة", "0662004813"), "Netflix", -14, { account_id: a1.id, profile: 2 });
  sub(person("هاجر", "0770002109", "الموقع"), "Netflix", -27, { account_id: a1.id, profile: 3 });
  sub(person("نسرين", "0796001840"), "Netflix", -36, { account_id: a1.id, profile: 4 });
  sub(person("أنيس", "0558007126"), "Netflix", -13, { account_id: a2.id, profile: 1, paid: false, price: 1200 });
  sub(person("سلمى", "0663003902", "صاحبو"), "Netflix", -10, { account_id: a2.id, profile: 2 });
  sub(person("وليد", "0791005567"), "Netflix", -18, { account_id: a2.id, profile: 4, devices: 2, price: 1800 });
  sub(person("إسلام", "@dz.gamer", "TikTok"), "Netflix", -16, { account_id: a2.id, profile: 5 });
  sub(person("فاطمة", "0560001477"), "Netflix", -60, { months: 6, account_id: a3.id, profile: 4, price: 5500, last_move: addDays(now, -30) });
  sub(person("عادل", "0674008015"), "Netflix", -17, { months: 6, price: 5500 });
  sub(person("رياض", "0552006418"), "HBO Max", -30, { price: 900 });
  sub(person("لينا", "@lina.dz"), "Telegram Premium", -30, { price: 700 });
  sub(person("كمال", "0699002751", "الموقع"), "Disney+", -28);
  sub(person("", "0540004512"), "Shahid VIP", -26, { price: 800 });
  sub(person("خالد", "0667002388"), "Shahid VIP", -15, { price: 800, paid: false });
  sub(person("أكرم", "@akira.dz", "TikTok"), "Crunchyroll", -24, { price: 700 });
  sub(person("سمير", "0657009033"), "Paramount+", -33, { price: 900 });

  return {
    clients,
    accounts,
    subs,
    expenses: [
      { id: id(), date: addDays(now, -10), amount: 4500, account_id: a1.id, note: "تجديد عند المورّد", created_at: ts },
      { id: id(), date: addDays(now, -5), amount: 4500, account_id: a2.id, note: "تجديد عند المورّد", created_at: ts },
    ],
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
