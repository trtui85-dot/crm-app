import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [totalContacts] = await query('SELECT COUNT(*) as c FROM contacts');
    const [totalCompanies] = await query('SELECT COUNT(*) as c FROM companies');
    const [totalDeals] = await query('SELECT COUNT(*) as c FROM deals');
    const [openDeals] = await query(`SELECT COUNT(*) as c, COALESCE(SUM(expected_revenue), 0) as value FROM deals d JOIN deal_stages ds ON ds.id = d.stage_id WHERE ds.win_status = 0 AND ds.loss_status = 0`);
    const [wonDeals] = await query(`SELECT COUNT(*) as c, COALESCE(SUM(actual_revenue), 0) as value FROM deals d JOIN deal_stages ds ON ds.id = d.stage_id WHERE ds.win_status = 1`);
    const [lostDeals] = await query(`SELECT COUNT(*) as c FROM deals d JOIN deal_stages ds ON ds.id = d.stage_id WHERE ds.loss_status = 1`);
    const [pendingActivities] = await query('SELECT COUNT(*) as c FROM activities WHERE completed = 0 AND due_date >= NOW()');
    const [overdueActivities] = await query('SELECT COUNT(*) as c FROM activities WHERE completed = 0 AND due_date < NOW()');
    const [leads] = await query("SELECT COUNT(*) as c FROM contacts WHERE status = 'lead'");
    const [prospects] = await query("SELECT COUNT(*) as c FROM contacts WHERE status = 'prospect'");
    const [customers] = await query("SELECT COUNT(*) as c FROM contacts WHERE status = 'customer'");

    const [pipeline] = await query(
      `SELECT ds.id, ds.name, ds.color, COUNT(d.id) as deal_count, COALESCE(SUM(d.expected_revenue), 0) as total_value
       FROM deal_stages ds LEFT JOIN deals d ON d.stage_id = ds.id
       GROUP BY ds.id, ds.name, ds.color, ds.position ORDER BY ds.position`
    );

    const [recentDeals] = await query(
      `SELECT d.title, d.expected_revenue, ds.name as stage_name, ds.color as stage_color,
              c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
       FROM deals d LEFT JOIN deal_stages ds ON ds.id = d.stage_id LEFT JOIN contacts c ON c.id = d.contact_id
       ORDER BY d.created_at DESC LIMIT 5`
    );

    const [upcomingActivities] = await query(
      `SELECT a.*, c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
       FROM activities a LEFT JOIN contacts c ON c.id = a.contact_id
       WHERE a.completed = 0 ORDER BY a.due_date ASC LIMIT 5`
    );

    res.json({
      counts: { contacts: totalContacts[0].c, companies: totalCompanies[0].c, deals: totalDeals[0].c, leads: leads[0].c, prospects: prospects[0].c, customers: customers[0].c },
      pipeline: { open: { count: openDeals[0].c, value: openDeals[0].value }, won: { count: wonDeals[0].c, value: wonDeals[0].value }, lost: { count: lostDeals[0].c } },
      activities: { pending: pendingActivities[0].c, overdue: overdueActivities[0].c },
      stages: pipeline,
      recentDeals,
      upcomingActivities,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
