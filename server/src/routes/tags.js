import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [tags] = await query('SELECT t.*, (SELECT COUNT(*) FROM contact_tags ct WHERE ct.tag_id = t.id) as contact_count, (SELECT COUNT(*) FROM deal_tags dt WHERE dt.tag_id = t.id) as deal_count FROM tags t ORDER BY t.name');
    res.json(tags);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await query('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color || '#6b7280']);
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    await query('UPDATE tags SET name=?, color=? WHERE id=?', [name, color, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM tags WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
