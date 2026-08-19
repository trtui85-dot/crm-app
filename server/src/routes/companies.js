import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, industry, page = 1, limit = 50 } = req.query;
    let sql = 'SELECT * FROM companies WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (industry) { sql += ' AND industry = ?'; params.push(industry); }
    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const [companies] = await query(sql, params);
    for (const c of companies) {
      const [cnt] = await query('SELECT COUNT(*) as count FROM contacts WHERE company_id = ?', [c.id]);
      c.contacts_count = Number(cnt[0].count);
    }
    res.json(companies);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [companies] = await query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (companies.length === 0) return res.status(404).json({ error: 'Not found' });
    const company = companies[0];
    const [contacts] = await query('SELECT * FROM contacts WHERE company_id = ? ORDER BY first_name', [company.id]);
    company.contacts = contacts;
    const [deals] = await query('SELECT d.*, ds.name as stage_name FROM deals d LEFT JOIN deal_stages ds ON ds.id = d.stage_id WHERE d.company_id = ? ORDER BY d.created_at DESC', [company.id]);
    company.deals = deals;
    const [notes] = await query('SELECT n.*, u.name as author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.company_id = ? ORDER BY n.created_at DESC', [company.id]);
    company.notes = notes;
    res.json(company);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await query(
      'INSERT INTO companies (name, industry, website, phone, email, address, city, country, size, annual_revenue, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || 'Mauritanie', size || null, annual_revenue || 0, req.user.id]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, notes } = req.body;
    await query(
      'UPDATE companies SET name=?, industry=?, website=?, phone=?, email=?, address=?, city=?, country=?, size=?, annual_revenue=?, notes=?, updated_at=NOW() WHERE id=?',
      [name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || 'Mauritanie', size || null, annual_revenue || 0, notes || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
