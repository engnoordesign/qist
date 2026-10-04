import {schedule} from '@/lib/ledger';
import {assertSameOrigin,db,fail,HttpError,json,logStatement,newId,requireUser,text} from '@/lib/server';

const fmt = (units: number, currency: string) => (currency === 'USD' ? (units / 100).toFixed(2) : String(units)) + ' ' + currency;

export async function GET(req: Request) {
  try {
    const user = await requireUser(req), d = db();
    if (user.role === 'engineer') {
      const [buyers, contracts, installments, people] = await d.batch([
        d.prepare('SELECT * FROM buyers ORDER BY name'),
        d.prepare('SELECT * FROM contracts ORDER BY created DESC'),
        d.prepare('SELECT i.*,p.paid_at,p.receipt,p.paid_by FROM installments i LEFT JOIN payments p ON p.installment_id=i.id ORDER BY i.due,i.number'),
        d.prepare('SELECT id,name,role,active FROM users ORDER BY name'),
      ]);
      return json({me: user, buyers: buyers.results, contracts: contracts.results, installments: installments.results, people: people.results});
    }
    // Managers only ever receive their own customers and contracts.
    const own = 'SELECT id FROM buyers WHERE owner_id=?1';
    const ownContracts = `SELECT id FROM contracts WHERE buyer_id IN (${own})`;
    const [buyers, contracts, installments, people] = await d.batch([
      d.prepare('SELECT * FROM buyers WHERE owner_id=?1 ORDER BY name').bind(user.id),
      d.prepare(`SELECT * FROM contracts WHERE buyer_id IN (${own}) ORDER BY created DESC`).bind(user.id),
      d.prepare(`SELECT i.*,p.paid_at,p.receipt,p.paid_by FROM installments i LEFT JOIN payments p ON p.installment_id=i.id WHERE i.contract_id IN (${ownContracts}) ORDER BY i.due,i.number`).bind(user.id),
      d.prepare(`SELECT id,name,role,active FROM users WHERE id=?1 OR id IN (SELECT created_by FROM contracts WHERE id IN (${ownContracts})) OR id IN (SELECT p.paid_by FROM payments p JOIN installments i ON i.id=p.installment_id WHERE i.contract_id IN (${ownContracts}))`).bind(user.id),
    ]);
    return json({me: user, buyers: buyers.results, contracts: contracts.results, installments: installments.results, people: people.results});
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req), d = db();
    const b = await req.json() as Record<string, any>;

    if (b.action === 'pay') {
      if (typeof b.id !== 'string') throw new HttpError(400, 'Invalid installment');
      const inst = await d.prepare('SELECT i.id,i.number,i.amount,i.contract_id,c.currency,bu.owner_id FROM installments i JOIN contracts c ON c.id=i.contract_id JOIN buyers bu ON bu.id=c.buyer_id WHERE i.id=?')
        .bind(b.id).first<{id: string; number: number; amount: number; contract_id: string; currency: string; owner_id: string | null}>();
      if (!inst || (user.role !== 'engineer' && inst.owner_id !== user.id)) throw new HttpError(404, 'Installment not found / القسط غير موجود');
      const receipt = 'R-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      const r = await d.prepare('INSERT INTO payments (installment_id,paid_at,receipt,paid_by) VALUES (?,?,?,?) ON CONFLICT(installment_id) DO NOTHING')
        .bind(inst.id, new Date().toISOString(), receipt, user.id).run();
      if (!r.meta.changes) return json({error: 'Already paid / القسط مسدد مسبقاً'}, 409);
      await logStatement(user, 'payment_recorded', `${inst.contract_id} · #${inst.number} · ${fmt(inst.amount, inst.currency)} · ${receipt}`, inst.contract_id).run();
      return json({ok: true, receipt});
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
      const n = Number(v), units = n * factor;
      if (!Number.isFinite(n) || n < 0 || n > 1e12 || Math.abs(units - Math.round(units)) > 0.0001) throw new HttpError(400, 'Invalid amount / مبلغ غير صالح');
      return Math.round(units);
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
