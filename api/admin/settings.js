const { requireAdmin } = require('../../lib/auth');
const items = require('../../lib/items');

module.exports = async (req, res) => {
  if (requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const [settings, visible] = await Promise.all([items.getSettings(), items.getCategoryVisibility()]);
    return res.status(200).json({ settings, visible, categories: items.CATS });
  }

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (body && body.settings) await items.saveSettings(body.settings);
    if (body && body.visible) {
      for (const cat of Object.keys(body.visible)) {
        if (items.CATS[cat]) await items.setCategoryVisibility(cat, !!body.visible[cat]);
      }
    }
    const [settings, visible] = await Promise.all([items.getSettings(), items.getCategoryVisibility()]);
    return res.status(200).json({ settings, visible, categories: items.CATS });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
