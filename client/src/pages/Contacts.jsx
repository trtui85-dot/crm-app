import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { SearchInput, Badge, Avatar, Modal, Input, Select, Spinner, EmptyState, TabBar } from '../components/ui.jsx';
import { Plus, Users, Phone, Mail } from 'lucide-react';

export default function Contacts() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', mobile: '', position: '', company_id: '', source: 'manual', status: 'lead', tags: [] });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    const [c, co, tg] = await Promise.all([
      get(`/api/contacts?${params}`),
      get('/api/companies?limit=200'),
      get('/api/tags'),
    ]);
    setContacts(c); setCompanies(co); setTags(tg); setLoading(false);
  };

  useEffect(() => { load(); }, [search, filterStatus]);

  const openNew = () => { setEditing(null); setForm({ first_name: '', last_name: '', email: '', phone: '', mobile: '', position: '', company_id: '', source: 'manual', status: 'lead', tags: [] }); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ first_name: c.first_name, last_name: c.last_name || '', email: c.email || '', phone: c.phone || '', mobile: c.mobile || '', position: c.position || '', company_id: c.company_id || '', source: c.source || 'manual', status: c.status || 'lead', tags: c.tags?.map(t => t.id) || [] }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.first_name) { toast.error('Nom requis'); return; }
    try {
      if (editing) { await put(`/api/contacts/${editing.id}`, form); toast.success(t('save') + ' ✓'); }
      else { await post('/api/contacts', form); toast.success(t('create') + ' ✓'); }
      setModalOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    try { await del(`/api/contacts/${id}`); toast.success(t('delete') + ' ✓'); load(); } catch (e) { toast.error(e.message); }
  };

  const statusColors = { lead: '#6366f1', prospect: '#f59e0b', customer: '#22c55e' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('contacts')}</h1>
          <p className="page-subtitle">{contacts.length} {t('all_contacts').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> {t('new_contact')}</button>
      </div>

      <div className="page-filters">
        <SearchInput value={search} onChange={setSearch} placeholder={t('search') + '...'} />
        <TabBar
          tabs={[{ value: '', label: t('all') }, { value: 'lead', label: t('leads') }, { value: 'prospect', label: t('prospects') }, { value: 'customer', label: t('customers') }]}
          active={filterStatus}
          onChange={setFilterStatus}
        />
      </div>

      {loading ? <Spinner /> : contacts.length === 0 ? (
        <EmptyState icon={Users} title={t('no_results')} description={t('no_results')} />
      ) : (
        <div className="contacts-grid">
          {contacts.map(c => (
            <div key={c.id} className="contact-card" onClick={() => navigate(`/contacts/${c.id}`)}>
              <div className="contact-card-header">
                <Avatar name={`${c.first_name} ${c.last_name || ''}`} color={c.avatar_color} size={44} />
                <div className="contact-card-info">
                  <div className="contact-card-name">{c.first_name} {c.last_name}</div>
                  <div className="contact-card-company">{c.company_name || '—'}</div>
                </div>
                <Badge color={statusColors[c.status] || '#6b7280'}>{t(c.status)}</Badge>
              </div>
              <div className="contact-card-details">
                {c.position && <span>{c.position}</span>}
                {c.phone && <span><Phone size={13} /> {c.phone}</span>}
                {c.email && <span><Mail size={13} /> {c.email}</span>}
              </div>
              {c.tags?.length > 0 && (
                <div className="contact-card-tags">
                  {c.tags.map(tg => <Badge key={tg.id} color={tg.color}>{tg.name}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('new_contact')}>
        <div className="form-grid">
          <Input label={t('name') + ' *'} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          <Input label="Prénom" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          <Input label={t('email')} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label={t('phone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('mobile')} value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <Input label={t('position')} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
          <Select label={t('company')} value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
            options={companies.map(c => ({ value: c.id, label: c.name }))} placeholder={t('all')} />
          <Select label={t('status')} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'lead', label: t('lead') }, { value: 'prospect', label: t('prospect') }, { value: 'customer', label: t('customer') }]} />
          <Select label={t('source')} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
            options={[{ value: 'manual', label: t('manual') }, { value: 'website', label: t('website_source') }, { value: 'referral', label: t('referral') }, { value: 'cold_call', label: t('cold_call') }, { value: 'social', label: t('social') }, { value: 'event', label: t('event') }]} />
          <div className="form-group full-width">
            <label className="form-label">{t('tags')}</label>
            <div className="tag-checkboxes">
              {tags.map(tg => (
                <label key={tg.id} className={`tag-checkbox ${form.tags?.includes(tg.id) ? 'selected' : ''}`} style={{ borderColor: tg.color }}>
                  <input type="checkbox" checked={form.tags?.includes(tg.id) || false}
                    onChange={() => {
                      const tags = form.tags || [];
                      setForm({ ...form, tags: tags.includes(tg.id) ? tags.filter(id => id !== tg.id) : [...tags, tg.id] });
                    }} />
                  <span className="tag-checkbox-dot" style={{ background: tg.color }} />
                  {tg.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button>
          {editing && <button className="btn btn-danger" onClick={() => { handleDelete(editing.id); setModalOpen(false); }}>{t('delete')}</button>}
          <button className="btn btn-primary" onClick={handleSave}>{t('save')}</button>
        </div>
      </Modal>
    </div>
  );
}
