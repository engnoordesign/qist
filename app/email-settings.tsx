'use client';
import {useEffect, useState} from 'react';
import {Mail, Send, Save, KeyRound, ExternalLink} from 'lucide-react';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {toast} from 'sonner';

type Info = {settings: Record<string, any>; upcoming: any[]; log: any[]; preview: {subject: string; html: string}};

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/reminders', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}

export function EmailSettings({ar}: {ar: boolean}) {
  const t = (en: string, a: string) => ar ? a : en;
  const [info, setInfo] = useState<Info | null>(null), [error, setError] = useState(''), [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false), [testTo, setTestTo] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/reminders'); const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setInfo(d); setForm({...d.settings, smtp_pass: ''}); setTestTo(x => x || d.settings.smtp_user || ''); setError('');
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function run(body: Record<string, unknown>, ok: (d: any) => string) {
    setBusy(true);
    try { const d = await call(body); toast.success(ok(d)); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const when = (s: string) => s ? new Intl.DateTimeFormat(ar ? 'ar-IQ' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric', ...(s.length > 10 ? {hour: '2-digit', minute: '2-digit'} : {}), timeZone: 'Asia/Baghdad'}).format(new Date(s.length === 10 ? s + 'T12:00:00Z' : s)) : '—';
  const money = (n: number, c: string) => new Intl.NumberFormat(ar ? 'ar-IQ' : 'en-US', {style: 'currency', currency: c, maximumFractionDigits: c === 'IQD' ? 0 : 2}).format(n / (c === 'USD' ? 100 : 1));

  if (error) return <div className="empty"><p role="alert">{error}</p><button className="secondary" onClick={load}>{t('Retry', 'إعادة المحاولة')}</button></div>;
  if (!info || !form) return <div className="empty">{t('Loading…', 'جارٍ التحميل…')}</div>;

  const s = info.settings, ready = !!(s.smtp_user && s.has_pass), on = s.email_enabled === '1' && ready;
  const field = (k: string) => ({value: form[k] ?? '', onChange: (e: any) => setForm({...form, [k]: e.target.value})});
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return <div className="email-settings">
    <section className="panel">
      <div className="panel-title"><div>
        <h2>{t('Email reminders', 'تذكير بالبريد الإلكتروني')} <span className={'badge ' + (on ? 'settled' : 'carried')}>{on ? t('On', 'مفعل') : t('Off', 'متوقف')}</span></h2>
        <p>{t(`Customers with an email address get one Arabic + English reminder ${s.reminder_days} day(s) before each installment is due.`, `يتلقى كل عميل لديه بريد إلكتروني تذكيراً واحداً بالعربية والإنجليزية قبل ${s.reminder_days} يوم من موعد كل قسط.`)}</p>
      </div></div>
      <form className="panel-body" onSubmit={e => { e.preventDefault(); run({action: 'save', ...form}, () => t('Email settings saved.', 'تم حفظ إعدادات البريد.')); }}>
        <div className="form-grid">
          <label className="wide check-row"><input type="checkbox" checked={form.email_enabled === '1'} onChange={e => setForm({...form, email_enabled: e.target.checked ? '1' : '0'})}/>{t('Send reminders automatically', 'إرسال التذكيرات تلقائياً')}</label>
          <label>{t('Gmail address (sender)', 'عنوان Gmail (المرسل)')}<input type="email" dir="ltr" required maxLength={254} placeholder="name@gmail.com" {...field('smtp_user')}/></label>
          <label>{t('Google App Password', 'كلمة مرور التطبيق من Google')}<input type="password" dir="ltr" autoComplete="new-password" maxLength={64} placeholder={s.has_pass ? t('Saved. Leave blank to keep it', 'محفوظة. اتركها فارغة للإبقاء عليها') : 'xxxx xxxx xxxx xxxx'} {...field('smtp_pass')}/></label>
          <label>{t('Business name (shown as sender)', 'اسم النشاط (يظهر كمرسل)')}<input required maxLength={80} {...field('sender_name')}/></label>
          <label>{t('Contact phone (optional)', 'هاتف التواصل (اختياري)')}<input type="tel" dir="ltr" maxLength={40} {...field('contact_phone')}/></label>
          <label>{t('Days before the due date', 'عدد الأيام قبل الاستحقاق')}<input type="number" min={1} max={14} required {...field('reminder_days')}/></label>
          <label className="wide">{t('Extra note (optional, added to every email)', 'ملاحظة إضافية (اختيارية، تُضاف لكل رسالة)')}<input maxLength={300} {...field('extra_note')}/></label>
        </div>
        <p className="settings-note">{t('Gmail needs an App Password, not your normal password. Turn on 2-Step Verification in your Google account, create an App Password, and paste the 16 letters here.', 'يحتاج Gmail إلى «كلمة مرور التطبيق» وليس كلمة مرورك العادية. فعّل التحقق بخطوتين في حساب Google، ثم أنشئ كلمة مرور تطبيق والصق الأحرف الـ16 هنا.')} <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">{t('Create an App Password', 'إنشاء كلمة مرور التطبيق')}<ExternalLink size={13}/></a></p>
        <div className="form-actions start"><button className="primary" disabled={busy}><Save size={16}/>{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save settings', 'حفظ الإعدادات')}</button></div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-title"><div><h2>{t('Test and send', 'الاختبار والإرسال')}</h2>
        <p>{t('Send yourself a test first. “Send due reminders now” sends every reminder that is due and not sent yet.', 'أرسل رسالة تجريبية أولاً. زر «إرسال التذكيرات المستحقة الآن» يرسل كل تذكير مستحق لم يُرسل بعد.')}</p></div></div>
      <div className="assign-box">
        <input className="inline-input" type="email" dir="ltr" aria-label={t('Test address', 'عنوان التجربة')} placeholder="name@example.com" value={testTo} onChange={e => setTestTo(e.target.value)}/>
        <button className="secondary" disabled={busy || !ready} onClick={() => run({action: 'test', to: testTo}, d => t('Test email sent to ', 'تم إرسال رسالة تجريبية إلى ') + d.to)}><Send size={16}/>{t('Send test email', 'إرسال رسالة تجريبية')}</button>
        <button className="primary" disabled={busy || !ready} onClick={() => run({action: 'run'}, d => t(`${d.sent} sent · ${d.failed} failed`, `أُرسل ${d.sent} · فشل ${d.failed}`))}><Mail size={16}/>{t('Send due reminders now', 'إرسال التذكيرات المستحقة الآن')}</button>
      </div>
      {!ready && <p className="settings-note pad">{t('Save the Gmail address and App Password to enable these buttons.', 'احفظ عنوان Gmail وكلمة مرور التطبيق لتفعيل هذه الأزرار.')}</p>}
    </section>

    <section className="panel">
      <div className="panel-title"><div><h2>{t('Upcoming reminders', 'التذكيرات القادمة')} <span className="count">{info.upcoming.length}</span></h2>
        <p>{t(`Unpaid installments due in the next ${s.reminder_days} day(s).`, `الأقساط غير المدفوعة المستحقة خلال ${s.reminder_days} يوم.`)}</p></div></div>
      {!info.upcoming.length ? <div className="empty small-empty"><p>{t('No installments are due in this period.', 'لا توجد أقساط مستحقة في هذه الفترة.')}</p></div> :
      <Table><TableHeader><TableRow>{[t('Customer', 'العميل'), t('Due date', 'الاستحقاق'), t('Amount left', 'المتبقي'), t('Email', 'البريد'), t('Reminder', 'التذكير')].map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{info.upcoming.map(r => <TableRow key={r.id}>
          <TableCell><b>{r.buyer_name}</b><small>{r.product} · #{r.number}</small></TableCell>
          <TableCell className="nowrap">{when(r.due)}</TableCell>
          <TableCell className="amount">{money(r.amount - (r.paid || 0), r.currency)}</TableCell>
          <TableCell dir="ltr">{r.email || '—'}</TableCell>
          <TableCell>{r.sent_at ? <span className="badge settled">{t('Sent', 'أُرسل')} · {when(r.sent_at)}</span> : !r.email ? <span className="badge carried">{t('No email', 'بلا بريد')}</span> : r.last_error ? <span className="badge overdue" title={r.last_error}>{t('Failed', 'فشل')} ({r.failures})</span> : <span className="badge active">{t('Waiting', 'بالانتظار')}</span>}</TableCell>
        </TableRow>)}</TableBody></Table>}
    </section>

    <section className="panel">
      <div className="panel-title"><div><h2>{t('Email format', 'شكل الرسالة')}</h2><p dir="auto">{info.preview.subject}</p></div></div>
      <iframe className="email-preview" title={t('Email preview', 'معاينة الرسالة')} sandbox="" srcDoc={info.preview.html}/>
    </section>

    <section className="panel">
      <div className="panel-title"><div><h2>{t('Automatic schedule', 'الجدولة التلقائية')}</h2>
        <p>{t('Qist checks for due reminders whenever someone opens it (at most once an hour). To send them every day even when nobody opens the app, connect a daily scheduler with this key.', 'يتحقق قسط من التذكيرات المستحقة كلما فتحه أحد (مرة كل ساعة كحد أقصى). لإرسالها يومياً حتى إن لم يفتح أحد التطبيق، اربط مُجدولاً يومياً بهذا المفتاح.')}</p></div></div>
      <div className="assign-box">
        {s.cron_key ? <code className="key" dir="ltr">{s.cron_key}</code> : <p>{t('No scheduler key yet.', 'لا يوجد مفتاح جدولة بعد.')}</p>}
        <button className="secondary" disabled={busy} onClick={() => run({action: 'new-key'}, () => t('Scheduler key created.', 'تم إنشاء مفتاح الجدولة.'))}><KeyRound size={16}/>{s.cron_key ? t('Replace key', 'استبدال المفتاح') : t('Create key', 'إنشاء مفتاح')}</button>
      </div>
      {s.cron_key && <p className="settings-note pad" dir="auto">{t('GitHub → repository Settings → Secrets → Actions: add QIST_URL = ', 'في GitHub ← إعدادات المستودع ← Secrets ← Actions أضف QIST_URL = ')}<code dir="ltr">{origin}</code>{t(' and QIST_REMINDER_KEY = the key above. The included workflow then runs every day at 9:00 Baghdad time.', ' و QIST_REMINDER_KEY = المفتاح أعلاه. بعدها يعمل سير العمل المرفق يومياً الساعة 9:00 بتوقيت بغداد.')}</p>}
    </section>

    {info.log.length > 0 && <section className="panel">
      <div className="panel-title"><div><h2>{t('Recently sent', 'المرسلة مؤخراً')} <span className="count">{info.log.length}</span></h2></div></div>
      <Table><TableHeader><TableRow>{[t('Time', 'الوقت'), t('Customer', 'العميل'), t('Email', 'البريد'), t('Result', 'النتيجة')].map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{info.log.map(l => <TableRow key={l.id}>
          <TableCell className="nowrap">{when(l.sent_at)}</TableCell><TableCell>{l.buyer_name || '—'}</TableCell><TableCell dir="ltr">{l.email}</TableCell>
          <TableCell>{l.status === 'sent' ? <span className="badge settled">{t('Sent', 'أُرسل')}</span> : <><span className="badge overdue">{t('Failed', 'فشل')}</span><small dir="auto">{l.error}</small></>}</TableCell>
        </TableRow>)}</TableBody></Table>
    </section>}
  </div>;
}
