import {db, HttpError, logStatement} from '@/lib/server';
import {today, validEmail} from '@/lib/ledger';
import {sendMail, type Mail} from '@/lib/mailer';

// Automatic email reminders: one bilingual email per installment, a few days before it is due.
export type Settings = {email_enabled: string; smtp_user: string; smtp_pass: string; sender_name: string; contact_phone: string; reminder_days: string; extra_note: string; cron_key: string; last_run: string};
const DEFAULTS: Settings = {email_enabled: '0', smtp_user: '', smtp_pass: '', sender_name: 'Qist قسط', contact_phone: '', reminder_days: '3', extra_note: '', cron_key: '', last_run: ''};
type Actor = {id?: string | null; name: string};
export const AUTO: Actor = {id: null, name: 'Automatic reminder / تذكير تلقائي'};
const MAX_PER_RUN = 40, MAX_FAILURES = 3;

export async function getSettings(): Promise<Settings> {
  const r = await db().prepare('SELECT key,value FROM settings').all<{key: string; value: string}>();
  const s: Record<string, string> = {...DEFAULTS};
  for (const row of r.results) s[row.key] = row.value;
  return s as Settings;
}
export const putSetting = (key: string, value: string) =>
  db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, value);
export const reminderDays = (s: Settings) => { const n = Number(s.reminder_days); return Number.isInteger(n) && n >= 1 && n <= 14 ? n : 3; };
export const addDays = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export type DueRow = {id: string; number: number; due: string; amount: number; paid: number; contract_id: string; product: string; currency: string; buyer_name: string; email: string | null; owner_id: string | null; sent_at?: string | null; failures?: number; last_error?: string | null};
const PAID = '(SELECT COALESCE(SUM(e.amount),0) FROM payment_entries e WHERE e.installment_id=i.id AND e.voided_at IS NULL)';
const SELECT = `SELECT i.id,i.number,i.due,i.amount,${PAID} AS paid,c.id AS contract_id,c.product,c.currency,b.name AS buyer_name,b.email,b.owner_id,
(SELECT MAX(r.sent_at) FROM reminders r WHERE r.installment_id=i.id AND r.due=i.due AND r.status='sent') AS sent_at,
(SELECT COUNT(*) FROM reminders r WHERE r.installment_id=i.id AND r.due=i.due AND r.status='failed') AS failures,
(SELECT r.error FROM reminders r WHERE r.installment_id=i.id AND r.due=i.due AND r.status='failed' ORDER BY r.id DESC LIMIT 1) AS last_error
FROM installments i JOIN contracts c ON c.id=i.contract_id JOIN buyers b ON b.id=c.buyer_id
WHERE i.closed_at IS NULL AND i.amount>${PAID}`;

/** Unpaid installments due from today up to the reminder window. */
export async function upcoming(s: Settings) {
  const day = today();
  return (await db().prepare(`${SELECT} AND i.due>=? AND i.due<=? ORDER BY i.due,b.name LIMIT 500`).bind(day, addDays(day, reminderDays(s))).all<DueRow>()).results;
}
/** One open installment (any due date), or null if it is paid or closed. */
export const installmentRow = (id: string) => db().prepare(`${SELECT} AND i.id=?`).bind(id).first<DueRow>();

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'} as Record<string, string>)[c]);
const fmtMoney = (units: number, c: string, locale: string) => new Intl.NumberFormat(locale, {style: 'currency', currency: c, maximumFractionDigits: c === 'IQD' ? 0 : 2}).format(units / (c === 'USD' ? 100 : 1));
const fmtDate = (d: string, locale: string) => new Intl.DateTimeFormat(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(d + 'T12:00:00Z'));
function inDays(n: number) {
  return {
    en: n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`,
    ar: n <= 0 ? 'اليوم' : n === 1 ? 'غداً' : n === 2 ? 'بعد يومين' : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يوماً`,
  };
}

export const sampleRow = (s: Settings, day: string): DueRow => ({id: 'D-EXAMPLE-3', number: 3, due: addDays(day, reminderDays(s)), amount: 250000, paid: 0, currency: 'IQD', contract_id: 'D-EXAMPLE', product: 'Samsung Galaxy A55', buyer_name: 'أحمد علي / Ahmed Ali', email: s.smtp_user, owner_id: null});

