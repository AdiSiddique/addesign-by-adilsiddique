const { requireAdmin } = require('../../lib/auth');
const items = require('../../lib/items');

module.exports = async (req, res) => {
  if (requireAdmin(req, res)) return;

  const cat = req.query.cat, id = req.query.id;
  if (!cat || !id) return res.status(400).json({ error: '"cat" and "id" query params are required' });

  if (req.method === 'GET') {
    const item = await items.getAnyItem(cat, id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(item);
  }

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const updated = await items.updateItem(cat, id, body || {});
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    await items.deleteItem(cat, id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
