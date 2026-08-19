import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get } from '../api.js';
import { useAuth } from '../auth.jsx';
import { StatCard, Spinner, Badge } from '../components/ui.jsx';
import {
  Users, Building2, GitBranch, TrendingUp, CalendarCheck,
  AlertTriangle, Trophy, XCircle, DollarSign
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/api/dashboard').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <div className="page-error">Erreur de chargement</div>;

  const fmt = (v) => new Intl.NumberFormat('fr-MR').format(v || 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('dashboard')}</h1>
        <p className="page-subtitle">{t('welcome')}, {user?.name}</p>
      </div>

      <div className="stats-grid">
        <StatCard label={t('total_contacts')} value={data.counts.contacts} icon={Users} color="#6366f1" />
        <StatCard label={t('total_companies')} value={data.counts.companies} icon={Building2} color="#3b82f6" />
        <StatCard label={t('open_deals')} value={data.pipeline.open.count} icon={GitBranch} color="#f59e0b" sub={fmt(data.pipeline.open.value) + ' MRU'} />
        <StatCard label={t('won_value')} value={fmt(data.pipeline.won.value) + ' MRU'} icon={Trophy} color="#22c55e" sub={`${data.pipeline.won.count} deals`} />
        <StatCard label={t('pending_activities')} value={data.activities.pending} icon={CalendarCheck} color="#8b5cf6" />
        <StatCard label={t('overdue_activities')} value={data.activities.overdue} icon={AlertTriangle} color="#ef4444" />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3><TrendingUp size={18} /> {t('pipeline_by_stage')}</h3>
          <div className="pipeline-bars">
            {data.stages.map(s => (
              <div key={s.id} className="pipeline-bar-item">
                <div className="pipeline-bar-header">
                  <Badge color={s.color}>{s.name}</Badge>
                  <span>{s.deal_count} deals · {fmt(s.total_value)} MRU</span>
                </div>
                <div className="pipeline-bar-track">
                  <div className="pipeline-bar-fill" style={{
                    width: `${Math.max(2, (s.total_value / Math.max(1, data.stages.reduce((a, b) => a + Number(b.total_value), 0))) * 100)}%`,
                    background: s.color
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3><GitBranch size={18} /> {t('recent_deals')}</h3>
          {data.recentDeals.length === 0 ? (
            <p className="empty-text">{t('no_results')}</p>
          ) : (
            <div className="deal-list-compact">
              {data.recentDeals.map((d, i) => (
                <div key={i} className="deal-compact">
                  <div className="deal-compact-info">
                    <span className="deal-compact-title">{d.title}</span>
                    <span className="deal-compact-contact">{d.contact_name}</span>
                  </div>
                  <div className="deal-compact-right">
                    <Badge color={d.stage_color} dot>{d.stage_name}</Badge>
                    <span className="deal-compact-value">{fmt(d.expected_revenue)} MRU</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h3><CalendarCheck size={18} /> {t('upcoming_activities')}</h3>
          {data.upcomingActivities.length === 0 ? (
            <p className="empty-text">{t('no_results')}</p>
          ) : (
            <div className="activity-list-compact">
              {data.upcomingActivities.map(a => (
                <div key={a.id} className="activity-compact">
                  <Badge color={a.type === 'call' ? '#3b82f6' : a.type === 'meeting' ? '#8b5cf6' : a.type === 'email' ? '#f59e0b' : '#6b7280'}>
                    {t(a.type)}
                  </Badge>
                  <div className="activity-compact-info">
                    <span>{a.subject}</span>
                    <span className="activity-compact-sub">{a.contact_name}</span>
                  </div>
                  <span className="activity-compact-date">
                    {a.due_date ? new Date(a.due_date).toLocaleDateString('fr') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card contact-stats">
          <h3><Users size={18} /> {t('contacts')}</h3>
          <div className="contact-stat-row">
            <div className="contact-stat">
              <span className="contact-stat-count" style={{ color: '#6366f1' }}>{data.counts.leads}</span>
              <span className="contact-stat-label">{t('leads')}</span>
            </div>
            <div className="contact-stat">
              <span className="contact-stat-count" style={{ color: '#f59e0b' }}>{data.counts.prospects}</span>
              <span className="contact-stat-label">{t('prospects')}</span>
            </div>
            <div className="contact-stat">
              <span className="contact-stat-count" style={{ color: '#22c55e' }}>{data.counts.customers}</span>
              <span className="contact-stat-label">{t('customers')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
