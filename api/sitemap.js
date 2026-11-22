const items = require('../lib/items');
const { siteOrigin, esc } = require('../lib/shell');

module.exports = async (req, res) => {
  const origin = siteOrigin(req);
  const [all, visible] = await Promise.all([items.listPublished(null, 2000), items.getCategoryVisibility()]);
  const visibleCats = items.CAT_IDS.filter(c => visible[c]);
  const staticUrls = ['/'].concat(visibleCats.map(c => '/' + c));
  const itemUrls = all.filter(it => visible[it.cat]).map(it => '/' + it.cat + '/' + encodeURIComponent(it.id));

  const urls = staticUrls.concat(itemUrls).map(u =>
    `<url><loc>${esc(origin + u)}</loc></url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
