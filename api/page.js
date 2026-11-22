const items = require('../lib/items');
const { renderShell, esc } = require('../lib/shell');
const { cardsHtml, fmtDate } = require('../lib/markup');

// Merges what used to be api/page-gallery.js and api/page-item.js.
// Routed as /api/page?mode=gallery&cat=:cat | item&cat=:cat&id=:id
// (see vercel.json rewrites) - these are the pages crawlers/link-preview
// bots see for /:cat and /:cat/:id.
module.exports = async (req, res) => {
  const { mode, cat, id } = req.query;
  if (mode === 'item') return renderItem(req, res, cat, id);
  return renderGallery(req, res, cat);
};

const BLURB = {
  'illustrations': 'AI images turned into illustrations. Every set comes with its master prompt: copy it, use it.',
  'freepik': 'My latest contributor files on Magnific (Freepik).',
  'adobe-stock': 'My latest contributor files on Adobe Stock.',
  'shutterstock': 'My latest contributor files on Shutterstock.',
  'pinterest': 'Designs and ideas from my Pinterest boards.',
  'clients': 'Selected work delivered for clients.',
  'premium': 'Paid, extended-license assets with fully editable source files.'
};

async function renderGallery(req, res, cat) {
  if (!items.CATS[cat]) { res.status(404).send('Not found'); return; }

  const visible = await items.getCategoryVisibility();
  if (!visible[cat]) { res.status(404).send('Not found'); return; }

  const label = items.CATS[cat];
  const list = await items.listPublished(cat, 24);
  const cover = list[0] && list[0].cover ? list[0].cover.src : null;

  const bodyHtml = `
  <section class="page-hero">
    <div class="wrap">
      <div class="eyebrow" id="g-eyebrow">Gallery</div>
      <h1 class="h1" id="g-title">${label}</h1>
      <p id="g-blurb">${BLURB[cat] || ''}</p>
      <div class="row">
        <input class="search" id="g-search" type="search" placeholder="Search by title" aria-label="Search by title">
        <a class="btn ghost sm" id="g-profile" href="#" target="_blank" rel="noopener" hidden>View my profile &#8599;</a>
      </div>
    </div>
  </section>
  <section class="gal"><div class="wrap">
    <div class="cards" id="g-cards">${cardsHtml(list)}</div>
    <div class="more-row"><button class="btn ghost" id="g-more" hidden>Load more</button></div>
  </div></section>`;

  const html = renderShell({
    req, page: 'gallery',
    title: label + ' | Adil Siddique',
    description: `${label} by Adil Siddique (addesign) — ${BLURB[cat] || ''}`,
    canonicalPath: '/' + cat,
    ogImage: cover,
    bodyHtml
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
}

async function renderItem(req, res, cat, id) {
  if (!items.CATS[cat] || !id) { res.status(404).send('Not found'); return; }

  const visible = await items.getCategoryVisibility();
  if (!visible[cat]) { res.status(404).send('Not found'); return; }

  const it = await items.getPublishedItem(cat, id);
  if (!it) { res.status(404).send('Not found'); return; }

  const isPremium = it.cat === 'premium';
  const tags = '<span class="hot">' + esc(it.catName) + '</span><span>' + fmtDate(it.date) + '</span>' +
    (it.tag ? '<span>' + esc(it.tag) + '</span>' : '') +
    (it.price ? '<span class="hot">' + esc(it.price) + '</span>' : '');

  let actions = '';
  if (it.buy) actions += '<a class="btn red" href="' + esc(it.buy) + '" target="_blank" rel="noopener">Buy now' + (it.price ? ' &middot; ' + esc(it.price) : '') + '</a>';
  if (it.download && !isPremium) actions += '<a class="btn red" href="' + esc(it.download) + '" ' + (/^https?:/.test(it.download) ? 'target="_blank" rel="noopener"' : 'download') + '>Download file</a>';
  if (it.link) actions += '<a class="btn ghost" href="' + esc(it.link) + '" target="_blank" rel="noopener">View on ' + (isPremium ? 'store' : 'marketplace') + ' &#8599;</a>';

  const cover = it.images[0] ? it.images[0].f : null;
  const promptBlock = it.prompt
    ? '<div class="promptbox"><p class="d" style="margin-bottom:8px"><b>Master prompt</b></p><pre>' + esc(it.prompt) + '</pre></div>'
    : '';

  const bodyHtml = `<div class="wrap" id="app">
    <p class="crumb"><a href="/">Home</a> / <a href="/${it.cat}">${esc(it.catName)}</a> / ${esc(it.title)}</p>
    <div class="item-grid">
      <div><div id="i-car" class="car" tabindex="0" aria-label="Image slider">
        <div class="stage"><img src="${esc(cover)}" width="${it.images[0].w}" height="${it.images[0].h}" alt="${esc(it.title)}" decoding="async"></div>
      </div></div>
      <div>
        <h1>${esc(it.title)}</h1>
        <div class="tags">${tags}</div>
        ${it.desc ? '<p class="d">' + esc(it.desc) + '</p>' : ''}
        ${actions ? '<div class="actions">' + actions + '</div>' : ''}
        ${promptBlock}
      </div>
    </div>
  </div>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: it.title,
    description: it.desc || it.title,
    image: cover,
    datePublished: it.date,
    creator: { '@type': 'Person', name: 'Adil Siddique' },
    keywords: it.tag || undefined
  };

  const html = renderShell({
    req, page: 'item',
    title: it.title + ' | Adil Siddique',
    description: (it.desc || (it.title + ' — ' + it.catName + ' by Adil Siddique (addesign).')).slice(0, 300),
    canonicalPath: '/' + it.cat + '/' + encodeURIComponent(it.id),
    ogImage: cover,
    jsonLd,
    bodyHtml
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
}
