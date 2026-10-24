import {assertSameOrigin, db, fail, HttpError, json, logStatement, requireUser} from '@/lib/server';
import {today, validEmail} from '@/lib/ledger';
import {sendMail} from '@/lib/mailer';
import {autoRun, buildReminder, deliver, getSettings, installmentRow, putSetting, runDue, sampleRow, smtpOf, upcoming} from '@/lib/reminders';

const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Engineer only: email settings, the upcoming reminder queue, recent sends and a preview of the email format.
export async function GET(req: Request) {
  try {
    await requireUser(req, 'engineer');
    const s = await getSettings(), day = today();
    const [list, log] = await Promise.all([
      upcoming(s),
      db().prepare(`SELECT r.id,r.installment_id,r.due,r.email,r.status,r.error,r.sent_at,b.name AS buyer_name FROM reminders r
LEFT JOIN installments i ON i.id=r.installment_id LEFT JOIN contracts c ON c.id=i.contract_id LEFT JOIN buyers b ON b.id=c.buyer_id ORDER BY r.id DESC LIMIT 30`).all(),
    ]);
    const preview = buildReminder(sampleRow(s, day), s, day);
    const {smtp_pass, ...rest} = s;
    return json({settings: {...rest, has_pass: !!smtp_pass}, upcoming: list, log: log.results, preview: {subject: preview.subject, html: preview.html}});
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    // Optional daily scheduler (for example the GitHub Actions workflow) authenticates with the scheduler key.
    const key = req.headers.get('x-reminder-key');
    if (key !== null) {
      const s = await getSettings();
      if (!s.cron_key || !same(key, s.cron_key)) throw new HttpError(403, 'Forbidden');
      return json(await autoRun());
    }

    assertSameOrigin(req);
    const user = await requireUser(req), d = db();
    const b = await req.json() as Record<string, any>;

    // Sent by the app when anyone opens it. Runs at most once an hour for the whole system.
    if (b.action === 'auto') return json(await autoRun());

    if (b.action === 'send-one') {
      if (typeof b.id !== 'string') throw new HttpError(400, 'Invalid installment');
      const row = await installmentRow(b.id);
      if (!row || (user.role !== 'engineer' && row.owner_id !== user.id)) throw new HttpError(404, 'Installment not found or already paid / القسط غير موجود أو مسدد');
      if (!row.email || !validEmail(row.email)) throw new HttpError(400, 'Add the customer’s email first (Edit customer) / أضف بريد العميل أولاً');
      const r = await deliver([row], await getSettings(), user);
      if (r.failed) throw new HttpError(502, r.errors[0] || 'Email failed / فشل الإرسال');
      return json({ok: true, to: row.email});
    }

    if (user.role !== 'engineer') throw new HttpError(403, 'Engineer access only / صلاحية المهندس فقط');

    if (b.action === 'save') {
      const s = await getSettings();
      const gmail = String(b.smtp_user || '').trim().toLowerCase();
      if (!validEmail(gmail)) throw new HttpError(400, 'Enter a valid Gmail address / أدخل عنوان Gmail صحيحاً');
      const pass = String(b.smtp_pass || '').replace(/\s+/g, '');
      if (pass && (pass.length < 8 || pass.length > 64)) throw new HttpError(400, 'The App Password looks wrong (16 letters) / كلمة مرور التطبيق غير صحيحة (16 حرفاً)');
      const days = Number(b.reminder_days);
      if (!Number.isInteger(days) || days < 1 || days > 14) throw new HttpError(400, 'Days before due date: 1–14 / عدد الأيام: من 1 إلى 14');
      const enabled = b.email_enabled === true || b.email_enabled === '1';
      if (enabled && !pass && !s.smtp_pass) throw new HttpError(400, 'Add the App Password before switching reminders on / أضف كلمة مرور التطبيق قبل التفعيل');
      const batch = [
        putSetting('email_enabled', enabled ? '1' : '0'),
        putSetting('smtp_user', gmail),
        putSetting('sender_name', String(b.sender_name || '').trim().slice(0, 80) || 'Qist'),
        putSetting('contact_phone', String(b.contact_phone || '').trim().slice(0, 40)),
        putSetting('reminder_days', String(days)),
        putSetting('extra_note', String(b.extra_note || '').trim().slice(0, 300)),
        logStatement(user, 'email_settings', `${enabled ? 'on' : 'off'} · ${gmail} · ${days} day(s) before${pass ? ' · new app password' : ''}`),
      ];
      if (pass) batch.push(putSetting('smtp_pass', pass));
      await d.batch(batch);
      return json({ok: true});
    }

    if (b.action === 'test') {
      const s = await getSettings(), day = today();
      const to = String(b.to || s.smtp_user).trim().toLowerCase();
      if (!validEmail(to)) throw new HttpError(400, 'Invalid email address / البريد الإلكتروني غير صالح');
      const mail = buildReminder(sampleRow(s, day), s, day, to);
      mail.subject = '[TEST / تجربة] ' + mail.subject;
      const [err] = await sendMail(smtpOf(s), [mail]);
      if (err) throw new HttpError(502, err);
      await logStatement(user, 'reminder_sent', `test → ${to}`).run();
      return json({ok: true, to});
    }

    if (b.action === 'run') return json(await runDue(user));

    if (b.action === 'new-key') {
      await d.batch([putSetting('cron_key', hex(crypto.getRandomValues(new Uint8Array(24)))), logStatement(user, 'email_settings', 'new scheduler key')]);
      return json({ok: true});
    }

    throw new HttpError(400, 'Invalid action');
  } catch (e) { return fail(e); }
}
