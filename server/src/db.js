import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const DB_URL = process.env.DATABASE_URL || 'postgresql://factory_manager_user:apDO6DzshNP0oLCKmACPunlg53BX0W97@dpg-da2crt15efls73a0lhn0-a/factory_manager';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  options: '-c search_path=crm_app,public',
});

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function toPgDate(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().replace('T', ' ').replace('Z', '');
  }
  return v;
}

function expandArrayParams(sql, params) {
  let idx = 0;
  const newParams = [];
  const newSql = sql.replace(/\?/g, () => {
    const p = params[idx++];
    if (Array.isArray(p)) {
      if (p.length === 0) return '(SELECT NULL WHERE false)';
      const ph = p.map(() => `$${newParams.length + 1}`).join(',');
      newParams.push(...p);
      return `(${ph})`;
    }
    newParams.push(toPgDate(p));
    return `$${newParams.length}`;
  });
  return { sql: newSql, params: newParams };
}

function isInsert(sql) { return /^\s*INSERT\s+INTO/i.test(sql); }

async function execQuery(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const { sql: pgSql, params: pgParams } = expandArrayParams(converted, params);
  if (isInsert(converted) && !converted.toLowerCase().includes('returning')) {
    const withReturning = pgSql.replace(/;?\s*$/, '') + ' RETURNING *';
    const result = await pool.query(withReturning, pgParams);
    return [result.rows, [{ insertId: result.rows[0]?.id, affectedRows: result.rowCount }]];
  }
  const result = await pool.query(pgSql, pgParams);
  return [result.rows, [{ affectedRows: result.rowCount }]];
}

function makeConn(conn) {
  return {
    beginTransaction: async () => { await conn.query('BEGIN'); },
    execute: async (sql, params = []) => {
      const converted = convertPlaceholders(sql);
      const { sql: pgSql, params: pgParams } = expandArrayParams(converted, params);
      if (isInsert(converted) && !converted.toLowerCase().includes('returning')) {
        const withReturning = pgSql.replace(/;?\s*$/, '') + ' RETURNING *';
        const result = await conn.query(withReturning, pgParams);
        return [result.rows, [{ insertId: result.rows[0]?.id, affectedRows: result.rowCount }]];
      }
      const result = await conn.query(pgSql, pgParams);
      return [result.rows, [{ affectedRows: result.rowCount }]];
    },
    commit: async () => { await conn.query('COMMIT'); },
    rollback: async () => { await conn.query('ROLLBACK'); },
    release: () => { conn.release(); },
  };
}

pool.getConnection = async () => {
  const conn = await pool.connect();
  return makeConn(conn);
};

export { pool };
export const query = execQuery;

