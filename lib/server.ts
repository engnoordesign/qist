import {env} from 'cloudflare:workers';

export type Role = 'engineer' | 'manager';
export type SessionUser = {id: string; username: string; name: string; role: Role};

const COOKIE = 'qist_session';
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers maximum
const enc = new TextEncoder();

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function db(): D1Database {
  const d = env.DB;
  if (!d) throw new HttpError(503, 'Storage unavailable / التخزين غير متاح');
  return d;
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, {status, headers: {'Cache-Control': 'no-store', ...headers}});

export function fail(e: unknown) {
  if (e instanceof HttpError) return json({error: e.message}, e.status);
  console.error(e);
  return json({error: e instanceof Error ? e.message : 'Request failed / تعذر تنفيذ الطلب'}, 400);
}

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array(h.match(/../g)!.map(x => parseInt(x, 16)));
export const newId = (prefix: string) => prefix + '-' + crypto.randomUUID().slice(0, 8).toUpperCase();

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS}, key, 256);
  return {hash: hex(bits), salt: hex(salt)};
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  return equal((await hashPassword(password, salt)).hash, hash);
}

const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Rejects cross-site writes. Works behind proxies (Codespaces, tunnels) where the server's own URL differs from the browser's. */
export function assertSameOrigin(req: Request) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'Forbidden');
  const origin = req.headers.get('origin');
  if (origin && site !== 'same-origin') {
    let host = '';
    try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Forbidden'); }
    const allowed = [new URL(req.url).host, req.headers.get('host'), req.headers.get('x-forwarded-host')];
    if (!allowed.includes(host)) throw new HttpError(403, 'Forbidden');
  }
  if (!(req.headers.get('content-type') || '').includes('application/json')) throw new HttpError(415, 'JSON required');
}

function readCookie(req: Request) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)qist_session=([a-f0-9]{64})/);
  return m ? m[1] : null;
}

function isHttps(req: Request) {
  return new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
}

export async function createSession(req: Request, userId: string) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await db().batch([
    db().prepare('DELETE FROM sessions WHERE expires < ?').bind(now.toISOString()),
    db().prepare('INSERT INTO sessions (token_hash,user_id,expires,created) VALUES (?,?,?,?)').bind(await sha256(token), userId, expires.toISOString(), now.toISOString()),
  ]);
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${isHttps(req) ? '; Secure' : ''}`;
}

export async function endSession(req: Request) {
  const token = readCookie(req);
  if (token) await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(req) ? '; Secure' : ''}`;
}

export async function currentUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;
  return await db().prepare(
    'SELECT u.id,u.username,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1'
  ).bind(await sha256(token), new Date().toISOString()).first<SessionUser>();
}

export async function requireUser(req: Request, role?: Role) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please sign in / يرجى تسجيل الدخول');
  if (role && user.role !== role) throw new HttpError(403, 'Engineer access only / صلاحية المهندس فقط');
  return user;
}

export function logStatement(user: {id?: string | null; name: string}, action: string, details = '', contractId: string | null = null) {
  return db().prepare('INSERT INTO activity_log (at,user_id,user_name,action,details,contract_id) VALUES (?,?,?,?,?,?)')
    .bind(new Date().toISOString(), user.id ?? null, user.name, action, details.slice(0, 500), contractId);
}

export function text(v: unknown, max: number, label = 'field') {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new HttpError(400, `Check ${label} / تحقق من الحقول المطلوبة`);
  return v.trim();
}

export function username(v: unknown) {
  const u = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) throw new HttpError(400, 'Username: 3–32 letters, numbers, . _ - / اسم المستخدم: 3–32 حرفاً إنجليزياً أو رقماً');
  return u;
}

export function password(v: unknown) {
  if (typeof v !== 'string' || v.length < 8 || v.length > 128) throw new HttpError(400, 'Password must be at least 8 characters / كلمة المرور 8 أحرف على الأقل');
  return v;
}
