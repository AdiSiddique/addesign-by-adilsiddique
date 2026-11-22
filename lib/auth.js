const crypto = require('crypto');
const COOKIE = 'addesign_admin';
const SEVEN_DAYS = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET env var is not set');
  return s;
}

function b64u(buf) { return Buffer.from(buf).toString('base64url'); }

function sign(payload) {
  const data = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return data + '.' + sig;
}

function verify(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const idx = token.lastIndexOf('.');
  const data = token.slice(0, idx), sig = token.slice(idx + 1);
  let expected;
  try { expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url'); }
  catch (e) { return null; }
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

function getCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setAuthCookie(res) {
  const token = sign({ admin: true, exp: Date.now() + SEVEN_DAYS * 1000 });
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SEVEN_DAYS}`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function isAdmin(req) {
  const session = verify(getCookie(req, COOKIE));
  return !!(session && session.admin);
}

// Call at the top of any admin-only endpoint. Returns true if the request
// was rejected (caller should just `return`); false if it may proceed.
function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return true;
  }
  return false;
}

module.exports = { requireAdmin, isAdmin, setAuthCookie, clearAuthCookie, COOKIE };
