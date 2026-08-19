import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { useConfirm } from '../components/confirm.jsx';
import { SearchInput, Modal, Input, Select, Textarea, Spinner, EmptyState } from '../components/ui.jsx';
import { Plus, Building2, Users, DollarSign, Globe } from 'lucide-react';

export default function Companies() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', industry: '', website: '', phone: '', email: '', address: '', city: '', country: 'Mauritanie', size: '', annual_revenue: 0, notes: '' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const c = await get(`/api/companies?${params}`);
    setCompanies(c); setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const openNew = () => { setEditing(null); setForm({ name: '', industry: '', website: '', phone: '', email: '', address: '', city: '', country: 'Mauritanie', size: '', annual_revenue: 0, notes: '' }); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, industry: c.industry || '', website: c.website || '', phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '', country: c.country || 'Mauritanie', size: c.size || '', annual_revenue: c.annual_revenue || 0, notes: c.notes || '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    try {
      if (editing) { await put(`/api/companies/${editing.id}`, form); toast.success(t('save') + ' ✓'); }
      else { await post('/api/companies', form); toast.success(t('create') + ' ✓'); }
      setModalOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: t('delete'), message: t('confirm_delete'), type: 'danger', confirmText: t('delete'), cancelText: t('cancel') });
    if (!ok) return;
    try { await del(`/api/companies/${id}`); toast.success(t('delete') + ' ✓'); load(); } catch (e) { toast.error(e.message); }
  };

  const fmt = (v) => new Intl.NumberFormat('fr-MR').format(v || 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('companies')}</h1>
          <p className="page-subtitle">{companies.length} {t('all_companies').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> {t('new_company')}</button>
      </div>

      <div className="page-filters">
        <SearchInput value={search} onChange={setSearch} placeholder={t('search') + '...'} />
      </div>

      {loading ? <Spinner /> : companies.length === 0 ? (
        <EmptyState icon={Building2} title={t('no_results')} />
      ) : (
        <div className="companies-grid">
          {companies.map(c => (
            <div key={c.id} className="company-card" onClick={() => navigate(`/companies/${c.id}`)}>
              <div className="company-card-header">
                <div className="company-icon"><Building2 size={24} /></div>
                <div className="company-card-info">
                  <div className="company-card-name">{c.name}</div>
                  <div className="company-card-industry">{c.industry || '—'}</div>
                </div>
              </div>
              <div className="company-card-stats">
                <div className="company-stat">
                  <Users size={14} />
                  <span>{c.contacts_count || 0} contacts</span>
                </div>
                <div className="company-stat">
                  <DollarSign size={14} />
                  <span>{fmt(c.annual_revenue)} MRU</span>
                </div>
              </div>
              <div className="company-card-footer">
                {c.city && <span>{c.city}, {c.country}</span>}
                {c.website && <span><Globe size={12} /> {c.website}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('new_company')} size="lg">
        <div className="form-grid">
          <Input label={t('name') + ' *'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label={t('industry')} value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
          <Input label={t('website')} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
          <Input label={t('phone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('email')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label={t('address')} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label={t('city')} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          <Input label={t('country')} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
          <Select label={t('size')} value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
            options={[{ value: 'Startup', label: 'Startup' }, { value: 'Petite', label: 'Petite' }, { value: 'Moyenne', label: 'Moyenne' }, { value: 'PME', label: 'PME' }, { value: 'Grande', label: 'Grande' }]} placeholder={t('all')} />
          <Input label={t('annual_revenue')} type="number" value={form.annual_revenue} onChange={e => setForm({ ...form, annual_revenue: Number(e.target.value) })} />
          <div className="form-group full-width">
            <Textarea label={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
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
