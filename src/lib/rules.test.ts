import { describe, expect, test } from "bun:test";
import { addDays, endFor } from "./dates";
import { normPhone, searchKey, waNumber } from "./phone";
import { currentSubs, moveDue, fillTemplate } from "./logic";
import { guessDate, parseFolder } from "./importer";
import type { Sub } from "./types";

const sub = (o: Partial<Sub>): Sub => ({
  id: "s",
  client_id: "c",
  product: "Netflix",
  months: 1,
  start_date: "2026-11-01",
  end_date: "2026-12-01",
  account_id: null,
  profile: null,
  devices: 1,
  price: null,
  paid: true,
  pay_method: "",
  last_move: null,
  note: "",
  created_at: "2026-11-01T00:00:00Z",
  ...o,
});

describe("30-day months", () => {
  test("one month is 30 days, six months 180", () => {
    expect(endFor("2026-11-18", 1)).toBe("2026-12-18");
    expect(endFor("2026-01-31", 1)).toBe("2026-03-02");
    expect(endFor("2026-11-18", 6)).toBe(addDays("2026-11-18", 180));
  });
});

describe("phones", () => {
  test("WhatsApp +213 and local 0 forms match", () => {
    expect(normPhone("+213 661 00 12 34")).toBe("0661001234");
    expect(normPhone("0661 00 12 34")).toBe("0661001234");
    expect(normPhone("00213661001234")).toBe("0661001234");
    expect(normPhone("@Nour.DZ")).toBe("@nour.dz");
    expect(searchKey("+213 661")).toBe("0661");
    expect(waNumber("0661001234")).toBe("213661001234");
  });
});

describe("subscriptions", () => {
  test("the newest subscription per client and product is the current one", () => {
    const a = sub({ id: "a", end_date: "2026-11-01" });
    const b = sub({ id: "b", end_date: "2026-12-01" });
    expect(currentSubs([a, b]).map((s) => s.id)).toEqual(["b"]);
  });
  test("multi-month clients on an account move every 30 days", () => {
    const s = sub({ months: 6, start_date: "2026-09-19", end_date: endFor("2026-09-19", 6), account_id: "acc" });
    expect(moveDue(s, "2026-11-18")).toEqual({ due: "2026-11-18", month: 3 });
    expect(moveDue({ ...s, last_move: "2026-11-18" }, "2026-11-18")).toBeNull();
    expect(moveDue({ ...s, account_id: null }, "2026-11-18")).toBeNull();
  });
  test("templates fill name, product and date", () => {
    expect(fillTemplate("السلام عليكم {الاسم}، {الاشتراك} يكمّل {النهاية}", { name: "ياسين", product: "Netflix", end: "2026-11-18" })).toBe(
      "السلام عليكم ياسين، Netflix يكمّل 18/11",
    );
    expect(fillTemplate("السلام عليكم {الاسم}، x", {})).toBe("السلام عليكم، x");
  });
});

describe("old files", () => {
  test("mixed month/day order is resolved when only one reading is recent", () => {
    expect(guessDate("1-11-2026", "2026-11-18")).toMatchObject({ suggested: "2026-11-01", sure: true });
    expect(guessDate("10-27-2026", "2026-11-18")).toMatchObject({ suggested: "2026-10-27", sure: true });
    expect(guessDate("11-10-2026", "2026-11-18")).toMatchObject({ sure: false });
  });
  test("account folders, profiles, x2, {6} and a second client in one profile", () => {
    const r = parseFolder(
      [
        { path: "les abonmont/netflix 1mounth/1 mounth (2)/account email.txt", text: "acc@example.com" },
        { path: "les abonmont/netflix 1mounth/1 mounth (2)/profile 3 {6} (10-28-2026).txt", text: "0550000001\n\n0550000002 (10-30-2026)" },
        { path: "les abonmont/netflix 1mounth/1 mounth (2)/profle 4.txt", text: "0550000003 x 2 ( 11-04-2026 )" },
        { path: "les abonmont/shahid vip/cliant num 1 (11-2-2026).txt", text: "1 mounth shahid vip\n\n0550000004" },
        { path: "les abonmont/HBO MAX/CLIENT 1 (10-31-2026).txt", text: "" },
      ],
      "2026-11-18",
    );
    expect(r.accounts).toEqual([{ key: "Netflix|1 mounth (2)", product: "Netflix", label: "حساب 2", email: "acc@example.com" }]);
    const [a, b, c, d, e] = r.entries;
    expect([a.profile, a.months, a.date?.suggested]).toEqual([3, 6, "2026-10-28"]);
    expect([b.profile, b.months, b.date?.suggested]).toEqual([3, 1, "2026-10-30"]);
    expect([c.profile, c.devices, c.date?.suggested]).toEqual([4, 2, "2026-11-04"]);
    expect([d.product, d.accountKey, d.date?.suggested]).toEqual(["Shahid VIP", null, "2026-11-02"]);
    expect([e.product, e.noPhone, e.date?.suggested]).toEqual(["HBO Max", true, "2026-10-31"]);
  });
});
