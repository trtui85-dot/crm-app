import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, status, company_id, owner_id, tag_id, page = 1, limit = 50 } = req.query;
    let sql = `SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON co.id = c.company_id WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (c.first_name ILIKE ? OR c.last_name ILIKE ? OR c.email ILIKE ? OR c.phone ILIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { sql += ` AND c.status = ?`; params.push(status); }
    if (company_id) { sql += ` AND c.company_id = ?`; params.push(company_id); }
    if (owner_id) { sql += ` AND c.owner_id = ?`; params.push(owner_id); }
    if (tag_id) { sql += ` AND c.id IN (SELECT contact_id FROM contact_tags WHERE tag_id = ?)`; params.push(tag_id); }
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);
    const [contacts] = await query(sql, params);
    for (const c of contacts) {
      const [tags] = await query('SELECT t.* FROM tags t JOIN contact_tags ct ON ct.tag_id = t.id WHERE ct.contact_id = ?', [c.id]);
      c.tags = tags;
    }
    res.json(contacts);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [contacts] = await query('SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON co.id = c.company_id WHERE c.id = ?', [req.params.id]);
    if (contacts.length === 0) return res.status(404).json({ error: 'Not found' });
    const contact = contacts[0];
    const [tags] = await query('SELECT t.* FROM tags t JOIN contact_tags ct ON ct.tag_id = t.id WHERE ct.contact_id = ?', [contact.id]);
    contact.tags = tags;
    const [deals] = await query('SELECT d.*, ds.name as stage_name FROM deals d LEFT JOIN deal_stages ds ON ds.id = d.stage_id WHERE d.contact_id = ? ORDER BY d.created_at DESC', [contact.id]);
    contact.deals = deals;
    const [activities] = await query('SELECT * FROM activities WHERE contact_id = ? ORDER BY due_date DESC LIMIT 20', [contact.id]);
    contact.activities = activities;
    const [notes] = await query('SELECT n.*, u.name as author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.contact_id = ? ORDER BY n.created_at DESC', [contact.id]);
    contact.notes = notes;
    res.json(contact);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, mobile, position, company_id, source, status, tags } = req.body;
    if (!first_name) return res.status(400).json({ error: 'first_name required' });
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    const [result] = await query(
      'INSERT INTO contacts (first_name, last_name, email, phone, mobile, position, company_id, source, status, owner_id, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name || null, email || null, phone || null, mobile || null, position || null, company_id || null, source || 'manual', status || 'lead', req.user.id, colors[Math.floor(Math.random() * colors.length)]]
    );
    if (tags && tags.length) {
      for (const tagId of tags) {
        await query('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)', [result.insertId, tagId]).catch(() => {});
      }
    }
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, mobile, position, company_id, source, status, tags } = req.body;
    await query(
      'UPDATE contacts SET first_name=?, last_name=?, email=?, phone=?, mobile=?, position=?, company_id=?, source=?, status=?, updated_at=NOW() WHERE id=?',
      [first_name, last_name || null, email || null, phone || null, mobile || null, position || null, company_id || null, source || 'manual', status || 'lead', req.params.id]
    );
    if (tags !== undefined) {
      await query('DELETE FROM contact_tags WHERE contact_id = ?', [req.params.id]);
      if (tags && tags.length) {
        for (const tagId of tags) {
          await query('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]).catch(() => {});
        }
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
