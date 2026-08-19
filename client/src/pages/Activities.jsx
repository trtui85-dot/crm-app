import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { SearchInput, Modal, Input, Select, Textarea, Badge, Spinner, EmptyState, TabBar } from '../components/ui.jsx';
import { Plus, CalendarCheck, Phone, Mail, CheckSquare, Users } from 'lucide-react';

export default function Activities() {
  const { t } = useTranslation();
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterCompleted, setFilterCompleted] = useState('0');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ type: 'task', subject: '', description: '', contact_id: '', deal_id: '', due_date: '' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    if (filterCompleted !== '') params.set('completed', filterCompleted);
    const [a, c, d] = await Promise.all([
      get(`/api/activities?${params}`),
      get('/api/contacts?limit=200'),
      get('/api/deals?limit=200'),
    ]);
    setActivities(a); setContacts(c); setDeals(d); setLoading(false);
  };

  useEffect(() => { load(); }, [filterType, filterCompleted]);

  const handleSave = async () => {
    if (!form.subject) { toast.error('Sujet requis'); return; }
    try {
      await post('/api/activities', form);
      toast.success(t('create') + ' ✓');
      setModalOpen(false); setForm({ type: 'task', subject: '', description: '', contact_id: '', deal_id: '', due_date: '' }); load();
    } catch (e) { toast.error(e.message); }
  };

  const toggleDone = async (act) => {
    try {
      await put(`/api/activities/${act.id}`, { ...act, completed: act.completed ? 0 : 1 });
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    try { await del(`/api/activities/${id}`); toast.success(t('delete') + ' ✓'); load(); } catch (e) { toast.error(e.message); }
  };

  const typeIcons = { task: CheckSquare, call: Phone, meeting: Users, email: Mail };
  const typeColors = { task: '#6b7280', call: '#3b82f6', meeting: '#8b5cf6', email: '#f59e0b' };

  const isOverdue = (a) => !a.completed && a.due_date && new Date(a.due_date) < new Date();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('activities')}</h1>
          <p className="page-subtitle">{activities.length} {t('all_activities').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> {t('new_activity')}</button>
      </div>

      <div className="page-filters">
        <TabBar
          tabs={[{ value: '', label: t('all') }, { value: 'task', label: t('task') }, { value: 'call', label: t('call') }, { value: 'meeting', label: t('meeting') }, { value: 'email', label: t('email') }]}
          active={filterType} onChange={setFilterType}
        />
        <TabBar
          tabs={[{ value: '', label: t('all') }, { value: '0', label: t('pending') }, { value: '1', label: t('completed') }]}
          active={filterCompleted} onChange={setFilterCompleted}
        />
      </div>

      {loading ? <Spinner /> : activities.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t('no_results')} />
      ) : (
        <div className="activities-list">
          {activities.map(a => {
            const Icon = typeIcons[a.type] || CheckSquare;
            return (
              <div key={a.id} className={`activity-item ${a.completed ? 'done' : ''} ${isOverdue(a) ? 'overdue' : ''}`}>
                <button className="activity-check" onClick={() => toggleDone(a)}>
                  {a.completed ? '✓' : ''}
                </button>
                <div className="activity-icon" style={{ background: typeColors[a.type] + '18', color: typeColors[a.type] }}>
                  <Icon size={18} />
                </div>
                <div className="activity-info">
                  <div className="activity-subject">{a.subject}</div>
                  <div className="activity-meta">
                    <Badge color={typeColors[a.type]}>{t(a.type)}</Badge>
                    {a.contact_name && <span className="activity-contact">{a.contact_name}</span>}
                    {a.deal_title && <span className="activity-deal">{a.deal_title}</span>}
                  </div>
                  {a.description && <p className="activity-desc">{a.description}</p>}
                </div>
                <div className="activity-right">
                  <span className={`activity-date ${isOverdue(a) ? 'overdue' : ''}`}>
                    {a.due_date ? new Date(a.due_date).toLocaleDateString('fr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <button className="icon-btn-sm" onClick={() => handleDelete(a.id)} title={t('delete')}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('new_activity')}>
        <Select label={t('type')} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
          options={[{ value: 'task', label: t('task') }, { value: 'call', label: t('call') }, { value: 'meeting', label: t('meeting') }, { value: 'email', label: t('email') }]} />
        <Input label={t('subject') + ' *'} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        <Textarea label={t('description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
        <Select label={t('contact')} value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}
          options={contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} placeholder={t('all')} />
        <Select label={t('deal')} value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}
          options={deals.map(d => ({ value: d.id, label: d.title }))} placeholder={t('all')} />
        <Input label={t('due_date')} type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave}>{t('create')}</button>
        </div>
      </Modal>
    </div>
  );
}