async function migrate() {
  const conn = await pool.connect();
  try {
    await conn.query('CREATE SCHEMA IF NOT EXISTS crm_app');
    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      pin_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'USER',
      avatar_color VARCHAR(20) DEFAULT '#6366f1',
      active SMALLINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      industry VARCHAR(100),
      website VARCHAR(200),
      phone VARCHAR(30),
      email VARCHAR(150),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100) DEFAULT 'Mauritanie',
      size VARCHAR(50),
      annual_revenue DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      owner_id INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      email VARCHAR(150),
      phone VARCHAR(30),
      mobile VARCHAR(30),
      position VARCHAR(100),
      company_id INT REFERENCES companies(id) ON DELETE SET NULL,
      source VARCHAR(50) DEFAULT 'manual',
      status VARCHAR(20) DEFAULT 'lead',
      avatar_color VARCHAR(20) DEFAULT '#10b981',
      owner_id INT REFERENCES users(id),
      converted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS deal_stages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      position INT DEFAULT 0,
      color VARCHAR(20) DEFAULT '#6b7280',
      win_status SMALLINT DEFAULT 0,
      loss_status SMALLINT DEFAULT 0
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
      company_id INT REFERENCES companies(id) ON DELETE SET NULL,
      stage_id INT REFERENCES deal_stages(id),
      expected_revenue DECIMAL(15,2) DEFAULT 0,
      actual_revenue DECIMAL(15,2) DEFAULT 0,
      probability INT DEFAULT 0,
      close_date DATE,
      description TEXT,
      owner_id INT REFERENCES users(id),
      won_at TIMESTAMP NULL,
      lost_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL DEFAULT 'task',
      subject VARCHAR(200) NOT NULL,
      description TEXT,
      contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
      deal_id INT REFERENCES deals(id) ON DELETE SET NULL,
      company_id INT REFERENCES companies(id) ON DELETE SET NULL,
      due_date TIMESTAMP,
      completed SMALLINT DEFAULT 0,
      completed_at TIMESTAMP NULL,
      owner_id INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(20) DEFAULT '#6b7280'
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS contact_tags (
      contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
      tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (contact_id, tag_id)
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS deal_tags (
      deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
      tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (deal_id, tag_id)
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
      deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      author_id INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    const adminCheck = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com'");
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('2222', 10);
      await conn.query(
        "INSERT INTO users (name, email, pin_hash, role) VALUES ($1, $2, $3, $4)",
        ['Admin', 'admin@crm.com', hash, 'ADMIN']
      );
    }

    const stageCheck = await conn.query('SELECT COUNT(*) AS c FROM deal_stages');
    if (Number(stageCheck.rows[0].c) === 0) {
      await conn.query(`INSERT INTO deal_stages (name, position, color, win_status, loss_status) VALUES
        ('Nouveau', 0, '#6366f1', 0, 0),
        ('Qualifié', 1, '#3b82f6', 0, 0),
        ('Proposition', 2, '#f59e0b', 0, 0),
        ('Négociation', 3, '#f97316', 0, 0),
        ('Gagné', 4, '#22c55e', 1, 0),
        ('Perdu', 5, '#ef4444', 0, 1)
      `);
    }

    const tagCheck = await conn.query('SELECT COUNT(*) AS c FROM tags');
    if (Number(tagCheck.rows[0].c) === 0) {
      await conn.query(`INSERT INTO tags (name, color) VALUES
        ('Urgent', '#ef4444'),
        ('Prioritaire', '#f59e0b'),
        ('VIP', '#8b5cf6'),
        ('Nouveau', '#3b82f6'),
        ('À relancer', '#f97316'),
        ('En attente', '#6b7280'),
        ('Fidèle', '#22c55e')
      `);
    }

    const compCheck = await conn.query('SELECT COUNT(*) AS c FROM companies');
    if (Number(compCheck.rows[0].c) === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com' LIMIT 1");
      const ownerId = admin.rows[0].id;
      await conn.query(`INSERT INTO companies (name, industry, website, phone, email, address, city, country, size, annual_revenue, owner_id) VALUES
        ('SIR Solutions', 'Informatique', 'https://siir.mr', '22567890', 'contact@siir.mr', 'Tevragh Zeina', 'Nouakchott', 'Mauritanie', 'PME', 50000000, $1),
        ('Sonatel Mauritanie', 'Télécommunications', 'https://sonatel.mr', '44100200', 'info@sonatel.mr', 'CFC', 'Nouakchott', 'Mauritanie', 'Grande', 200000000, $1),
        ('BMCI Bank', 'Finance', 'https://bmci.mr', '22345678', 'info@bmci.mr', 'Centre Ville', 'Nouakchott', 'Mauritanie', 'Grande', 500000000, $1),
        ('SNIM', 'Industrie Minière', 'https://snim.mr', '44300100', 'contact@snim.mr', 'Zouérat', 'Zouérat', 'Mauritanie', 'Grande', 1000000000, $1),
        ('Nouakchott Sea Food', 'Pêche', 'https://nsf.mr', '22456789', 'export@nsf.mr', 'Port de Pêche', 'Nouakchott', 'Mauritanie', 'Moyenne', 80000000, $1),
        ('Mauri Boulangerie', 'Agroalimentaire', NULL, '22678901', 'contact@mauri.mr', 'Sebkha', 'Nouakchott', 'Mauritanie', 'Petite', 15000000, $1),
        ('Ciment du Sahel', 'Construction', 'https://ciment-sahel.mr', '44500100', 'info@ciment-sahel.mr', 'Nouadhibou', 'Nouadhibou', 'Mauritanie', 'Grande', 300000000, $1),
        ('Hotel Tevragh Zeina', 'Hôtellerie', 'https://htz.mr', '22300400', 'reservation@htz.mr', 'Tevragh Zeina', 'Nouakchott', 'Mauritanie', 'Moyenne', 60000000, $1),
        ('Banque Atlantique', 'Finance', 'https://banqueatlantique.mr', '22400500', 'info@bamr.mr', 'Avenue du 25 Juillet', 'Nouakchott', 'Mauritanie', 'Grande', 400000000, $1),
        ('Hydro Sahara', 'Énergie', 'https://hydro.mr', '44600100', 'contact@hydro.mr', 'Industrial Zone', 'Nouakchott', 'Mauritanie', 'Moyenne', 120000000, $1)
      `, [ownerId]);
    }

    const contCheck = await conn.query('SELECT COUNT(*) AS c FROM contacts');
    if (Number(contCheck.rows[0].c) === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com' LIMIT 1");
      const ownerId = admin.rows[0].id;
      const [comps] = await conn.query('SELECT id, name FROM companies ORDER BY id');

      const contacts = [
        ['Ahmed', 'Ould Abdallahi', 'ahmed@sir.mr', '22100101', 'Directeur Général', 'SIR Solutions', 'owner'],
        ['Fatima', 'Bint Mohamed', 'fatima@sonatel.mr', '22100102', 'DRH', 'Sonatel Mauritanie', 'prospect'],
        ['Oumar', 'Ould Sidi', 'oumar@bmci.mr', '22100103', 'Directeur Commercial', 'BMCI Bank', 'customer'],
        ['Mariam', 'Cheikh', 'mariam@snim.mr', '22100104', 'Responsable Achats', 'SNIM', 'lead'],
        ['Ibrahim', 'Ould Brahim', 'ibrahim@nsf.mr', '22100105', 'Export Manager', 'Nouakchott Sea Food', 'prospect'],
        ['Aicha', 'Mint Issa', 'aicha@mauri.mr', '22100106', 'Propriétaire', 'Mauri Boulangerie', 'customer'],
        ['Boubacar', 'Ould Taleb', 'boubacar@ciment.mr', '22100107', 'Directeur Production', 'Ciment du Sahel', 'lead'],
        ['Khadija', 'Bint Ahmed', 'khadija@htz.mr', '22100108', 'Manager', 'Hotel Tevragh Zeina', 'customer'],
        ['Moussa', 'Ould El Hadj', 'moussa@bamr.mr', '22100109', 'Chef Service Crédit', 'Banque Atlantique', 'prospect'],
        ['Nana', 'Mint Bakar', 'nana@hydro.mr', '22100110', 'Directrice Administrative', 'Hydro Sahara', 'lead'],
        ['Sid Ahmed', 'Ould Bamba', 'sid@siir.mr', '22100111', 'CTO', 'SIR Solutions', 'customer'],
        ['Fatou', 'Bint Oumar', 'fatou@sonatel.mr', '22100112', 'Chef Projet', 'Sonatel Mauritanie', 'customer'],
        ['Youssef', 'Ould Rachid', 'youssef@bmci.mr', '22100113', 'Analyste Senior', 'BMCI Bank', 'lead'],
        ['Aminata', 'Mint Sidi', 'aminata@nsf.mr', '22100114', 'Logistique', 'Nouakchott Sea Food', 'prospect'],
        ['Mohamed', 'Ould Lemine', 'mohamed@snim.mr', '22100115', 'Ingénieur Mines', 'SNIM', 'lead'],
        ['Zahra', 'Bint Moussa', 'zahra@mauri.mr', '22100116', 'Comptable', 'Mauri Boulangerie', 'customer'],
        ['Abdallahi', 'Ould Cheikh', 'abdallahi@ciment.mr', '22100117', 'Commercial', 'Ciment du Sahel', 'prospect'],
        ['Salimata', 'Mint Ould', 'salimata@htz.mr', '22100118', 'Réceptionniste', 'Hotel Tevragh Zeina', 'lead'],
        ['Ismail', 'Ould Mokhtar', 'ismail@bamr.mr', '22100119', 'Directeur IT', 'Banque Atlantique', 'customer'],
        ['Hawa', 'Bint El Mami', 'hawa@hydro.mr', '22100120', 'RH', 'Hydro Sahara', 'prospect'],
        ['Lamine', 'Ould Ndiaye', 'lamine@sir.mr', '22100121', 'Développeur Senior', 'SIR Solutions', 'customer'],
        ['Rokia', 'Mint Diallo', 'rookia@sonatel.mr', '22100122', 'Marketing', 'Sonatel Mauritanie', 'lead'],
        ['Abdel', 'Ould Yahya', 'abdel@bmci.mr', '22100123', 'Trésorier', 'BMCI Bank', 'customer'],
        ['Astou', 'Mint Fall', 'astou@nsf.mr', '22100124', 'Qualité', 'Nouakchott Sea Food', 'lead'],
      ];

      for (const [first, last, email, phone, position, compName, status] of contacts) {
        const comp = comps.rows.find(c => c.name === compName);
        await conn.query(
          `INSERT INTO contacts (first_name, last_name, email, phone, position, company_id, source, status, owner_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [first, last, email, phone, position, comp?.id || null,
           ['website', 'referral', 'cold_call', 'social', 'event', 'manual'][Math.floor(Math.random() * 6)],
           status, ownerId]
        );
      }
    }

    const dealCheck = await conn.query('SELECT COUNT(*) AS c FROM deals');
    if (Number(dealCheck.rows[0].c) === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com' LIMIT 1");
      const ownerId = admin.rows[0].id;
      const [stages] = await conn.query('SELECT id, name FROM deal_stages ORDER BY position');
      const [contacts] = await conn.query('SELECT id, company_id FROM contacts ORDER BY id');

      const deals = [
        ['Refonte site web SIR', 0, 15000000, 70, 14],
        ['Audit SI Sonatel', 1, 80000000, 60, 21],
        ['Migration cloud BMCI', 2, 200000000, 45, 30],
        ['Installation réseau SNIM', 3, 45000000, 80, 7],
        ['Consultance export NSF', 4, 12000000, 90, 5],
        ['Application mobile Mauri', 0, 8000000, 30, 28],
        ['Sécurité IT Ciment Sahel', 1, 25000000, 55, 21],
        ['PMS HTZ', 2, 18000000, 50, 14],
        ['Digitalisation Bamr', 5, 150000000, 100, 0],
        ['IoT Hydro Sahara', 3, 35000000, 75, 10],
        ['ERP Sonatel Phase 2', 4, 120000000, 85, 7],
        ['Formation dev SIR', 0, 5000000, 20, 21],
        ['CRM Banque Atlantique', 1, 60000000, 40, 30],
        ['Monitoring SNIM', 2, 30000000, 65, 14],
        ['Refonte UI NSF', 5, 9000000, 100, 0],
        ['App mobile Mauri v2', 0, 10000000, 25, 21],
        ['Infrastructure Ciment', 3, 40000000, 70, 10],
        ['Telephonie HTZ', 1, 7000000, 45, 14],
      ];

      for (const [title, stageIdx, revenue, prob, daysAhead] of deals) {
        const stageId = stages.rows[stageIdx]?.id || stages.rows[0].id;
        const contact = contacts.rows[Math.floor(Math.random() * contacts.rows.length)];
        const closeDate = new Date();
        closeDate.setDate(closeDate.getDate() + daysAhead);
        const isWon = stages.rows[stageIdx]?.name === 'Gagné';
        const isLost = stages.rows[stageIdx]?.name === 'Perdu';
        await conn.query(
          `INSERT INTO deals (title, contact_id, company_id, stage_id, expected_revenue, probability, close_date, owner_id, won_at, lost_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [title, contact.id, contact.company_id, stageId, revenue, prob,
           closeDate.toISOString().split('T')[0], ownerId,
           isWon ? new Date() : null, isLost ? new Date() : null]
        );
      }
    }

    const actCheck = await conn.query('SELECT COUNT(*) AS c FROM activities');
    if (Number(actCheck.rows[0].c) === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com' LIMIT 1");
      const ownerId = admin.rows[0].id;
      const [contacts] = await conn.query('SELECT id FROM contacts ORDER BY id');
      const [deals] = await conn.query('SELECT id FROM deals ORDER BY id');

      const activities = [
        ['call', 'Appel de suivi - Ahmed', 'Discuter de la refsite web', 1, 1],
        ['meeting', 'Réunion Sonatel', 'Présentation audit SI', 2, 2],
        ['email', 'Email propositions BMCI', 'Envoyer devis migration', 3, 3],
        ['task', 'Préparer demo SNIM', 'Préparer présentation installation', 4, 4],
        ['call', 'Appel relance NSF', 'Suivi export poissons', 5, 5],
        ['meeting', 'Formation équipe', 'Formation React.js', 1, 12],
        ['task', 'Rédiger cahier des charges', 'CRM Banque Atlantique', 9, 13],
        ['call', 'Appel commercial', 'Pitch IoT Hydro Sahara', 10, 10],
      ];

      for (const [type, subject, desc, contIdx, dealIdx] of activities) {
        const contact = contacts.rows[contIdx % contacts.rows.length];
        const deal = deals.rows[dealIdx % deals.rows.length];
        const due = new Date();
        due.setDate(due.getDate() + Math.floor(Math.random() * 14));
        await conn.query(
          `INSERT INTO activities (type, subject, description, contact_id, deal_id, owner_id, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [type, subject, desc, contact.id, deal.id, ownerId, due]
        );
      }
    }

    const noteCheck = await conn.query('SELECT COUNT(*) AS c FROM notes');
    if (Number(noteCheck.rows[0].c) === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE email = 'admin@crm.com' LIMIT 1");
      const ownerId = admin.rows[0].id;
      const [contacts] = await conn.query('SELECT id FROM contacts ORDER BY id');

      await conn.query(
        `INSERT INTO notes (content, contact_id, author_id) VALUES ($1, $2, $3)`,
        ['Ahmed est très intéressé par la refonte. Budget confirmé.', contacts.rows[0].id, ownerId]
      );
      await conn.query(
        `INSERT INTO notes (content, contact_id, author_id) VALUES ($1, $2, $3)`,
        ['Fatima veut une démo avant fin du mois.', contacts.rows[1].id, ownerId]
      );
      await conn.query(
        `INSERT INTO notes (content, contact_id, author_id) VALUES ($1, $2, $3)`,
        ['Oumar a validé le budget cloud. Signature prévue.', contacts.rows[2].id, ownerId]
      );
    }

    console.log('CRM Migration completed');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    conn.release();
  }
}

migrate();

export default pool;
