/*
  addesign site generator
  -----------------------
  content/<category>/<item-folder>/  ->  public/media + public/data

  Har item folder mein: images (jpg/png/webp), info.txt, aur optional download file (zip/ai/eps...).
  Run:  npm run generate     (ya seedha:  npm run go   -> generate + deploy)
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp;
try { sharp = require('sharp'); }
catch (e) { console.error('\n[!] "sharp" install nahi hai. Pehle ye chalao:  npm install\n'); process.exit(1); }

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public');
const MEDIA = path.join(OUT, 'media');
const DATA = path.join(OUT, 'data');
const DLS = path.join(OUT, 'downloads');

const CATS = {
  'illustrations': 'Illustrations',
  'freepik': 'Magnific (Freepik)',
  'adobe-stock': 'Adobe Stock',
  'shutterstock': 'Shutterstock',
  'pinterest': 'Pinterest',
  'clients': 'Client Projects',
  'premium': 'Premium'
};

const IMG = /\.(jpe?g|png|webp)$/i;
const FILE = /\.(zip|rar|7z|ai|eps|psd|svg|pdf)$/i;
const THUMB_W = 640, FULL_W = 1600;

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const rmrf = p => fs.rmSync(p, { recursive: true, force: true });
const today = () => new Date().toISOString().slice(0, 10);

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
    if (key === 'prompt') {               // prompt: ke baad sab kuch prompt hai (multi-line)
      out.prompt = [m[2], ...lines.slice(i + 1)].join('\n').trim();
      break;
    }
    out[key] = m[2].trim();
  }
  return out;
}

function prune(dir, keep) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) if (!keep.has(f)) rmrf(path.join(dir, f));
}

async function makeImage(src, dir, base, urlBase) {
  const st = fs.statSync(src);
  const h = crypto.createHash('sha1').update(st.size + ':' + Math.round(st.mtimeMs)).digest('hex').slice(0, 6);
  const tName = `${base}-${h}-t.webp`;
  const fName = `${base}-${h}-f.webp`;
  const tPath = path.join(dir, tName), fPath = path.join(dir, fName);
  if (!fs.existsSync(tPath)) {
    await sharp(src).rotate().resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 72 }).toFile(tPath);
  }
  if (!fs.existsSync(fPath)) {
    await sharp(src).rotate().resize({ width: FULL_W, withoutEnlargement: true }).webp({ quality: 82 }).toFile(fPath);
  }
  const meta = await sharp(tPath).metadata();
  return { t: `${urlBase}/${tName}`, f: `${urlBase}/${fName}`, w: meta.width, h: meta.height, names: [tName, fName] };
}

async function main() {
  mkdir(MEDIA); mkdir(DLS);
  rmrf(DATA); mkdir(DATA);

  const all = [];
  const perCat = {};

  for (const cat of Object.keys(CATS)) {
    perCat[cat] = [];
    const catDir = path.join(CONTENT, cat);
    mkdir(catDir);
    const folders = fs.readdirSync(catDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map(d => d.name);

    const seen = new Set();
    for (const folder of folders) {
      const id = slug(folder);
      if (!id || seen.has(id)) { console.warn(`[!] Skip: "${cat}/${folder}" (naam sahi nahi ya duplicate)`); continue; }
      seen.add(id);

      const src = path.join(catDir, folder);
      const files = fs.readdirSync(src).filter(f => fs.statSync(path.join(src, f)).isFile());
      const imgs = files.filter(f => IMG.test(f)).sort(natural);
      if (!imgs.length) { console.warn(`[!] Skip: "${cat}/${folder}" mein koi image nahi`); continue; }

      const info = parseInfo(path.join(src, 'info.txt'));
      const mediaDir = path.join(MEDIA, cat, id);
      mkdir(mediaDir);
      const keep = new Set();
      const images = [];
      for (let i = 0; i < imgs.length; i++) {
        const base = String(i + 1).padStart(2, '0');
        const r = await makeImage(path.join(src, imgs[i]), mediaDir, base, `/media/${cat}/${id}`);
        r.names.forEach(n => keep.add(n));
        images.push({ t: r.t, f: r.f, w: r.w, h: r.h });
      }
      prune(mediaDir, keep);

      // Downloads (premium ki files kabhi public folder mein copy nahi hoti)
      let download = info.download || '';
      const dlFiles = files.filter(f => FILE.test(f)).sort(natural);
      const dlDir = path.join(DLS, cat, id);
      if (cat === 'premium') {
        if (dlFiles.length) console.warn(`[!] premium/${folder}: local files copy nahi hui (paid files public nahi honi chahiye). Buy link use karo.`);
        rmrf(dlDir);
      } else if (dlFiles.length) {
        mkdir(dlDir);
        const dkeep = new Set();
        for (const f of dlFiles) {
          const to = path.join(dlDir, f);
          const s = fs.statSync(path.join(src, f));
          if (!fs.existsSync(to) || fs.statSync(to).size !== s.size) fs.copyFileSync(path.join(src, f), to);
          dkeep.add(f);
        }
        prune(dlDir, dkeep);
        if (!download) download = `/downloads/${cat}/${id}/${encodeURIComponent(dlFiles[0])}`;
      } else {
        rmrf(dlDir);
      }

      const date = /^\d{4}-\d{2}-\d{2}$/.test(info.date || '') ? info.date : today();
      const item = {
        id, cat, catName: CATS[cat],
        title: info.title || folder.replace(/[-_]+/g, ' '),
        date,
        tag: info.tag || '',
        desc: info.desc || '',
        prompt: info.prompt || '',
        youtube: info.youtube || '',
        link: info.link || '',
        price: info.price || '',
        buy: info.buy || '',
        download,
        images,
        cover: { src: images[0].t, w: images[0].w, h: images[0].h }
      };

      const itemDir = path.join(DATA, 'items', cat);
      mkdir(itemDir);
      fs.writeFileSync(path.join(itemDir, id + '.json'), JSON.stringify(item));

      const lite = {
        id, cat, catName: item.catName, title: item.title, date, tag: item.tag,
        cover: item.cover, imageCount: images.length, price: item.price, hasPrompt: !!item.prompt
      };
      perCat[cat].push(lite);
      all.push(lite);
    }

    // purane (delete kiye hue) items ka media/downloads saaf
    prune(path.join(MEDIA, cat), new Set(seen));
    prune(path.join(DLS, cat), new Set(seen));
  }

  const byNew = (a, b) => (b.date.localeCompare(a.date)) || natural(b.id, a.id);
  const meta = {};
  for (const cat of Object.keys(CATS)) {
    perCat[cat].sort(byNew);
    fs.writeFileSync(path.join(DATA, cat + '.json'), JSON.stringify(perCat[cat]));
    meta[cat] = perCat[cat].length;
  }
  all.sort(byNew);
  fs.writeFileSync(path.join(DATA, 'latest.json'), JSON.stringify(all.slice(0, 48)));
  fs.writeFileSync(path.join(DATA, 'meta.json'), JSON.stringify({ counts: meta, total: all.length, built: new Date().toISOString() }));

  console.log('\nDone. Items per category:');
  for (const [k, v] of Object.entries(meta)) console.log(`  ${CATS[k].padEnd(20)} ${v}`);
  console.log(`  ${'TOTAL'.padEnd(20)} ${all.length}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
