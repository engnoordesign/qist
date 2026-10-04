import {nextDue,schedule} from '@/lib/ledger';
import {assertSameOrigin,db,fail,HttpError,json,logStatement,newId,requireUser,text,type SessionUser} from '@/lib/server';

const fmt = (units: number, currency: string) => (currency === 'USD' ? (units / 100).toFixed(2) : String(units)) + ' ' + currency;
const ACTIVE_PAID = '(SELECT COALESCE(SUM(e.amount),0) FROM payment_entries e WHERE e.installment_id=i.id AND e.voided_at IS NULL)';

type Inst = {id: string; number: number; amount: number; due: string; contract_id: string; closed_at: string | null; carry_of: string | null; paid: number; currency: string; period: number; start: string; owner_id: string | null};

/** Loads an installment with its paid total and checks the user may act on it. */
async function loadInstallment(d: D1Database, user: SessionUser, id: unknown) {
  if (typeof id !== 'string') throw new HttpError(400, 'Invalid installment');
  const inst = await d.prepare(`SELECT i.id,i.number,i.amount,i.due,i.contract_id,i.closed_at,i.carry_of,${ACTIVE_PAID} AS paid,c.currency,c.period,c.start,bu.owner_id
      FROM installments i JOIN contracts c ON c.id=i.contract_id JOIN buyers bu ON bu.id=c.buyer_id WHERE i.id=?`).bind(id).first<Inst>();
  if (!inst || (user.role !== 'engineer' && inst.owner_id !== user.id)) throw new HttpError(404, 'Installment not found / القسط غير موجود');
  return inst;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req), d = db();
    const eng = user.role === 'engineer';
    // Managers only ever receive their own customers and contracts.
    const own = 'SELECT id FROM buyers WHERE owner_id=?1';
    const ownContracts = `SELECT id FROM contracts WHERE buyer_id IN (${own})`;
    const scope = (sql: string) => { const s = d.prepare(sql); return eng ? s : s.bind(user.id); };
    const [buyers, contracts, installments, entries, people] = await d.batch([
      scope(`SELECT * FROM buyers ${eng ? '' : 'WHERE owner_id=?1'} ORDER BY name`),
      scope(`SELECT * FROM contracts ${eng ? '' : `WHERE buyer_id IN (${own})`} ORDER BY created DESC`),
      scope(`SELECT i.*,${ACTIVE_PAID} AS paid,(SELECT MAX(e.paid_at) FROM payment_entries e WHERE e.installment_id=i.id AND e.voided_at IS NULL) AS last_paid_at
        FROM installments i ${eng ? '' : `WHERE i.contract_id IN (${ownContracts})`} ORDER BY i.due,i.number`),
      scope(`SELECT e.* FROM payment_entries e JOIN installments i ON i.id=e.installment_id ${eng ? '' : `WHERE i.contract_id IN (${ownContracts})`} ORDER BY e.paid_at`),
      eng ? d.prepare('SELECT id,name,role,active FROM users ORDER BY name')
        : d.prepare(`SELECT id,name,role,active FROM users WHERE id=?1 OR id IN (SELECT created_by FROM contracts WHERE id IN (${ownContracts}))
            OR id IN (SELECT e.paid_by FROM payment_entries e JOIN installments i ON i.id=e.installment_id WHERE i.contract_id IN (${ownContracts}))
            OR id IN (SELECT e.voided_by FROM payment_entries e JOIN installments i ON i.id=e.installment_id WHERE i.contract_id IN (${ownContracts}))
            OR id IN (SELECT i.closed_by FROM installments i WHERE i.contract_id IN (${ownContracts}))`).bind(user.id),
    ]);
    return json({me: user, buyers: buyers.results, contracts: contracts.results, installments: installments.results, entries: entries.results, people: people.results});
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req), d = db();
    const b = await req.json() as Record<string, any>;
    const units = (v: unknown, currency: string) => {
      const n = Number(v), u = n * (currency === 'USD' ? 100 : 1);
      if (!Number.isFinite(n) || n <= 0 || n > 1e12 || Math.abs(u - Math.round(u)) > 0.0001) throw new HttpError(400, 'Invalid amount / مبلغ غير صالح');
      return Math.round(u);
    };

    if (b.action === 'pay') {
      // Full or partial payment against one installment. Never more than what is left on it.
      const inst = await loadInstallment(d, user, b.id);
      if (inst.closed_at) throw new HttpError(409, 'This month was closed as not paid. Pay the carried installment instead / هذا الشهر مغلق، ادفع القسط المرحّل');
      const left = inst.amount - inst.paid;
      if (left <= 0) throw new HttpError(409, 'Already paid / القسط مسدد مسبقاً');
      const amount = b.amount === undefined || b.amount === '' ? left : units(b.amount, inst.currency);
      if (amount > left) throw new HttpError(400, `Amount is more than the ${fmt(left, inst.currency)} left on this installment / المبلغ أكبر من المتبقي على القسط`);
      const receipt = 'R-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      const r = await d.prepare(`INSERT INTO payment_entries (id,installment_id,amount,paid_at,paid_by) SELECT ?,i.id,?,?,? FROM installments i
          WHERE i.id=? AND i.closed_at IS NULL AND ? <= i.amount-${ACTIVE_PAID}`)
        .bind(receipt, amount, new Date().toISOString(), user.id, inst.id, amount).run();
      if (!r.meta.changes) return json({error: 'This installment changed. Refresh and try again / تغير القسط، حدّث الصفحة'}, 409);
      const kind = amount < left ? 'partial' : 'full';
      await logStatement(user, 'payment_recorded', `${inst.contract_id} · #${inst.number} · ${fmt(amount, inst.currency)} (${kind}) · ${receipt}`, inst.contract_id).run();
      return json({ok: true, receipt, remaining: left - amount});
    }

    if (b.action === 'void') {
      // Reverse a payment recorded by mistake. The entry is kept (marked reversed) for the audit trail.
      if (typeof b.id !== 'string') throw new HttpError(400, 'Invalid payment');
      const entry = await d.prepare('SELECT id,installment_id,amount,voided_at FROM payment_entries WHERE id=?').bind(b.id).first<{id: string; installment_id: string; amount: number; voided_at: string | null}>();
      if (!entry) throw new HttpError(404, 'Payment not found / الدفعة غير موجودة');
      const inst = await loadInstallment(d, user, entry.installment_id);
      if (entry.voided_at) throw new HttpError(409, 'Already reversed / تم إلغاء الدفعة مسبقاً');
      if (inst.closed_at) throw new HttpError(409, 'Reopen this month first (undo “not paid”) / أعد فتح الشهر أولاً');
      const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 200) : '';
      const r = await d.prepare('UPDATE payment_entries SET voided_at=?,voided_by=?,void_reason=? WHERE id=? AND voided_at IS NULL AND installment_id IN (SELECT id FROM installments WHERE closed_at IS NULL)')
        .bind(new Date().toISOString(), user.id, reason || null, entry.id).run();
      if (!r.meta.changes) return json({error: 'This payment changed. Refresh and try again / تغيرت الدفعة، حدّث الصفحة'}, 409);
      await logStatement(user, 'payment_reversed', `${inst.contract_id} · #${inst.number} · ${fmt(entry.amount, inst.currency)} · ${entry.id}${reason ? ' · ' + reason : ''}`, inst.contract_id).run();
      return json({ok: true});
    }

    if (b.action === 'carry') {
      // Close a month as not (fully) paid and add its unpaid part as a new installment at the end.
      const inst = await loadInstallment(d, user, b.id);
      if (inst.closed_at) throw new HttpError(409, 'Already closed / الشهر مغلق مسبقاً');
      const left = inst.amount - inst.paid;
      if (left <= 0) throw new HttpError(409, 'Nothing left to carry, this month is paid / لا يوجد مبلغ متبقٍ');
      const last = await d.prepare('SELECT MAX(number) AS n,MAX(due) AS due FROM installments WHERE contract_id=?').bind(inst.contract_id).first<{n: number; due: string}>();
      const number = (last?.n || 0) + 1, due = nextDue(last!.due, inst.period, inst.start), newIdText = `${inst.contract_id}-${number}`;
      const now = new Date().toISOString();
      await d.batch([
        d.prepare(`UPDATE installments SET closed_at=?,closed_by=? WHERE id=? AND closed_at IS NULL AND ${ACTIVE_PAID.replaceAll('i.id', 'installments.id')}=?`).bind(now, user.id, inst.id, inst.paid),
        d.prepare('INSERT INTO installments (id,contract_id,number,due,amount,carry_of) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM installments WHERE id=? AND closed_at=? AND closed_by=?)')
          .bind(newIdText, inst.contract_id, number, due, left, inst.id, inst.id, now, user.id),
        logStatement(user, 'installment_carried', `${inst.contract_id} · #${inst.number} not paid · ${fmt(left, inst.currency)} → #${number} due ${due}`, inst.contract_id),
      ]);
      const check = await d.prepare('SELECT 1 FROM installments WHERE id=?').bind(newIdText).first();
      if (!check) return json({error: 'This installment changed. Refresh and try again / تغير القسط، حدّث الصفحة'}, 409);
      return json({ok: true, id: newIdText, number, due});
    }

    if (b.action === 'reopen') {
      // Undo "not paid": remove the carried installment (only if nothing was paid on it) and reopen the month.
      const inst = await loadInstallment(d, user, b.id);
      if (!inst.closed_at) throw new HttpError(409, 'This month is not closed / الشهر غير مغلق');
      const carried = await d.prepare(`SELECT i.id,i.number,i.closed_at,${ACTIVE_PAID} AS paid FROM installments i WHERE i.carry_of=?`).bind(inst.id).first<{id: string; number: number; closed_at: string | null; paid: number}>();
      if (carried && (carried.paid > 0 || carried.closed_at)) throw new HttpError(409, `Installment #${carried.number} already has payments or was carried again. Undo those first / القسط المرحّل عليه دفعات، ألغها أولاً`);
      const batch = [];
      if (carried) {
        batch.push(d.prepare('DELETE FROM payment_entries WHERE installment_id=? AND voided_at IS NOT NULL').bind(carried.id));
        batch.push(d.prepare(`DELETE FROM installments WHERE id=? AND closed_at IS NULL AND NOT EXISTS (SELECT 1 FROM payment_entries WHERE installment_id=? AND voided_at IS NULL)`).bind(carried.id, carried.id));
      }
      batch.push(d.prepare('UPDATE installments SET closed_at=NULL,closed_by=NULL WHERE id=?').bind(inst.id));
      batch.push(logStatement(user, 'installment_reopened', `${inst.contract_id} · #${inst.number}${carried ? ` · removed #${carried.number}` : ''}`, inst.contract_id));
      await d.batch(batch);
      return json({ok: true});
    }

    if (b.action === 'delete') {
      if (typeof b.id !== 'string') throw new HttpError(400, 'Invalid contract');
      const c = await d.prepare(`SELECT c.id,c.product,c.currency,c.total,bu.name AS buyer,bu.owner_id,
          (SELECT COUNT(*) FROM installments i WHERE i.contract_id=c.id) AS n,
          (SELECT COALESCE(SUM(e.amount),0) FROM payment_entries e JOIN installments i ON i.id=e.installment_id WHERE i.contract_id=c.id AND e.voided_at IS NULL) AS paid
        FROM contracts c JOIN buyers bu ON bu.id=c.buyer_id WHERE c.id=?`).bind(b.id)
        .first<{id: string; product: string; currency: string; total: number; buyer: string; owner_id: string | null; n: number; paid: number}>();
      // Managers may delete only contracts in their own list; engineers may delete any.
      if (!c || (user.role !== 'engineer' && c.owner_id !== user.id)) throw new HttpError(404, 'Contract not found / العقد غير موجود');
      await d.batch([
        d.prepare('DELETE FROM payment_entries WHERE installment_id IN (SELECT id FROM installments WHERE contract_id=?)').bind(c.id),
        d.prepare('DELETE FROM installments WHERE contract_id=?').bind(c.id),
        d.prepare('DELETE FROM contracts WHERE id=?').bind(c.id),
        logStatement(user, 'contract_deleted', `${c.id} · ${c.buyer} · ${c.product} · ${fmt(c.total, c.currency)} · ${fmt(c.paid, c.currency)} paid in installments`, c.id),
      ]);
      return json({ok: true});
    }

    if (b.action !== 'create') throw new HttpError(400, 'Invalid action');

    // Every customer belongs to exactly one manager (their private list).
    let ownerId = user.id;
    if (user.role === 'engineer' && b.ownerId) {
      const owner = await d.prepare('SELECT id FROM users WHERE id=? AND active=1').bind(String(b.ownerId)).first();
      if (!owner) throw new HttpError(400, 'Choose an active manager / اختر مديراً فعالاً');
      ownerId = String(b.ownerId);
    }

    const product = text(b.product, 160, 'product');
    if (!['USD', 'IQD'].includes(b.currency)) throw new HttpError(400, 'Invalid currency');
    const factor = b.currency === 'USD' ? 100 : 1;
    const money = (v: unknown) => {
      const n = Number(v), u = n * factor;
      if (!Number.isFinite(n) || n < 0 || n > 1e12 || Math.abs(u - Math.round(u)) > 0.0001) throw new HttpError(400, 'Invalid amount / مبلغ غير صالح');
      return Math.round(u);
    };
    const total = money(b.total), initial = money(b.initial);
    if (total <= initial) throw new HttpError(400, 'Price must exceed initial payment / السعر يجب أن يتجاوز المقدمة');
    const rows = schedule(b.start, Number(b.months), Number(b.period), total - initial, b.amount ? money(b.amount) : undefined);

    const id = newId('D');
    let buyerId = b.buyerId as string | undefined, buyerName: string;
    const batch: D1PreparedStatement[] = [];
    if (buyerId) {
      const existing = await d.prepare('SELECT id,name FROM buyers WHERE id=? AND owner_id=?').bind(String(buyerId), ownerId).first<{name: string}>();
      if (!existing) throw new HttpError(400, 'Customer not found for this manager / العميل غير موجود لدى هذا المدير');
      buyerName = existing.name;
    } else {
      buyerId = newId('B');
      buyerName = text(b.name, 120, 'customer name');
      batch.push(d.prepare('INSERT INTO buyers (id,name,phone,owner_id) VALUES (?,?,?,?)').bind(buyerId, buyerName, String(b.phone || '').slice(0, 40), ownerId));
    }
    batch.push(d.prepare('INSERT INTO contracts (id,buyer_id,product,currency,total,initial,months,period,start,created,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, buyerId, product, b.currency, total, initial, Number(b.months), Number(b.period), b.start, new Date().toISOString(), user.id));
    for (const r of rows) batch.push(d.prepare('INSERT INTO installments (id,contract_id,number,due,amount) VALUES (?,?,?,?,?)').bind(id + '-' + r.number, id, r.number, r.due, r.amount));
    batch.push(logStatement(user, 'plan_created', `${id} · ${buyerName} · ${product} · ${fmt(total, b.currency)}`, id));
    await d.batch(batch);
    return json({ok: true, id, buyerId});
  } catch (e) { return fail(e); }
}
