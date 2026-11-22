const { esc } = require('./shell');

function fmtDate(d) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (e) { return d; }
}

// Mirrors the `card()` template in public/js/app.js
function cardHtml(it) {
  const c = it.cover;
  if (!c) return '';
  return '<a class="card" href="/' + it.cat + '/' + encodeURIComponent(it.id) + '">' +
    '<div class="thumb"><img src="' + esc(c.src) + '" width="' + c.w + '" height="' + c.h + '" loading="lazy" decoding="async" alt="' + esc(it.title) + '">' +
    '<span class="pill">' + esc(it.catName) + '</span>' +
    (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '') + '</div>' +
    '<div class="cmeta"><h3>' + esc(it.title) + '</h3><span>' + fmtDate(it.date) +
    (it.imageCount > 1 ? ' &middot; ' + it.imageCount + ' images' : '') + '</span></div></a>';
}

function cardsHtml(list) {
  if (!list.length) return '<div class="empty">Nothing here yet. New files coming soon.</div>';
  return list.map(cardHtml).join('');
}

module.exports = { fmtDate, cardHtml, cardsHtml };
