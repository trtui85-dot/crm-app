import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

const router = Router();

const defaultPerms = { dashboard: true, contacts: true, companies: true, pipeline: true, activities: true, settings: true };

router.get('/', async (req, res) => {
  try {
    const [users] = await query("SELECT id, name, phone, role, avatar_color, active, permissions, created_at FROM users ORDER BY id");
    const parsed = users.map(u => ({
      ...u,
      permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions || defaultPerms
    }));
    res.json(parsed);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [users] = await query("SELECT id, name, phone, role, avatar_color, active, permissions, created_at FROM users WHERE id = ?", [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = users[0];
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions || defaultPerms;
    res.json(u);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, pin, role, permissions } = req.body;
    if (!name || !phone || !pin) return res.status(400).json({ error: 'Nom, téléphone et PIN requis' });
    if (pin.length < 4) return res.status(400).json({ error: 'Le PIN doit contenir au moins 4 chiffres' });
    const hash = await bcrypt.hash(pin, 10);
    const perms = permissions || defaultPerms;
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const [result] = await query(
      "INSERT INTO users (name, phone, pin_hash, role, permissions, avatar_color) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [name, phone, hash, role || 'USER', JSON.stringify(perms), color]
    );
    const [newUser] = await query("SELECT id, name, phone, role, avatar_color, active, permissions FROM users WHERE id = ?", [result.insertId]);
    const u = newUser[0];
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions || defaultPerms;
    res.json(u);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce numéro est déjà utilisé' });
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, pin, role, active, permissions } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
    if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
    if (pin && pin.length >= 4) {
      const hash = await bcrypt.hash(pin, 10);
      fields.push('pin_hash = ?'); values.push(hash);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [updated] = await query("SELECT id, name, phone, role, avatar_color, active, permissions FROM users WHERE id = ?", [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = updated[0];
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions || defaultPerms;
    res.json(u);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce numéro est déjà utilisé' });
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [users] = await query("SELECT role FROM users WHERE id = ?", [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    if (users[0].role === 'ADMIN') return res.status(400).json({ error: 'Impossible de supprimer un administrateur' });
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
