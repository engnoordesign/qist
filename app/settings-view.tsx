'use client';
import {useEffect,useState} from 'react';
import {UserPlus,KeyRound,Pencil,Printer,Search,Users,History,Database,Mail} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {toast} from 'sonner';
import {ACTIONS} from './print-sheets';
import {EmailSettings} from './email-settings';

type Admin = {users: any[]; log: any[]; unassigned: {customers: number; contracts: number}};

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/admin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}

export function SettingsView({ar, me, onPrintLog, onChanged}: {ar: boolean; me: {id: string}; onPrintLog: (entries: any[], label: string) => void; onChanged: () => void}) {
  const t = (en: string, a: string) => ar ? a : en;
  const [tab, setTab] = useState<'users' | 'log' | 'data' | 'email'>('users');
  const [admin, setAdmin] = useState<Admin | null>(null), [error, setError] = useState('');
  const [edit, setEdit] = useState<any>(null), [reset, setReset] = useState<any>(null), [busy, setBusy] = useState(false);
  const [logUser, setLogUser] = useState('all'), [logAction, setLogAction] = useState('all'), [q, setQ] = useState('');
  const [assignTo, setAssignTo] = useState('');

  async function load() {
    try { const r = await fetch('/api/admin'); const d: any = await r.json(); if (!r.ok) throw Error(d.error); setAdmin(d); setError(''); }
    catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  const when = (s: string) => new Intl.DateTimeFormat(ar ? 'ar-IQ' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baghdad'}).format(new Date(s));
  const roleText = (r: string) => r === 'engineer' ? t('Engineer', 'مهندس') : t('Manager', 'مدير');
  const choice = (value: string, onChange: (v: string) => void, opts: string[][], label?: string) =>
    <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{opts.map(([v, l]) => <SelectItem value={v} key={v}>{l}</SelectItem>)}</SelectContent></Select>;

  async function run(body: Record<string, unknown>, ok: string, close: () => void) {
    setBusy(true);
    try { await call(body); close(); toast.success(ok); await load(); onChanged(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const users = admin?.users || [];
  const log = (admin?.log || []).filter(l => (logUser === 'all' || l.user_id === logUser) && (logAction === 'all' || l.action === logAction) && (l.user_name + ' ' + l.details).toLowerCase().includes(q.toLowerCase()));
  const logLabel = [logUser === 'all' ? t('All users', 'كل المستخدمين') : users.find(u => u.id === logUser)?.name, logAction === 'all' ? t('All actions', 'كل الإجراءات') : ACTIONS[logAction]?.[ar ? 1 : 0], q && `"${q}"`].filter(Boolean).join(' · ');

  return <>
    <div className="page-heading"><div>
      <h1>{t('System settings', 'إعدادات النظام')}</h1>
      <p>{t('Engineer only. Manage accounts, review activity and assign records.', 'للمهندس فقط. إدارة الحسابات ومراجعة النشاط وتخصيص السجلات.')}</p>
    </div></div>
    <div className="settings-tabs" role="tablist">
      {([['users', Users, t('Users', 'المستخدمون')], ['log', History, t('Activity log', 'سجل النشاط')], ['data', Database, t('Data', 'البيانات')], ['email', Mail, t('Email reminders', 'تذكير البريد')]] as const).map(([k, Icon, label]) =>
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}><Icon size={16}/>{label}</button>)}
    </div>
    {tab === 'email' ? <EmailSettings ar={ar}/> : error ? <div className="empty"><p role="alert">{error}</p><button className="secondary" onClick={load}>{t('Retry', 'إعادة المحاولة')}</button></div> : !admin ? <div className="empty">{t('Loading…', 'جارٍ التحميل…')}</div> :

    tab === 'users' ? <section className="panel">
      <div className="panel-title"><div><h2>{t('User accounts', 'حسابات المستخدمين')} <span className="count">{users.length}</span></h2>
        <p>{t('Each manager sees only their own customers and contracts. Engineers see everything.', 'كل مدير يرى عملاءه وعقوده فقط. المهندس يرى كل شيء.')}</p></div>
        <button className="primary" onClick={() => setEdit({isNew: true, name: '', username: '', role: 'manager', password: ''})}><UserPlus size={17}/>{t('Add user', 'إضافة مستخدم')}</button></div>
      <Table><TableHeader><TableRow>{[t('Name', 'الاسم'), t('Username', 'اسم المستخدم'), t('Role', 'الصلاحية'), t('Customers / contracts', 'العملاء / العقود'), t('Status', 'الحالة'), ''].map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{users.map(u => <TableRow key={u.id}>
          <TableCell><b>{u.name}</b>{u.id === me.id && <small>{t('You', 'أنت')}</small>}</TableCell>
          <TableCell dir="ltr">{u.username}</TableCell>
          <TableCell><span className={'badge ' + (u.role === 'engineer' ? 'role-engineer' : 'active')}>{roleText(u.role)}</span></TableCell>
          <TableCell>{u.customers} / {u.contracts}</TableCell>
          <TableCell><span className={'badge ' + (u.active ? 'settled' : 'overdue')}>{u.active ? t('Active', 'فعال') : t('Disabled', 'معطل')}</span></TableCell>
          <TableCell><div className="row-actions">
            <button className="text-btn" onClick={() => setEdit({...u, active: !!u.active})}><Pencil size={15}/>{t('Edit', 'تعديل')}</button>
            <button className="text-btn" onClick={() => setReset({...u, password: ''})}><KeyRound size={15}/>{t('Reset password', 'كلمة مرور جديدة')}</button>
          </div></TableCell>
        </TableRow>)}</TableBody></Table>
    </section> :

    tab === 'log' ? <section className="panel">
      <div className="panel-title"><div><h2>{t('Activity log', 'سجل النشاط')} <span className="count">{log.length}</span></h2>
        <p>{t('Sign-ins, new contracts, payments and account changes. Latest 2,000 entries.', 'تسجيلات الدخول والعقود والدفعات وتغييرات الحسابات. آخر 2000 سجل.')}</p></div>
        <button className="secondary" disabled={!log.length} onClick={() => onPrintLog(log, logLabel)}><Printer size={16}/>{t('Print / Save PDF', 'طباعة / حفظ PDF')}</button></div>
      <div className="toolbar">
        <div className="search"><Search size={18}/><input aria-label={t('Search log', 'بحث في السجل')} value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search details…', 'ابحث في التفاصيل…')}/></div>
        {choice(logUser, setLogUser, [['all', t('All users', 'كل المستخدمين')], ...users.map(u => [u.id, u.name])], t('User', 'المستخدم'))}
        {choice(logAction, setLogAction, [['all', t('All actions', 'كل الإجراءات')], ...Object.entries(ACTIONS).map(([k, v]) => [k, v[ar ? 1 : 0]])], t('Action', 'الإجراء'))}
      </div>
      {!log.length ? <div className="empty"><p>{t('No matching entries.', 'لا توجد سجلات مطابقة.')}</p></div> :
      <Table><TableHeader><TableRow>{[t('Time', 'الوقت'), t('User', 'المستخدم'), t('Action', 'الإجراء'), t('Details', 'التفاصيل')].map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{log.slice(0, 300).map(l => <TableRow key={l.id}>
          <TableCell className="nowrap">{when(l.at)}</TableCell><TableCell>{l.user_name}</TableCell>
          <TableCell><span className={'badge ' + (['login_failed', 'contract_deleted', 'payment_reversed', 'reminder_failed'].includes(l.action) ? 'overdue' : 'active')}>{ACTIONS[l.action]?.[ar ? 1 : 0] || l.action}</span></TableCell>
          <TableCell dir="auto">{l.details || '—'}</TableCell>
        </TableRow>)}</TableBody></Table>}
      {log.length > 300 && <div className="table-foot"><span>{t('Showing 300 on screen. Print includes all', 'يُعرض 300 على الشاشة. الطباعة تشمل الكل')} {log.length}.</span></div>}
    </section> :

    <section className="panel">
      <div className="panel-title"><div><h2>{t('Unassigned records', 'سجلات غير مخصصة')}</h2>
        <p>{t('Customers created before accounts existed belong to no manager. Only engineers can see them until they are assigned.', 'العملاء المضافون قبل إنشاء الحسابات لا يتبعون أي مدير، ويراهم المهندس فقط حتى يتم تخصيصهم.')}</p></div></div>
      <div className="assign-box">
        <p><b>{admin.unassigned.customers}</b> {t('customers', 'عملاء')} · <b>{admin.unassigned.contracts}</b> {t('contracts', 'عقود')}</p>
        {admin.unassigned.customers > 0 && <>
          {choice(assignTo || 'none', v => setAssignTo(v === 'none' ? '' : v), [['none', t('Choose manager…', 'اختر المدير…')], ...users.filter(u => u.active).map(u => [u.id, `${u.name} · ${roleText(u.role)}`])], t('Assign to', 'تخصيص إلى'))}
          <button className="primary" disabled={!assignTo || busy} onClick={() => run({action: 'assign-unowned', id: assignTo}, t('Customers assigned.', 'تم تخصيص العملاء.'), () => setAssignTo(''))}>{t('Assign all', 'تخصيص الكل')}</button>
        </>}
      </div>
    </section>}

    <Dialog open={!!edit} onOpenChange={v => !busy && !v && setEdit(null)}>
      <DialogContent dir={ar ? 'rtl' : 'ltr'}>
        <DialogTitle>{edit?.isNew ? t('Add user', 'إضافة مستخدم') : t('Edit user', 'تعديل مستخدم')}</DialogTitle>
        <DialogDescription>{t('Managers can add customers, contracts and payments in their own list. Engineers can access everything.', 'المدير يضيف العملاء والعقود والدفعات في قائمته فقط. المهندس يصل إلى كل شيء.')}</DialogDescription>
        {edit && <form onSubmit={e => { e.preventDefault(); run(edit.isNew ? {action: 'create-user', name: edit.name, username: edit.username, role: edit.role, password: edit.password} : {action: 'update-user', id: edit.id, name: edit.name, role: edit.role, active: edit.active}, edit.isNew ? t('User created.', 'تم إنشاء المستخدم.') : t('User updated.', 'تم تحديث المستخدم.'), () => setEdit(null)); }}>
          <div className="form-grid">
            <label className="wide">{t('Full name', 'الاسم الكامل')}<input required maxLength={80} value={edit.name} onChange={e => setEdit({...edit, name: e.target.value})}/></label>
            {edit.isNew ? <label>{t('Username', 'اسم المستخدم')}<input dir="ltr" required pattern="[A-Za-z0-9._\-]{3,32}" maxLength={32} value={edit.username} onChange={e => setEdit({...edit, username: e.target.value})}/></label>
              : <label>{t('Username', 'اسم المستخدم')}<input dir="ltr" disabled value={edit.username}/></label>}
            <label>{t('Role', 'الصلاحية')}{choice(edit.role, v => setEdit({...edit, role: v}), [['manager', t('Manager — own data only', 'مدير — بياناته فقط')], ['engineer', t('Engineer — full access', 'مهندس — صلاحية كاملة')]])}</label>
            {edit.isNew ? <label className="wide">{t('Password (8+ characters)', 'كلمة المرور (8 أحرف أو أكثر)')}<input type="password" dir="ltr" autoComplete="new-password" required minLength={8} maxLength={128} value={edit.password} onChange={e => setEdit({...edit, password: e.target.value})}/></label>
              : <label className="wide check-row"><input type="checkbox" checked={edit.active} onChange={e => setEdit({...edit, active: e.target.checked})}/>{t('Account active (can sign in)', 'الحساب فعال (يمكنه الدخول)')}</label>}
          </div>
          <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setEdit(null)}>{t('Cancel', 'إلغاء')}</button><button className="primary" disabled={busy}>{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save', 'حفظ')}</button></div>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!reset} onOpenChange={v => !busy && !v && setReset(null)}>
      <DialogContent dir={ar ? 'rtl' : 'ltr'}>
        <DialogTitle>{t('Set a new password', 'تعيين كلمة مرور جديدة')}</DialogTitle>
        <DialogDescription>{reset?.name} ({reset?.username}). {t('They will be signed out everywhere.', 'سيتم تسجيل خروجه من كل الأجهزة.')}</DialogDescription>
        {reset && <form onSubmit={e => { e.preventDefault(); run({action: 'reset-password', id: reset.id, password: reset.password}, t('Password updated.', 'تم تحديث كلمة المرور.'), () => setReset(null)); }}>
          <div className="form-grid"><label className="wide">{t('New password (8+ characters)', 'كلمة المرور الجديدة (8 أحرف أو أكثر)')}<input type="password" dir="ltr" autoComplete="new-password" required minLength={8} maxLength={128} value={reset.password} onChange={e => setReset({...reset, password: e.target.value})}/></label></div>
          <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setReset(null)}>{t('Cancel', 'إلغاء')}</button><button className="primary" disabled={busy}>{t('Update password', 'تحديث كلمة المرور')}</button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
