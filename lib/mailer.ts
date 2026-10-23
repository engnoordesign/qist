import {connect} from 'cloudflare:sockets';

// Minimal SMTP client for Cloudflare Workers (TCP sockets). Used with Gmail on port 465 (implicit TLS).
export type SmtpConfig = {host: string; port: number; user: string; pass: string; fromName: string};
export type Mail = {to: string; subject: string; text: string; html: string};

const enc = new TextEncoder();

export function b64(s: string) {
  const bytes = enc.encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const wrap = (s: string) => (s.match(/.{1,76}/g) || ['']).join('\r\n');
/** RFC 2047 encoded words, split so each stays short. */
function encodeHeader(s: string) {
  if (/^[\x20-\x7e]*$/.test(s) && s.length < 70) return s;
  const chars = Array.from(s), parts: string[] = [];
  for (let i = 0; i < chars.length; i += 30) parts.push(`=?UTF-8?B?${b64(chars.slice(i, i + 30).join(''))}?=`);
  return parts.join('\r\n ');
}

export function buildMessage(cfg: SmtpConfig, m: Mail) {
  const boundary = 'qist-' + crypto.randomUUID();
  const domain = cfg.user.split('@')[1] || 'qist.local';
  return [
    `From: ${encodeHeader(cfg.fromName.replace(/["\r\n]/g, ''))} <${cfg.user}>`,
    `To: <${m.to}>`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(m.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(m.html)),
    `--${boundary}--`,
  ].join('\r\n');
}

type Sock = ReturnType<typeof connect>;

class Session {
  private buf = '';
  private dec = new TextDecoder();
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  constructor(private socket: Sock) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }
  private async reply() {
    const lines: string[] = [];
    for (;;) {
      let nl: number;
      while ((nl = this.buf.indexOf('\r\n')) < 0) {
        const {value, done} = await this.reader.read();
        if (done) throw new Error('SMTP connection closed');
        this.buf += this.dec.decode(value, {stream: true});
      }
      const line = this.buf.slice(0, nl);
      this.buf = this.buf.slice(nl + 2);
      lines.push(line);
      if (/^\d{3}( |$)/.test(line)) return {code: Number(line.slice(0, 3)), text: lines.join(' ')};
    }
  }
  async cmd(line: string | null, expect: number[]) {
    if (line !== null) await this.writer.write(enc.encode(line + '\r\n'));
    const r = await this.reply();
    if (!expect.includes(r.code)) throw new Error(`SMTP ${r.text.slice(0, 220)}`);
    return r;
  }
  async close() {
    try { await this.writer.write(enc.encode('QUIT\r\n')); } catch {}
    try { await this.socket.close(); } catch {}
  }
}

/** Sends every mail over one connection. Returns null for each mail sent, or its error message. */
export async function sendMail(cfg: SmtpConfig, mails: Mail[], connectFn: typeof connect = connect): Promise<(string | null)[]> {
  const results: (string | null)[] = mails.map(() => 'Not sent');
  if (!mails.length) return results;
  const socket = connectFn({hostname: cfg.host, port: cfg.port}, {secureTransport: cfg.port === 465 ? 'on' : 'off', allowHalfOpen: false});
  const s = new Session(socket);
  const run = async () => {
    await s.cmd(null, [220]);
    await s.cmd('EHLO qist', [250]);
    try {
      await s.cmd('AUTH PLAIN ' + b64('\0' + cfg.user + '\0' + cfg.pass), [235]);
    } catch (e) {
      throw new Error('Gmail rejected the sign-in. Check the Gmail address and use a Google App Password / رفض Gmail تسجيل الدخول: تحقق من العنوان واستخدم كلمة مرور التطبيق' + (e instanceof Error ? ` (${e.message})` : ''));
    }
    for (let i = 0; i < mails.length; i++) {
      try {
        await s.cmd(`MAIL FROM:<${cfg.user}>`, [250]);
        await s.cmd(`RCPT TO:<${mails[i].to}>`, [250, 251]);
        await s.cmd('DATA', [354]);
        await s.cmd(buildMessage(cfg, mails[i]).replace(/\r\n\./g, '\r\n..') + '\r\n.', [250]);
        results[i] = null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results[i] = msg;
        if (/connection closed/i.test(msg)) throw e;
        await s.cmd('RSET', [250]);
      }
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([run(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Email server did not answer in time / لم يستجب خادم البريد')), 20000 + 2500 * mails.length); })]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    for (let i = 0; i < results.length; i++) if (results[i] === 'Not sent') results[i] = msg;
  } finally {
    clearTimeout(timer);
    await s.close();
  }
  return results;
}
