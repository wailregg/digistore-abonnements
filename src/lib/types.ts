export type Client = {
  id: string;
  phone: string; // normalised: 0XXXXXXXXX, or @handle, or "" when unknown
  name: string;
  source: string;
  note: string;
  created_at: string;
};

export type Account = {
  id: string;
  product: string;
  label: string;
  email: string;
  password: string;
  profiles: number;
  device_limit: number;
  supplier_end: string | null; // YYYY-MM-DD
  note: string;
  archived: boolean;
  created_at: string;
};

export type Sub = {
  id: string;
  client_id: string;
  product: string;
  months: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // start + 30 days per month
  account_id: string | null;
  profile: number | null;
  devices: number;
  price: number | null;
  paid: boolean;
  pay_method: string;
  last_move: string | null;
  note: string;
  created_at: string;
};

export type Expense = {
  id: string;
  date: string;
  amount: number;
  account_id: string | null;
  note: string;
  created_at: string;
};

export type Settings = {
  templates: Record<TemplateKey, string>;
  default_device_limit: number;
};

export type TemplateKey = "welcome" | "renew" | "ended" | "move" | "pay" | "down";

export type Data = {
  clients: Client[];
  accounts: Account[];
  subs: Sub[];
  expenses: Expense[];
  settings: Settings;
};

export type Table = "clients" | "accounts" | "subscriptions" | "expenses";
