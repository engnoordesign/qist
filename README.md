# Qist | قسط

Arabic–English debt collection and installment management app.
Current UI: charcoal/champagne luxury theme, light/dark preference, compact navigation menu.

> **No login.** This version has no sign-in screen: anyone who can open the app's URL can view and change all records. Run it on your own computer or a private network only, or add authentication before putting it on the internet.

## Run the application locally

Requires Node.js 22.13 or newer and pnpm. From this source directory:

```sh
pnpm install --frozen-lockfile
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_true_union_jack.sql
```

The migration command is for a NEW local database only. To load the included business data into that new database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file ../data/data-only.sql
pnpm start
```

Open the local URL printed by Wrangler. Do not import data into a database that already contains these IDs. The full SQL dump and SQLite file are alternative backup formats, not additional migrations. The data-only file belongs to the separate ZIP backup and is deliberately excluded from a source-only GitHub repository.

## Architecture

- React / Vinext / TypeScript interface: `app/page.tsx`
- Themes and responsive layout: `app/globals.css`
- Database API: `app/api/ledger/route.ts`
- Date and money calculations: `lib/ledger.ts`
- Database schema: `db/schema.ts`; migrations: `drizzle/`
- Production hosting: Cloudflare Workers + D1 through ChatGPT Sites
- Production site identity: `.openai/hosting.json`

GitHub is source storage; pushing this project to GitHub does not deploy it or copy the live database. This is a Worker/D1 application, not a static GitHub Pages site. The app has no built-in login (the ChatGPT Sites sign-in helpers were removed). Add server-side authentication before exposing it on a public URL.

Do not publish runtime directories, secrets, or personal buyer/payment data. Keep the original Site ID only for managing the existing Site. A separate deployment needs its own platform configuration.

## العربية

نظام قسط لإدارة الديون والأقساط بالعربية والإنجليزية. يتضمن الوضع الداكن والفاتح والقائمة المختصرة.
الكود موجود هنا، ونسخة البيانات الحية في مجلد data ضمن ملف ZIP. رفع الكود إلى GitHub لا ينقل البيانات ولا ينشر الموقع تلقائياً.
هذا الإصدار بدون تسجيل دخول: أي شخص يملك رابط التطبيق يمكنه رؤية البيانات وتعديلها، لذا شغّله على جهازك أو شبكة خاصة فقط.
لتشغيل نسخة محلية اتبع الأوامر أعلاه، واستورد البيانات فقط في قاعدة جديدة فارغة. لا تنشر بيانات المشترين والدفعات في مستودع عام.
