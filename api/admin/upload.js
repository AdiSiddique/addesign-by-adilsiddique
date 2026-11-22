const sharp = require('sharp');
const { put } = require('@vercel/blob');
const { requireAdmin } = require('../../lib/auth');
const { slugify } = require('../../lib/items');

const THUMB_W = 640, FULL_W = 1600;

// NOTE: Vercel Serverless Functions have a hard 4.5MB request body limit.
// The admin panel resizes images in the browser before sending them here,
// so this limit is rarely hit in practice. It does NOT apply to the
// "download" / "buy" link fields, which stay as plain URLs (same as before).
//
// Auth: newer Blob stores connect via OIDC (BLOB_STORE_ID + the deployment's
// short-lived VERCEL_OIDC_TOKEN, both set automatically on Vercel) instead
// of a long-lived BLOB_READ_WRITE_TOKEN. @vercel/blob's put() resolves
// whichever is available on its own, so either is fine here.
module.exports = async (req, res) => {
  if (requireAdmin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Server is not configured: Blob storage is not attached to this project' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { cat, id, dataBase64, filename } = body || {};
  if (!cat || !id || !dataBase64) {
    return res.status(400).json({ error: '"cat", "id" and "dataBase64" are required' });
  }

  try {
    const commaIdx = dataBase64.indexOf(',');
    const raw = Buffer.from(commaIdx > -1 ? dataBase64.slice(commaIdx + 1) : dataBase64, 'base64');
    const base = slugify((filename || 'image').replace(/\.[^.]+$/, '')) + '-' + Date.now().toString(36);

    const thumbBuf = await sharp(raw).rotate().resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    const fullBuf = await sharp(raw).rotate().resize({ width: FULL_W, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const meta = await sharp(thumbBuf).metadata();

    const prefix = `media/${cat}/${id}/${base}`;
    const [thumb, full] = await Promise.all([
      put(`${prefix}-t.webp`, thumbBuf, { access: 'public', contentType: 'image/webp' }),
      put(`${prefix}-f.webp`, fullBuf, { access: 'public', contentType: 'image/webp' })
    ]);

    res.status(200).json({ t: thumb.url, f: full.url, w: meta.width, h: meta.height });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
};
