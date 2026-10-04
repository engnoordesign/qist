'use client';
// Print-only layouts. Hidden on screen; shown alone when the page is printed with a sheet selected.

type Person = {id: string; name: string; role?: string};
const fmtMoney = (ar: boolean, n: number, c: string) => new Intl.NumberFormat(ar ? 'ar-IQ' : 'en-US', {style: 'currency', currency: c, maximumFractionDigits: c === 'IQD' ? 0 : 2}).format(n / (c === 'USD' ? 100 : 1));
const fmtDate = (ar: boolean, s?: string | null, time = false) => s ? new Intl.DateTimeFormat(ar ? 'ar-IQ' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric', ...(time ? {hour: '2-digit', minute: '2-digit'} : {}), timeZone: 'Asia/Baghdad'}).format(new Date(s.length === 10 ? s + 'T12:00:00Z' : s)) : '—';

function SheetHead({ar, title, me}: {ar: boolean; title: string; me: Person}) {
  const t = (en: string, a: string) => ar ? a : en;
  return <div className="sheet-head">
    <div className="sheet-brand"><b>qist</b><span>قسط</span></div>
    <div className="sheet-title"><h1>{title}</h1><small>{t('Printed','طُبع في')} {fmtDate(ar, new Date().toISOString(), true)} · {t('by','بواسطة')} {me.name}</small></div>
  </div>;
}

export function ContractSheet({ar, contract: c, buyer, rows, entries, people, me, day}: {ar: boolean; contract: any; buyer: any; rows: any[]; entries: any[]; people: Person[]; me: Person; day: string}) {
  const t = (en: string, a: string) => ar ? a : en;
  const money = (n: number) => fmtMoney(ar, n, c.currency);
  const name = (id?: string | null) => people.find(p => p.id === id)?.name || (id ? id : t('Unassigned', 'غير مخصص'));
  const left = (i: any) => i.closed_at ? 0 : i.amount - (i.paid || 0);
  const open = rows.filter(i => left(i) > 0), late = open.filter(i => i.due < day);
  const fullyPaid = rows.filter(i => !i.closed_at && left(i) === 0).length, carried = rows.filter(i => i.closed_at).length;
  const remaining = open.reduce((n, i) => n + left(i), 0), next = open[0];
  const paidTotal = rows.reduce((n, i) => n + (i.paid || 0), 0);
  const status = remaining === 0 ? t('Settled', 'مسدد') : late.length ? t('Overdue', 'متأخر') : t('Active', 'نشط');
  const cols = rows.length <= 24 ? 1 : rows.length <= 60 ? 2 : 3;
  const per = Math.ceil(rows.length / cols);
  const chunks = Array.from({length: cols}, (_, k) => rows.slice(k * per, (k + 1) * per));
  const active = (i: any) => entries.filter(e => e.installment_id === i.id && !e.voided_at);
  const numberOf = (id: string) => rows.find(x => x.id === id)?.number;
  const state = (i: any) => {
    if (i.closed_at) return `${t('Not paid', 'غير مدفوع')} → #${rows.find(x => x.carry_of === i.id)?.number ?? '?'}`;
    if (left(i) === 0) return fmtDate(ar, i.last_paid_at);
    if (i.paid > 0) return `${t('Partial', 'جزئي')} · ${t('left', 'متبقٍ')} ${money(left(i))}`;
    return i.due < day ? t('Overdue', 'متأخر') : t('Due', 'مستحق');
  };
  const field = (k: string, v: React.ReactNode) => <div className="sheet-field"><span>{k}</span><b>{v}</b></div>;

  return <div className={'print-sheet contract-sheet cols-' + cols} dir={ar ? 'rtl' : 'ltr'}>
    <SheetHead ar={ar} me={me} title={t('Installment contract statement', 'كشف عقد أقساط')}/>
    <div className="sheet-parties">
      <section><h2>{t('Customer', 'العميل')}</h2>{field(t('Name', 'الاسم'), buyer.name)}{field(t('Customer ID', 'رقم العميل'), c.buyer_id)}{field(t('Phone', 'الهاتف'), buyer.phone || '—')}</section>
      <section><h2>{t('Manager', 'المدير')}</h2>{field(t('Name', 'الاسم'), name(buyer.owner_id))}{field(t('Contract created by', 'أنشأ العقد'), c.created_by ? name(c.created_by) : '—')}{field(t('Created on', 'تاريخ الإنشاء'), fmtDate(ar, c.created))}</section>
      <section><h2>{t('Contract', 'العقد')}</h2>{field(t('Contract ID', 'رقم العقد'), c.id)}{field(t('Product', 'المنتج'), c.product)}{field(t('Term', 'المدة'), `${c.months} ${t('months', 'شهراً')} · ${t('every', 'كل')} ${c.period} ${t('month(s)', 'شهر')}`)}</section>
    </div>
    <div className="sheet-summary">
      {field(t('Overall price', 'السعر الكلي'), money(c.total))}
      {field(t('Initial payment', 'المقدمة'), money(c.initial))}
      {field(t('Financed', 'المبلغ المقسط'), money(c.total - c.initial))}
      {field(t('Paid in installments', 'المدفوع من الأقساط'), money(paidTotal))}
      {field(t('Remaining', 'المتبقي'), money(remaining))}
      {field(t('Installments fully paid', 'أقساط مسددة بالكامل'), `${fullyPaid} / ${rows.length}`)}
      {field(t('Overdue', 'المتأخر'), late.length ? `${late.length} · ${money(late.reduce((n, i) => n + left(i), 0))}` : '—')}
      {field(t('Next due', 'القسط القادم'), next ? `${fmtDate(ar, next.due)} · ${money(left(next))}` : '—')}
      {field(t('Status', 'الحالة'), status + (carried ? ` · ${carried} ${t('carried', 'مرحّل')}` : ''))}
    </div>
    <h2 className="sheet-section">{t('Installment schedule and payment history', 'جدول الأقساط وسجل الدفعات')}</h2>
    <div className="sheet-tables">{chunks.map((list, k) => <table key={k}>
      <thead><tr><th>#</th><th>{t('Due', 'الاستحقاق')}</th><th>{t('Amount', 'المبلغ')}</th><th>{t('Paid', 'المدفوع')}</th><th>{t('Status / paid on', 'الحالة / تاريخ الدفع')}</th>{cols < 3 && <th>{t('Receipts', 'الإيصالات')}</th>}{cols < 3 && <th>{t('Received by', 'المستلم')}</th>}</tr></thead>
      <tbody>{list.map(i => <tr key={i.id} className={i.closed_at ? 'carried' : left(i) === 0 ? 'paid' : i.due < day ? 'late' : ''}>
        <td>{i.number}{i.carry_of && <span className="carry-mark"> ←{numberOf(i.carry_of)}</span>}</td><td>{fmtDate(ar, i.due)}</td><td className="num">{money(i.amount)}</td>
        <td className="num">{i.paid ? money(i.paid) : '—'}</td><td>{state(i)}</td>
        {cols < 3 && <td>{active(i).map(e => e.id).join(', ') || '—'}</td>}
        {cols < 3 && <td>{[...new Set(active(i).map(e => name(e.paid_by)))].join(', ') || '—'}</td>}
      </tr>)}</tbody>
    </table>)}</div>
    <div className="sheet-sign">
      <div><span>{t('Manager signature', 'توقيع المدير')}</span><i/></div>
      <div><span>{t('Customer signature', 'توقيع العميل')}</span><i/></div>
    </div>
    <p className="sheet-note">{t('Initial payment is treated as received. "Not paid → #n": the unpaid part of that month was moved to installment n at the end. Amounts in', 'تُعد المقدمة مستلمة. "غير مدفوع ← #n": نُقل الجزء غير المدفوع من ذلك الشهر إلى القسط n في نهاية الجدول. المبالغ بعملة')} {c.currency}. {t('Dates in Baghdad time.', 'التواريخ بتوقيت بغداد.')}</p>
  </div>;
}

export const ACTIONS: Record<string, [string, string]> = {
  setup: ['Engineer account created', 'إنشاء حساب المهندس'],
  login: ['Signed in', 'تسجيل دخول'],
  login_failed: ['Failed sign-in', 'محاولة دخول فاشلة'],
  logout: ['Signed out', 'تسجيل خروج'],
  user_created: ['User created', 'إنشاء مستخدم'],
  user_updated: ['User updated', 'تعديل مستخدم'],
  password_reset: ['Password reset', 'إعادة تعيين كلمة المرور'],
  password_changed: ['Password changed', 'تغيير كلمة المرور'],
  plan_created: ['Contract created', 'إنشاء عقد'],
  payment_recorded: ['Payment recorded', 'تسجيل دفعة'],
  data_assigned: ['Customers assigned', 'تخصيص العملاء'],
  contract_deleted: ['Contract deleted', 'حذف عقد'],
  payment_reversed: ['Payment reversed', 'إلغاء دفعة'],
  installment_carried: ['Month marked not paid', 'شهر غير مدفوع'],
  installment_reopened: ['“Not paid” undone', 'تراجع عن غير مدفوع'],
};

export function LogSheet({ar, entries, me, filterLabel}: {ar: boolean; entries: any[]; me: Person; filterLabel: string}) {
  const t = (en: string, a: string) => ar ? a : en;
  return <div className="print-sheet log-sheet" dir={ar ? 'rtl' : 'ltr'}>
    <SheetHead ar={ar} me={me} title={t('Activity log', 'سجل النشاط')}/>
    <p className="sheet-note">{filterLabel} · {entries.length} {t('entries', 'سجلاً')}</p>
    <table>
      <thead><tr><th>{t('Time', 'الوقت')}</th><th>{t('User', 'المستخدم')}</th><th>{t('Action', 'الإجراء')}</th><th>{t('Details', 'التفاصيل')}</th></tr></thead>
      <tbody>{entries.map(l => <tr key={l.id}><td>{fmtDate(ar, l.at, true)}</td><td>{l.user_name}</td><td>{ACTIONS[l.action]?.[ar ? 1 : 0] || l.action}</td><td dir="auto">{l.details}</td></tr>)}</tbody>
    </table>
  </div>;
}
