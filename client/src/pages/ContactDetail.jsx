import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { Spinner, Badge, Avatar, Modal, Input, Select, Textarea } from '../components/ui.jsx';
import { ArrowLeft, Phone, Mail, Building2, Calendar, Tag, FileText, Edit, Trash2 } from 'lucide-react';

export default function ContactDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [newNote, setNewNote] = useState('');
  const [newActivity, setNewActivity] = useState({ type: 'task', subject: '', description: '', due_date: '' });
  const [actOpen, setActOpen] = useState(false);

  const load = async () => {
    try {
      const c = await get(`/api/contacts/${id}`);
      setContact(c); setForm(c);
    } catch { navigate('/contacts'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    try {
      await put(`/api/contacts/${id}`, form);
      toast.success(t('save') + ' ✓');
      setEditOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirm_delete'))) return;
    try { await del(`/api/contacts/${id}`); toast.success(t('delete') + ' ✓'); navigate('/contacts'); } catch (e) { toast.error(e.message); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    await post('/api/deals', {}); // placeholder
    setNewNote(''); toast.success(t('save') + ' ✓'); load();
  };

  const addActivity = async () => {
    if (!newActivity.subject) { toast.error('Sujet requis'); return; }
    await post('/api/activities', { ...newActivity, contact_id: Number(id) });
    setActOpen(false); setNewActivity({ type: 'task', subject: '', description: '', due_date: '' });
    toast.success(t('create') + ' ✓'); load();
  };

  const toggleActivityDone = async (act) => {
    await put(`/api/activities/${act.id}`, { ...act, completed: act.completed ? 0 : 1 });
    load();
  };

  if (loading) return <Spinner />;
  if (!contact) return null;

  const statusColors = { lead: '#6366f1', prospect: '#f59e0b', customer: '#22c55e' };

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> {t('back')}</button>

      <div className="detail-header">
        <Avatar name={`${contact.first_name} ${contact.last_name || ''}`} color={contact.avatar_color} size={64} />
        <div className="detail-header-info">
          <h1>{contact.first_name} {contact.last_name}</h1>
          <p>{contact.position || '—'} {contact.company_name ? `· ${contact.company_name}` : ''}</p>
          <div className="detail-badges">
            <Badge color={statusColors[contact.status]}>{t(contact.status)}</Badge>
            {contact.tags?.map(tg => <Badge key={tg.id} color={tg.color}>{tg.name}</Badge>)}
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}><Edit size={16} /> {t('edit')}</button>
          <button className="btn btn-danger-outline" onClick={handleDelete}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3><Phone size={18} /> {t('phone')}</h3>
          <p>{contact.phone || '—'}</p>
          {contact.mobile && <p className="sub-text">Mobile: {contact.mobile}</p>}
          <h3 style={{ marginTop: 16 }}><Mail size={18} /> {t('email')}</h3>
          <p>{contact.email || '—'}</p>
          <h3 style={{ marginTop: 16 }}><Building2 size={18} /> {t('company')}</h3>
          <p>{contact.company_name || '—'}</p>
        </div>

        <div className="detail-card">
          <div className="detail-card-header">
            <h3><Tag size={18} /> {t('deals')}</h3>
          </div>
          {contact.deals?.length === 0 ? (
            <p className="empty-text">Aucun deal</p>
          ) : (
            <div className="detail-deals">
              {contact.deals?.map(d => (
                <Link key={d.id} to={`/pipeline`} className="detail-deal-item">
                  <span>{d.title}</span>
                  <Badge color={d.stage_name === 'Gagné' ? '#22c55e' : d.stage_name === 'Perdu' ? '#ef4444' : '#f59e0b'}>{d.stage_name}</Badge>
                  <span className="detail-deal-value">{new Intl.NumberFormat('fr-MR').format(d.expected_revenue)} MRU</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="detail-card">
          <div className="detail-card-header">
            <h3><Calendar size={18} /> {t('activities')}</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setActOpen(true)}>+ {t('new_activity')}</button>
          </div>
          {contact.activities?.length === 0 ? (
            <p className="empty-text">Aucune activité</p>
          ) : (
            <div className="detail-activities">
              {contact.activities?.map(a => (
                <div key={a.id} className={`detail-activity-item ${a.completed ? 'done' : ''}`}>
                  <button className="activity-check" onClick={() => toggleActivityDone(a)}>
                    {a.completed ? '✓' : ''}
                  </button>
                  <div className="detail-activity-info">
                    <span>{a.subject}</span>
                    <span className="sub-text">{t(a.type)} · {a.due_date ? new Date(a.due_date).toLocaleDateString('fr') : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="detail-card">
          <h3><FileText size={18} /> {t('notes')}</h3>
          {contact.notes?.length === 0 ? (
            <p className="empty-text">Aucune note</p>
          ) : (
            <div className="detail-notes">
              {contact.notes?.map(n => (
                <div key={n.id} className="detail-note">
                  <p>{n.content}</p>
                  <span className="sub-text">{n.author_name} · {new Date(n.created_at).toLocaleDateString('fr')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('edit')}>
        <div className="form-grid">
          <Input label={t('name') + ' *'} value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          <Input label="Prénom" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          <Input label={t('email')} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label={t('phone')} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('mobile')} value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <Input label={t('position')} value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} />
          <Select label={t('status')} value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'lead', label: t('lead') }, { value: 'prospect', label: t('prospect') }, { value: 'customer', label: t('customer') }]} />
          <Select label={t('source')} value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })}
            options={[{ value: 'manual', label: t('manual') }, { value: 'website', label: t('website_source') }, { value: 'referral', label: t('referral') }, { value: 'cold_call', label: t('cold_call') }, { value: 'social', label: t('social') }, { value: 'event', label: t('event') }]} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave}>{t('save')}</button>
        </div>
      </Modal>

      <Modal open={actOpen} onClose={() => setActOpen(false)} title={t('new_activity')}>
        <Select label={t('type')} value={newActivity.type} onChange={e => setNewActivity({ ...newActivity, type: e.target.value })}
          options={[{ value: 'task', label: t('task') }, { value: 'call', label: t('call') }, { value: 'meeting', label: t('meeting') }, { value: 'email', label: t('email') }]} />
        <Input label={t('subject') + ' *'} value={newActivity.subject} onChange={e => setNewActivity({ ...newActivity, subject: e.target.value })} />
        <Textarea label={t('description')} value={newActivity.description} onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} rows={3} />
        <Input label={t('due_date')} type="datetime-local" value={newActivity.due_date} onChange={e => setNewActivity({ ...newActivity, due_date: e.target.value })} />
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setActOpen(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={addActivity}>{t('create')}</button>
        </div>
      </Modal>
    </div>
  );
}
