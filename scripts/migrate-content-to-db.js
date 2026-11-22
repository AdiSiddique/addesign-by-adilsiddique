/*
  One-time migration: content/<cat>/<folder>/ (+ images)  ->  Postgres + Vercel Blob

  Run locally, once, after:
    1. npm install
    2. vercel env pull .env.development.local   (pulls DATABASE_URL / Blob credentials)
  Then:
    npm run db:migrate

  Sample folders (sample-...) are skipped on purpose - delete them first if you
  haven't already, same as the old build.js workflow told you to.
*/
require('dotenv').config({ path: '.env.development.local' });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { put } = require('@vercel/blob');
const { neon } = require('@neondatabase/serverless');

const hasBlobAuth = process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN;
if (!process.env.DATABASE_URL || !hasBlobAuth) {
  console.error('DATABASE_URL and/or Blob credentials missing - run `vercel env pull .env.development.local` first');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL, { fullResults: true });

const ROOT = __dirname + '/..';
const CONTENT = path.join(ROOT, 'content');
const CATS = ['illustrations', 'freepik', 'adobe-stock', 'shutterstock', 'pinterest', 'clients', 'premium'];
const IMG = /\.(jpe?g|png|webp)$/i;
const THUMB_W = 640, FULL_W = 1600;

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function parseInfo(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'prompt') { out.prompt = [m[2], ...lines.slice(i + 1)].join('\n').trim(); break; }
    out[key] = m[2].trim();
  }
  return out;
}

async function uploadImage(srcPath, cat, id, base) {
  const raw = fs.readFileSync(srcPath);
  const thumbBuf = await sharp(raw).rotate().resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  const fullBuf = await sharp(raw).rotate().resize({ width: FULL_W, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const meta = await sharp(thumbBuf).metadata();
  const prefix = `media/${cat}/${id}/${base}`;
  const [t, f] = await Promise.all([
    put(`${prefix}-t.webp`, thumbBuf, { access: 'public', contentType: 'image/webp' }),
    put(`${prefix}-f.webp`, fullBuf, { access: 'public', contentType: 'image/webp' })
  ]);
  return { t: t.url, f: f.url, w: meta.width, h: meta.height };
}

async function main() {
  let migrated = 0, skipped = 0;
  for (const cat of CATS) {
    const catDir = path.join(CONTENT, cat);
    if (!fs.existsSync(catDir)) continue;
    const folders = fs.readdirSync(catDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.') && !d.name.startsWith('sample-'))
      .map(d => d.name);

    for (const folder of folders) {
      const id = slug(folder);
      const src = path.join(catDir, folder);
      const files = fs.readdirSync(src).filter(f => fs.statSync(path.join(src, f)).isFile());
      const imgs = files.filter(f => IMG.test(f)).sort(natural);
      if (!imgs.length) { console.warn(`[skip] ${cat}/${folder}: no images`); skipped++; continue; }

      console.log(`[migrate] ${cat}/${folder} (${imgs.length} image${imgs.length === 1 ? '' : 's'})...`);
      const info = parseInfo(path.join(src, 'info.txt'));
      const images = [];
      for (let i = 0; i < imgs.length; i++) {
        images.push(await uploadImage(path.join(src, imgs[i]), cat, id, String(i + 1).padStart(2, '0')));
      }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(info.date || '') ? info.date : new Date().toISOString().slice(0, 10);

      await sql`INSERT INTO items (cat, id, title, date, tag, description, prompt, youtube, link, price, buy, download, images, status)
        VALUES (${cat}, ${id}, ${info.title || folder.replace(/[-_]+/g, ' ')}, ${date}, ${info.tag || ''},
                ${info.desc || ''}, ${info.prompt || ''}, ${info.youtube || ''}, ${info.link || ''},
                ${info.price || ''}, ${info.buy || ''}, ${info.download || ''}, ${JSON.stringify(images)}, 'published')
        ON CONFLICT (cat, id) DO UPDATE SET images = EXCLUDED.images, updated_at = now()`;
      migrated++;
    }
  }
  console.log(`\nDone. Migrated ${migrated} item(s), skipped ${skipped}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
