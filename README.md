# Qist | قسط

Arabic–English debt collection and installment management app.
Current UI: charcoal/champagne luxury theme, light/dark preference, compact navigation menu.

> **Sign-in required.** Two roles: **Engineer** (full access, system settings, every manager's data) and **Manager** (only their own customers, contracts and payments). The first visit to a new database asks you to create the engineer account.

## Run the application locally

Requires Node.js 22.13 or newer and pnpm. From this source directory:

```sh
pnpm install --frozen-lockfile
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_true_union_jack.sql
# optional, only into this NEW empty database: the private backup data
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file ../data/data-only.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_accounts_and_roles.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_partial_payments.sql
pnpm start
```

Open the local URL printed by Wrangler and create the engineer account. Run the migrations in order; load `data-only.sql` (if wanted) after `0000` and before `0001`, and never into a database that already contains those IDs. The full SQL dump and SQLite file in the backup are alternative backup formats, not migrations. The data file is deliberately excluded from this repository.

To upgrade an existing database, run only the migrations it does not have yet, in order (`0001_accounts_and_roles.sql`, then `0002_partial_payments.sql`). `0002` moves every existing payment into the new `payment_entries` table.

## Accounts and roles

- **First run:** open the app and create the engineer account (only possible while no users exist).
- **Engineer:** sees every manager's records, chooses the owning manager when creating a contract, and opens **System settings** (users, activity log, unassigned data).
- **Manager:** sees and edits only their own customer list, contracts and payments. No access to settings; the API enforces this, not just the screen.
- Records saved before accounts existed are *unassigned*: the engineer assigns them to a manager in **System settings → Data**.
- **Print statement (PDF)** on a contract prints one A4 page: customer, manager, contract terms, totals and the full payment history (receipt and who received each payment), with signature lines.
- **Partial payments:** each month can be paid in parts (every payment has its own receipt and receiver). **Undo** reverses a payment recorded by mistake (kept in history). **Not paid → next month** closes a month with what was paid and appends the unpaid part as a new installment at the end, so the total stays complete; **Undo “not paid”** removes it while unpaid.
- **Delete contract** (plan page) permanently removes the contract, its schedule and payments after confirmation. Managers can delete only their own contracts; engineers any. Each deletion is written to the activity log.
- **System settings → Activity log → Print** prints the filtered log (sign-ins, contracts, payments, account changes).
- Passwords are hashed with PBKDF2-SHA256; sessions are HttpOnly cookies valid for 7 days; 5 failed sign-ins lock that username for 15 minutes.
- Forgotten engineer password: another engineer can reset it. If none exists, delete the rows in `users` (and `sessions`) from the database and the setup screen appears again.

## Architecture

- React / Vinext / TypeScript interface: `app/page.tsx`
- Themes and responsive layout: `app/globals.css`
- Sign-in gate: `app/page.tsx`, `app/auth-screens.tsx`; main app: `app/ledger-app.tsx`; settings: `app/settings-view.tsx`; print layouts: `app/print-sheets.tsx`
- APIs: `app/api/auth` (sign-in), `app/api/ledger` (records, scoped per manager), `app/api/admin` (engineer only); shared auth helpers: `lib/server.ts`
- Date and money calculations: `lib/ledger.ts`
- Database schema: `db/schema.ts`; migrations: `drizzle/`
- Production hosting: Cloudflare Workers + D1 through ChatGPT Sites
- Production site identity: `.openai/hosting.json`

GitHub is source storage; pushing this project to GitHub does not deploy it or copy the live database. This is a Worker/D1 application, not a static GitHub Pages site. The app has its own sign-in. Still use HTTPS when hosting it publicly.

Do not publish runtime directories, secrets, or personal buyer/payment data. Keep the original Site ID only for managing the existing Site. A separate deployment needs its own platform configuration.

## العربية

نظام قسط لإدارة الديون والأقساط بالعربية والإنجليزية. يتضمن الوضع الداكن والفاتح والقائمة المختصرة.
الكود موجود هنا، ونسخة البيانات الحية في مجلد data ضمن ملف ZIP. رفع الكود إلى GitHub لا ينقل البيانات ولا ينشر الموقع تلقائياً.
يتطلب النظام تسجيل الدخول بصلاحيتين: المهندس (صلاحية كاملة وإعدادات النظام وبيانات جميع المدراء) والمدير (عملاؤه وعقوده ودفعاته فقط). عند أول تشغيل يُطلب إنشاء حساب المهندس. زر طباعة الكشف يطبع صفحة PDF واحدة تتضمن العميل والمدير وكل تفاصيل الدين وسجل الدفعات، ويمكن طباعة سجل النشاط من إعدادات النظام.
لتشغيل نسخة محلية اتبع الأوامر أعلاه، واستورد البيانات فقط في قاعدة جديدة فارغة. لا تنشر بيانات المشترين والدفعات في مستودع عام.
