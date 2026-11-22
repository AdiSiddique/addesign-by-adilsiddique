const { requireAdmin } = require('../../lib/auth');
const items = require('../../lib/items');

module.exports = async (req, res) => {
  if (requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const all = await items.listAllForAdmin();
    return res.status(200).json(all);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || !body.cat || !items.CATS[body.cat]) {
      return res.status(400).json({ error: 'A valid "cat" is required' });
    }
    if (!body.images || !body.images.length) {
      return res.status(400).json({ error: 'At least one image is required (upload first via /api/admin/upload)' });
    }
    const created = await items.createItem(body);
    return res.status(201).json(created);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
