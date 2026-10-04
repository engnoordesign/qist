import {assertSameOrigin,db,fail,hashPassword,HttpError,json,logStatement,newId,password,requireUser,text,username} from '@/lib/server';

// Engineer-only system settings: user accounts, activity log, unassigned records.
export async function GET(req: Request) {
  try {
    await requireUser(req, 'engineer');
    const d = db();
    const [users, log, unassigned] = await d.batch([
      d.prepare(`SELECT u.id,u.username,u.name,u.role,u.active,u.created,
        (SELECT COUNT(*) FROM buyers b WHERE b.owner_id=u.id) AS customers,
        (SELECT COUNT(*) FROM contracts c JOIN buyers b ON b.id=c.buyer_id WHERE b.owner_id=u.id) AS contracts
        FROM users u ORDER BY u.role DESC,u.name`),
      d.prepare('SELECT id,at,user_id,user_name,action,details,contract_id FROM activity_log ORDER BY id DESC LIMIT 2000'),
      d.prepare('SELECT COUNT(*) AS customers,(SELECT COUNT(*) FROM contracts c JOIN buyers b ON b.id=c.buyer_id WHERE b.owner_id IS NULL) AS contracts FROM buyers WHERE owner_id IS NULL'),
    ]);
    return json({users: users.results, log: log.results, unassigned: unassigned.results[0]});
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const me = await requireUser(req, 'engineer'), d = db();
    const b = await req.json() as Record<string, unknown>;
    const role = (v: unknown) => { if (v !== 'engineer' && v !== 'manager') throw new HttpError(400, 'Invalid role'); return v; };
    const target = async () => {
      const u = await d.prepare('SELECT id,username,name,role,active FROM users WHERE id=?').bind(String(b.id)).first<{id: string; username: string; name: string; role: string; active: number}>();
      if (!u) throw new HttpError(404, 'User not found');
      return u;
    };

    if (b.action === 'create-user') {
      const name = text(b.name, 80, 'name'), user = username(b.username), r = role(b.role);
      const {hash, salt} = await hashPassword(password(b.password));
      if (await d.prepare('SELECT 1 FROM users WHERE username=?').bind(user).first()) throw new HttpError(409, 'Username already exists / اسم المستخدم موجود');
      const id = newId('U');
      await d.batch([
        d.prepare('INSERT INTO users (id,username,name,role,password_hash,salt,active,created) VALUES (?,?,?,?,?,?,1,?)').bind(id, user, name, r, hash, salt, new Date().toISOString()),
        logStatement(me, 'user_created', `${name} (${user}) · ${r}`),
      ]);
      return json({ok: true, id});
    }

    if (b.action === 'update-user') {
      const u = await target();
      const name = b.name === undefined ? u.name : text(b.name, 80, 'name');
      const r = b.role === undefined ? u.role : role(b.role);
      const active = b.active === undefined ? u.active : (b.active ? 1 : 0);
      if (u.id === me.id && (r !== 'engineer' || !active)) throw new HttpError(400, 'You cannot demote or disable your own account / لا يمكنك تعطيل حسابك أو تغيير صلاحيته');
      if (u.role === 'engineer' && (r !== 'engineer' || !active)) {
        const others = await d.prepare("SELECT COUNT(*) AS n FROM users WHERE role='engineer' AND active=1 AND id<>?").bind(u.id).first<{n: number}>();
        if (!others?.n) throw new HttpError(400, 'At least one active engineer is required / يجب وجود مهندس فعال واحد على الأقل');
      }
      const changes = [name !== u.name && `name → ${name}`, r !== u.role && `role → ${r}`, active !== u.active && (active ? 'enabled' : 'disabled')].filter(Boolean).join(', ');
      const batch = [d.prepare('UPDATE users SET name=?,role=?,active=? WHERE id=?').bind(name, r, active, u.id), logStatement(me, 'user_updated', `${u.username}: ${changes || 'no change'}`)];
      if (!active || r !== u.role) batch.push(d.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id)); // force re-login
      await d.batch(batch);
      return json({ok: true});
    }

    if (b.action === 'reset-password') {
      const u = await target();
      const {hash, salt} = await hashPassword(password(b.password));
      await d.batch([
        d.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').bind(hash, salt, u.id),
        d.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id),
        logStatement(me, 'password_reset', u.username),
      ]);
      return json({ok: true});
    }

    if (b.action === 'assign-unowned') {
      const u = await target();
      if (!u.active) throw new HttpError(400, 'Choose an active manager / اختر مديراً فعالاً');
      const r = await d.prepare('UPDATE buyers SET owner_id=? WHERE owner_id IS NULL').bind(u.id).run();
      await logStatement(me, 'data_assigned', `${r.meta.changes} customer(s) → ${u.name} (${u.username})`).run();
      return json({ok: true, customers: r.meta.changes});
    }

    throw new HttpError(400, 'Invalid action');
  } catch (e) { return fail(e); }
}