/** The general reminder format: Arabic first, then English, in one email. */
export function buildReminder(r: DueRow, s: Settings, day: string, to = r.email || ''): Mail {
  const left = r.amount - (r.paid || 0);
  const n = Math.round((Date.parse(r.due + 'T12:00:00Z') - Date.parse(day + 'T12:00:00Z')) / 864e5);
  const when = inDays(n), biz = s.sender_name || 'Qist';
  const amountAr = fmtMoney(left, r.currency, 'ar-IQ'), amountEn = fmtMoney(left, r.currency, 'en-US');
  const dateAr = fmtDate(r.due, 'ar-IQ'), dateEn = fmtDate(r.due, 'en-GB');
  const note = s.extra_note.trim(), phone = s.contact_phone.trim();
  const subject = `تذكير: قسطك يستحق ${when.ar} | Reminder: your installment is due ${when.en} — ${biz}`;

  const textAr = [`مرحباً ${r.buyer_name}،`, '', `نذكّرك بأن القسط رقم ${r.number} لـ «${r.product}» يستحق ${when.ar}، ${dateAr}.`, `المبلغ المستحق: ${amountAr}`, `رقم العقد: ${r.contract_id}`];
  const textEn = [`Hello ${r.buyer_name},`, '', `This is a friendly reminder that installment #${r.number} for "${r.product}" is due ${when.en}, ${dateEn}.`, `Amount due: ${amountEn}`, `Contract: ${r.contract_id}`];
  if (note) { textAr.push('', note); textEn.push('', note); }
  textAr.push('', 'إذا كنت قد سددت المبلغ فيرجى تجاهل هذه الرسالة. شكراً لك.');
  textEn.push('', 'If you have already paid, please ignore this message. Thank you.');
  if (phone) { textAr.push(`للاستفسار: ${phone}`); textEn.push(`Questions? Call ${phone}`); }
  const text = [...textAr, '', '────────────', '', ...textEn, '', biz].join('\r\n');

  const box = (label: string, amount: string, ref: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe3;border-radius:8px"><tr><td style="padding:14px 16px"><span style="color:#636975;font-size:13px">${label}</span><br><b style="font-size:24px;color:#8a6b32">${amount}</b><br><span style="color:#636975;font-size:13px">${ref}</span></td></tr></table>`;
  const noteHtml = note ? `<p style="margin:14px 0 0">${esc(note)}</p>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif;color:#22252b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e3e7;border-radius:12px;overflow:hidden">
<tr><td style="background:#21252b;padding:18px 24px;color:#f2e8ce;font-size:20px;text-align:center"><b>${esc(biz)}</b></td></tr>
<tr><td dir="rtl" lang="ar" style="padding:24px;text-align:right;font-size:15px;line-height:1.8">
<p style="margin:0 0 10px">مرحباً ${esc(r.buyer_name)}،</p>
<p style="margin:0 0 16px">نذكّرك بأن القسط رقم ${r.number} لـ «${esc(r.product)}» يستحق <b>${when.ar}</b>، ${dateAr}.</p>
${box('المبلغ المستحق', amountAr, `رقم العقد ${esc(r.contract_id)}`)}${noteHtml}
<p style="margin:16px 0 0;color:#636975;font-size:13px">إذا كنت قد سددت المبلغ فيرجى تجاهل هذه الرسالة. شكراً لك.</p>
</td></tr>
<tr><td style="padding:0 24px"><div style="border-top:1px solid #e2e3e7"></div></td></tr>
<tr><td dir="ltr" lang="en" style="padding:24px;text-align:left;font-size:15px;line-height:1.7">
<p style="margin:0 0 10px">Hello ${esc(r.buyer_name)},</p>
<p style="margin:0 0 16px">This is a friendly reminder that installment #${r.number} for “${esc(r.product)}” is due <b>${when.en}</b>, ${dateEn}.</p>
${box('Amount due', amountEn, `Contract ${esc(r.contract_id)}`)}${noteHtml}
<p style="margin:16px 0 0;color:#636975;font-size:13px">If you have already paid, please ignore this message. Thank you.</p>
</td></tr>
<tr><td style="background:#f5efe3;padding:14px 24px;font-size:13px;color:#636975;text-align:center">${phone ? `للاستفسار · Questions: <span dir="ltr">${esc(phone)}</span><br>` : ''}${esc(biz)}</td></tr>
</table></td></tr></table></body></html>`;
  return {to, subject, text, html};
}

export function smtpOf(s: Settings) {
  if (!s.smtp_user || !s.smtp_pass) throw new HttpError(400, 'Set up the Gmail address and App Password first (System settings → Email reminders) / أعدّ بريد Gmail وكلمة مرور التطبيق أولاً');
  return {host: 'smtp.gmail.com', port: 465, user: s.smtp_user, pass: s.smtp_pass, fromName: s.sender_name || 'Qist'};
}

/** Sends reminders for the given installments and records each result. */
export async function deliver(rows: DueRow[], s: Settings, actor: Actor) {
  const day = today();
  const list = rows.filter(r => r.email && validEmail(r.email)).slice(0, MAX_PER_RUN);
  if (!list.length) return {sent: 0, failed: 0, errors: [] as string[]};
  const results = await sendMail(smtpOf(s), list.map(r => buildReminder(r, s, day)));
  const now = new Date().toISOString(), d = db();
  const batch: D1PreparedStatement[] = [];
  list.forEach((r, k) => {
    const err = results[k];
    batch.push(d.prepare('INSERT INTO reminders (installment_id,due,email,status,error,sent_at,sent_by) VALUES (?,?,?,?,?,?,?)')
      .bind(r.id, r.due, r.email, err ? 'failed' : 'sent', err ? err.slice(0, 300) : null, now, actor.id ?? null));
    batch.push(logStatement(actor, err ? 'reminder_failed' : 'reminder_sent', `${r.contract_id} · #${r.number} · ${r.buyer_name} <${r.email}>${err ? ' · ' + err.slice(0, 150) : ''}`, r.contract_id));
  });
  await d.batch(batch);
  const errors = results.filter((e): e is string => !!e);
  return {sent: list.length - errors.length, failed: errors.length, errors: [...new Set(errors)].slice(0, 3)};
}

/** Every reminder that is due and not sent yet (failed ones are retried up to 3 times). */
export async function runDue(actor: Actor) {
  const s = await getSettings();
  const rows = (await upcoming(s)).filter(r => !r.sent_at && (r.failures || 0) < MAX_FAILURES);
  return deliver(rows, s, actor);
}

/** Runs at most once an hour; called when the app opens and by the optional daily scheduler. */
export async function autoRun() {
  const s = await getSettings();
  if (s.email_enabled !== '1' || !s.smtp_user || !s.smtp_pass) return {skipped: 'off'};
  const now = new Date(), cutoff = new Date(now.getTime() - 3600e3).toISOString();
  const claim = await db().prepare("INSERT INTO settings (key,value) VALUES ('last_run',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value<?")
    .bind(now.toISOString(), cutoff).run();
  if (!claim.meta.changes) return {skipped: 'recent'};
  return runDue(AUTO);
}
