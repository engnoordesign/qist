import {assertSameOrigin,createSession,currentUser,db,endSession,fail,hashPassword,HttpError,json,logStatement,newId,password,requireUser,text,username,verifyPassword} from '@/lib/server';

const LOCK_ATTEMPTS = 5, LOCK_MINUTES = 15;

export async function GET(req: Request) {
  try {
    const users = await db().prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>();
    return json({needsSetup: !users?.n, user: users?.n ? await currentUser(req) : null});
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await req.json() as Record<string, unknown>;
    const d = db();

    if (b.action === 'setup') {
      // First run only: create the first engineer account.
      const name = text(b.name, 80, 'name'), user = username(b.username), pass = password(b.password);
      const {hash, salt} = await hashPassword(pass);
      const id = newId('U');
      const r = await d.prepare("INSERT INTO users (id,username,name,role,password_hash,salt,active,created) SELECT ?,?,?,'engineer',?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM users)")
        .bind(id, user, name, hash, salt, new Date().toISOString()).run();
      if (!r.meta.changes) throw new HttpError(409, 'Setup already completed / تم الإعداد مسبقاً');
      await logStatement({id, name}, 'setup', `Engineer account created: ${user}`).run();
      return json({ok: true}, 200, {'Set-Cookie': await createSession(req, id)});
    }

    if (b.action === 'login') {
      const user = typeof b.username === 'string' ? b.username.trim().toLowerCase().slice(0, 32) : '';
      const pass = typeof b.password === 'string' ? b.password.slice(0, 128) : '';
      const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
      const failed = await d.prepare("SELECT COUNT(*) AS n FROM activity_log WHERE action='login_failed' AND details=? AND at>?").bind(user, since).first<{n: number}>();
      if ((failed?.n || 0) >= LOCK_ATTEMPTS) throw new HttpError(429, `Too many attempts. Try again in ${LOCK_MINUTES} minutes / محاولات كثيرة، حاول بعد ${LOCK_MINUTES} دقيقة`);
      const row = await d.prepare('SELECT id,name,password_hash,salt,active FROM users WHERE username=?').bind(user).first<{id: string; name: string; password_hash: string; salt: string; active: number}>();
      const ok = row ? await verifyPassword(pass, row.password_hash, row.salt) : (await hashPassword(pass), false);
      if (!row || !ok || !row.active) {
        await logStatement({id: row?.id ?? null, name: row?.name ?? user ?? '?'}, 'login_failed', user).run();
        throw new HttpError(401, 'Wrong username or password / اسم المستخدم أو كلمة المرور غير صحيحة');
      }
      await logStatement({id: row.id, name: row.name}, 'login').run();
      return json({ok: true}, 200, {'Set-Cookie': await createSession(req, row.id)});
    }

    if (b.action === 'logout') {
      const user = await currentUser(req);
      if (user) await logStatement(user, 'logout').run();
      return json({ok: true}, 200, {'Set-Cookie': await endSession(req)});
    }

    if (b.action === 'change-password') {
      const user = await requireUser(req);
      const row = await d.prepare('SELECT password_hash,salt FROM users WHERE id=?').bind(user.id).first<{password_hash: string; salt: string}>();
      if (!row || !(await verifyPassword(String(b.current ?? ''), row.password_hash, row.salt))) throw new HttpError(400, 'Current password is wrong / كلمة المرور الحالية غير صحيحة');
      const {hash, salt} = await hashPassword(password(b.password));
      await d.batch([
        d.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').bind(hash, salt, user.id),
        logStatement(user, 'password_changed'),
      ]);
      return json({ok: true});
    }

    throw new HttpError(400, 'Invalid action');
  } catch (e) { return fail(e); }
}
