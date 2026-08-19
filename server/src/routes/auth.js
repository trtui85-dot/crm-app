import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    console.log('LOGIN ATTEMPT:', { phone, pin });
    if (!phone || !pin) return res.status(400).json({ error: 'Téléphone et code PIN requis' });
    const [users] = await query("SELECT * FROM users WHERE phone = ? AND (active = 1 OR active = true OR active = '1')", [phone]);
    console.log('USERS FOUND:', users.length, users.map(u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, active: u.active })));
    if (users.length === 0) {
      const [allUsers] = await query("SELECT id, name, phone, role, active FROM users");
      console.log('ALL USERS:', JSON.stringify(allUsers));
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const user = users[0];
    console.log('PIN HASH:', user.pin_hash);
    const valid = await bcrypt.compare(pin, user.pin_hash);
    console.log('PIN VALID:', valid);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });
    const token = generateToken(user);
    const { pin_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'crm-secret-key-2026');
    const [users] = await query('SELECT id, name, phone, role, avatar_color FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
