import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'Email and PIN required' });
    const [users] = await query('SELECT * FROM users WHERE email = ? AND active = 1', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = users[0];
    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'crm-secret-key-2026');
    const [users] = await query('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
