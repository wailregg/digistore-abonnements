# DigiStore · متتبّع الاشتراكات

Private tool for the DigiStore owner to track the subscriptions he sells (who, start, end date,
reminders, WhatsApp renewal messages, accounts and profiles, money).

- Front end: Vite + React, published on GitHub Pages: https://wailregg.github.io/digistore-abonnements/
- Data: a dedicated Supabase project with row-level security. Only the owner's account can read or
  write. The first account created becomes the owner, and later sign-ups are refused by a database
  trigger. No client data is stored in this repository.
- A 4-digit code locks the app on each device.
- Business rules: one month = 30 days; a reminder on the end day; multi-month clients on a shared
  account move to another account every 30 days; `x2` = two devices on one profile.

```bash
bun install
bun run demo   # invented data only, no login
bun test src
bun run build
```

`scripts/check-import.ts <folder>` runs the old-files importer locally and prints only counts.
