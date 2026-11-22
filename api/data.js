const items = require('../lib/items');

// Merges what used to be api/data-latest.js, data-cat.js and data-item.js.
// Routed as /api/data?mode=latest | cat&cat=:cat | item&cat=:cat&id=:id
// (see vercel.json rewrites) - this is what public/js/app.js's existing
// /data/*.json fetch calls get redirected to, unchanged on the client side.
module.exports = async (req, res) => {
  const { mode, cat, id } = req.query;
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (mode === 'latest') {
    const [list, visible] = await Promise.all([items.listPublished(null, 96), items.getCategoryVisibility()]);
    return res.status(200).json(list.filter(it => visible[it.cat]).slice(0, 48));
  }

  if (mode === 'cat') {
    if (!items.CATS[cat]) return res.status(404).json([]);
    const visible = await items.getCategoryVisibility();
    if (!visible[cat]) return res.status(200).json([]);
    return res.status(200).json(await items.listPublished(cat, 1000));
  }

  if (mode === 'item') {
    const visible = await items.getCategoryVisibility();
    if (!visible[cat]) return res.status(404).json({ error: 'Not found' });
    const item = await items.getPublishedItem(cat, id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(item);
  }

  res.status(404).json({ error: 'Unknown data mode' });
};
