import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import companyRoutes from './routes/companies.js';
import dealRoutes from './routes/deals.js';
import activityRoutes from './routes/activities.js';
import tagRoutes from './routes/tags.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', authenticate, contactRoutes);
app.use('/api/companies', authenticate, companyRoutes);
app.use('/api/deals', authenticate, dealRoutes);
app.use('/api/activities', authenticate, activityRoutes);
app.use('/api/tags', authenticate, tagRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => console.log(`CRM API on http://localhost:${PORT}`));
