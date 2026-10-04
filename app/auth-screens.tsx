'use client';
import {useState} from 'react';
import {Check,Globe,Lock} from 'lucide-react';

type Props = {ar: boolean; setAr: (v: boolean) => void; onDone: () => void};

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/auth', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}

function Shell({ar, setAr, title, subtitle, children}: {ar: boolean; setAr: (v: boolean) => void; title: string; subtitle: string; children: React.ReactNode}) {
  return <div className="auth-page" dir={ar ? 'rtl' : 'ltr'}>
    <button className="language auth-lang" onClick={() => { setAr(!ar); try { localStorage.setItem('qist-lang', !ar ? 'ar' : 'en'); } catch {} }}><Globe size={17}/>{ar ? 'English' : 'العربية'}</button>
    <div className="auth-card">
      <div className="brand auth-brand"><span className="brand-icon"><Check/></span><b>qist<span>قسط</span></b></div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  </div>;
}

export function LoginScreen({ar, setAr, onDone}: Props) {
  const t = (en: string, a: string) => ar ? a : en;
  const [form, setForm] = useState({username: '', password: ''}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await post({action: 'login', ...form}); onDone(); } catch (err: any) { setError(err.message); setBusy(false); }
  }
  return <Shell ar={ar} setAr={setAr} title={t('Sign in','تسجيل الدخول')} subtitle={t('Enter the account your engineer created for you.','أدخل الحساب الذي أنشأه لك المهندس.')}>
    <form className="auth-form" onSubmit={submit}>
      <label>{t('Username','اسم المستخدم')}<input autoFocus autoComplete="username" dir="ltr" required maxLength={32} value={form.username} onChange={e => setForm({...form, username: e.target.value})}/></label>
      <label>{t('Password','كلمة المرور')}<input type="password" autoComplete="current-password" dir="ltr" required maxLength={128} value={form.password} onChange={e => setForm({...form, password: e.target.value})}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}><Lock size={17}/>{busy ? t('Signing in…','جارٍ الدخول…') : t('Sign in','دخول')}</button>
    </form>
  </Shell>;
}

export function SetupScreen({ar, setAr, onDone}: Props) {
  const t = (en: string, a: string) => ar ? a : en;
  const [form, setForm] = useState({name: '', username: '', password: '', confirm: ''}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError(t('Passwords do not match','كلمتا المرور غير متطابقتين')); return; }
    setBusy(true);
    try { await post({action: 'setup', name: form.name, username: form.username, password: form.password}); onDone(); } catch (err: any) { setError(err.message); setBusy(false); }
  }
  return <Shell ar={ar} setAr={setAr} title={t('Create the engineer account','إنشاء حساب المهندس')} subtitle={t('First-time setup. The engineer has full access and creates the manager accounts.','إعداد لأول مرة. المهندس يملك كامل الصلاحيات وينشئ حسابات المدراء.')}>
    <form className="auth-form" onSubmit={submit}>
      <label>{t('Full name','الاسم الكامل')}<input autoFocus required maxLength={80} value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></label>
      <label>{t('Username','اسم المستخدم')}<input dir="ltr" autoComplete="username" required pattern="[A-Za-z0-9._\-]{3,32}" maxLength={32} value={form.username} onChange={e => setForm({...form, username: e.target.value})}/><small>{t('3–32 English letters, numbers, . _ -','3–32 حرفاً إنجليزياً أو رقماً أو . _ -')}</small></label>
      <label>{t('Password (8+ characters)','كلمة المرور (8 أحرف أو أكثر)')}<input type="password" dir="ltr" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={e => setForm({...form, password: e.target.value})}/></label>
      <label>{t('Confirm password','تأكيد كلمة المرور')}<input type="password" dir="ltr" autoComplete="new-password" required minLength={8} maxLength={128} value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? t('Creating…','جارٍ الإنشاء…') : t('Create account and continue','إنشاء الحساب والمتابعة')}</button>
    </form>
  </Shell>;
}
