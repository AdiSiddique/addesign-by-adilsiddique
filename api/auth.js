const crypto = require('crypto');
const { isAdmin, setAuthCookie, clearAuthCookie } = require('../lib/auth');

// Merges what used to be api/auth/login.js, logout.js and session.js into one
// function, so this project uses fewer of the Hobby plan's 12 functions.
// Routed as /api/auth?action=login|logout|session (see vercel.json rewrites).
module.exports = async (req, res) => {
  const action = req.query.action;

  if (action === 'session') {
    return res.status(200).json({ loggedIn: isAdmin(req) });
  }

  if (action === 'logout') {
    clearAuthCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const password = (body && body.password) || '';

    if (!process.env.ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ error: 'Server is not configured: ADMIN_PASSWORD_HASH is missing' });
    }
    const hash = crypto.createHash('sha256').update(String(password)).digest('hex');
    if (hash !== process.env.ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    setAuthCookie(res);
    return res.status(200).json({ ok: true });
  }

  res.status(404).json({ error: 'Unknown auth action' });
};
