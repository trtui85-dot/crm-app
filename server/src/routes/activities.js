import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, contact_id, deal_id, completed, upcoming } = req.query;
    let sql = `SELECT a.*, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name, d.title as deal_title
               FROM activities a LEFT JOIN contacts c ON c.id = a.contact_id LEFT JOIN deals d ON d.id = a.deal_id WHERE 1=1`;
    const params = [];
    if (type) { sql += ' AND a.type = ?'; params.push(type); }
    if (contact_id) { sql += ' AND a.contact_id = ?'; params.push(contact_id); }
    if (deal_id) { sql += ' AND a.deal_id = ?'; params.push(deal_id); }
    if (completed !== undefined) { sql += ' AND a.completed = ?'; params.push(Number(completed)); }
    if (upcoming) { sql += ' AND a.due_date >= NOW() AND a.completed = 0'; }
    sql += ' ORDER BY a.due_date ASC LIMIT 100';
    const [activities] = await query(sql, params);
    res.json(activities);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { type, subject, description, contact_id, deal_id, company_id, due_date } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject required' });
    const [result] = await query(
      'INSERT INTO activities (type, subject, description, contact_id, deal_id, company_id, due_date, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [type || 'task', subject, description || null, contact_id || null, deal_id || null, company_id || null, due_date || null, req.user.id]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { type, subject, description, contact_id, deal_id, company_id, due_date, completed } = req.body;
    const completedAt = completed ? 'NOW()' : 'NULL';
    await query(
      `UPDATE activities SET type=?, subject=?, description=?, contact_id=?, deal_id=?, company_id=?, due_date=?, completed=?, completed_at=${completedAt} WHERE id=?`,
      [type, subject, description || null, contact_id || null, deal_id || null, company_id || null, due_date || null, completed ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
