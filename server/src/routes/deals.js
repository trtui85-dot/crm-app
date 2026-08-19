import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/stages', async (req, res) => {
  try {
    const [stages] = await query('SELECT * FROM deal_stages ORDER BY position ASC');
    res.json(stages);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', async (req, res) => {
  try {
    const { stage_id, contact_id, company_id, search } = req.query;
    let sql = `SELECT d.*, ds.name as stage_name, ds.color as stage_color, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name, co.name as company_name
               FROM deals d LEFT JOIN deal_stages ds ON ds.id = d.stage_id LEFT JOIN contacts c ON c.id = d.contact_id LEFT JOIN companies co ON co.id = d.company_id WHERE 1=1`;
    const params = [];
    if (stage_id) { sql += ' AND d.stage_id = ?'; params.push(stage_id); }
    if (contact_id) { sql += ' AND d.contact_id = ?'; params.push(contact_id); }
    if (company_id) { sql += ' AND d.company_id = ?'; params.push(company_id); }
    if (search) { sql += ' AND (d.title ILIKE ? OR c.first_name ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY d.created_at DESC';
    const [deals] = await query(sql, params);
    for (const d of deals) {
      const [tags] = await query('SELECT t.* FROM tags t JOIN deal_tags dt ON dt.tag_id = t.id WHERE dt.deal_id = ?', [d.id]);
      d.tags = tags;
    }
    res.json(deals);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [deals] = await query(
      `SELECT d.*, ds.name as stage_name, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name, co.name as company_name
       FROM deals d LEFT JOIN deal_stages ds ON ds.id = d.stage_id LEFT JOIN contacts c ON c.id = d.contact_id LEFT JOIN companies co ON co.id = d.company_id WHERE d.id = ?`,
      [req.params.id]
    );
    if (deals.length === 0) return res.status(404).json({ error: 'Not found' });
    const deal = deals[0];
    const [tags] = await query('SELECT t.* FROM tags t JOIN deal_tags dt ON dt.tag_id = t.id WHERE dt.deal_id = ?', [deal.id]);
    deal.tags = tags;
    const [activities] = await query('SELECT * FROM activities WHERE deal_id = ? ORDER BY due_date DESC LIMIT 20', [deal.id]);
    deal.activities = activities;
    const [notes] = await query('SELECT n.*, u.name as author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.deal_id = ? ORDER BY n.created_at DESC', [deal.id]);
    deal.notes = notes;
    res.json(deal);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, contact_id, company_id, stage_id, expected_revenue, probability, close_date, description, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const stages = await query('SELECT id FROM deal_stages ORDER BY position LIMIT 1');
    const [result] = await query(
      'INSERT INTO deals (title, contact_id, company_id, stage_id, expected_revenue, probability, close_date, description, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, contact_id || null, company_id || null, stage_id || stages[0][0]?.id || 1, expected_revenue || 0, probability || 0, close_date || null, description || null, req.user.id]
    );
    if (tags && tags.length) {
      for (const tagId of tags) {
        await query('INSERT INTO deal_tags (deal_id, tag_id) VALUES (?, ?)', [result.insertId, tagId]).catch(() => {});
      }
    }
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, contact_id, company_id, stage_id, expected_revenue, actual_revenue, probability, close_date, description, tags } = req.body;
    const [existing] = await query('SELECT stage_id FROM deals WHERE id = ?', [req.params.id]);
    const updateFields = { title, contact_id, company_id, stage_id, expected_revenue, actual_revenue, probability, close_date, description };
    let sql = 'UPDATE deals SET title=?, contact_id=?, company_id=?, stage_id=?, expected_revenue=?, actual_revenue=?, probability=?, close_date=?, description=?, updated_at=NOW()';
    const params = [title, contact_id || null, company_id || null, stage_id, expected_revenue || 0, actual_revenue || 0, probability || 0, close_date || null, description || null];

    if (stage_id && existing[0]?.stage_id !== stage_id) {
      const [stage] = await query('SELECT win_status, loss_status FROM deal_stages WHERE id = ?', [stage_id]);
      if (stage[0]?.win_status) { sql += ', won_at=NOW()'; }
      else if (stage[0]?.loss_status) { sql += ', lost_at=NOW()'; }
    }
    sql += ' WHERE id=?';
    params.push(req.params.id);
    await query(sql, params);
    if (tags !== undefined) {
      await query('DELETE FROM deal_tags WHERE deal_id = ?', [req.params.id]);
      if (tags && tags.length) {
        for (const tagId of tags) {
          await query('INSERT INTO deal_tags (deal_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]).catch(() => {});
        }
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
