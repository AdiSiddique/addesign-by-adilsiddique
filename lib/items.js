const { sql } = require('./db');

const CATS = {
  'illustrations': 'Illustrations',
  'freepik': 'Magnific (Freepik)',
  'adobe-stock': 'Adobe Stock',
  'shutterstock': 'Shutterstock',
  'pinterest': 'Pinterest',
  'clients': 'Client Projects',
  'premium': 'Premium'
};
const CAT_IDS = Object.keys(CATS);

function toDateStr(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

function liteOf(row) {
  const images = row.images || [];
  const cover = images[0] ? { src: images[0].t, w: images[0].w, h: images[0].h } : null;
  return {
    id: row.id, cat: row.cat, catName: CATS[row.cat] || row.cat,
    title: row.title, date: toDateStr(row.date), tag: row.tag || '',
    cover: cover, imageCount: images.length, price: row.price || '',
    hasPrompt: !!row.prompt
  };
}

function fullOf(row) {
  return Object.assign(liteOf(row), {
    desc: row.description || '', prompt: row.prompt || '', youtube: row.youtube || '',
    link: row.link || '', buy: row.buy || '', download: row.download || '',
    images: row.images || [], status: row.status
  });
}

async function listPublished(cat, limit) {
  const rows = cat
    ? (await sql`SELECT * FROM items WHERE cat = ${cat} AND status = 'published'
                 ORDER BY date DESC, id DESC LIMIT ${limit || 500}`).rows
    : (await sql`SELECT * FROM items WHERE status = 'published'
                 ORDER BY date DESC, id DESC LIMIT ${limit || 48}`).rows;
  return rows.map(liteOf);
}

async function listAllForAdmin() {
  const { rows } = await sql`SELECT * FROM items ORDER BY created_at DESC`;
  return rows.map(fullOf);
}

async function getPublishedItem(cat, id) {
  const { rows } = await sql`SELECT * FROM items WHERE cat=${cat} AND id=${id}
    AND status='published' LIMIT 1`;
  return rows[0] ? fullOf(rows[0]) : null;
}

async function getAnyItem(cat, id) {
  const { rows } = await sql`SELECT * FROM items WHERE cat=${cat} AND id=${id} LIMIT 1`;
  return rows[0] ? fullOf(rows[0]) : null;
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

async function createItem(data) {
  const cat = data.cat, title = data.title || 'Untitled';
  let id = data.id ? slugify(data.id) : slugify(title) + '-' + Date.now().toString(36);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : new Date().toISOString().slice(0, 10);
  await sql`INSERT INTO items
    (cat, id, title, date, tag, description, prompt, youtube, link, price, buy, download, images, status)
    VALUES (${cat}, ${id}, ${title}, ${date}, ${data.tag || ''}, ${data.desc || ''}, ${data.prompt || ''},
            ${data.youtube || ''}, ${data.link || ''}, ${data.price || ''}, ${data.buy || ''},
            ${data.download || ''}, ${JSON.stringify(data.images || [])}, ${data.status || 'pending'})`;
  return getAnyItem(cat, id);
}

async function updateItem(cat, id, patch) {
  const existing = await getAnyItem(cat, id);
  if (!existing) return null;
  const m = Object.assign({}, existing, patch);
  await sql`UPDATE items SET
    title=${m.title}, date=${m.date}, tag=${m.tag}, description=${m.desc}, prompt=${m.prompt},
    youtube=${m.youtube}, link=${m.link}, price=${m.price}, buy=${m.buy}, download=${m.download},
    images=${JSON.stringify(m.images || [])}, status=${m.status}, updated_at=now()
    WHERE cat=${cat} AND id=${id}`;
  return getAnyItem(cat, id);
}

async function deleteItem(cat, id) {
  await sql`DELETE FROM items WHERE cat=${cat} AND id=${id}`;
}

async function getSettings() {
  const { rows } = await sql`SELECT value FROM settings WHERE key='site' LIMIT 1`;
  return rows[0] ? rows[0].value : { tagline: '', linktree: '', profiles: {} };
}

async function saveSettings(value) {
  await sql`INSERT INTO settings (key, value) VALUES ('site', ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

async function getCategoryVisibility() {
  const { rows } = await sql`SELECT id, visible FROM categories`;
  const map = {};
  CAT_IDS.forEach(c => { map[c] = true; });
  rows.forEach(r => { map[r.id] = r.visible; });
  return map;
}

async function setCategoryVisibility(id, visible) {
  await sql`INSERT INTO categories (id, visible) VALUES (${id}, ${visible})
    ON CONFLICT (id) DO UPDATE SET visible = EXCLUDED.visible`;
}

module.exports = {
  CATS, CAT_IDS, slugify,
  listPublished, listAllForAdmin, getPublishedItem, getAnyItem,
  createItem, updateItem, deleteItem,
  getSettings, saveSettings, getCategoryVisibility, setCategoryVisibility
};
