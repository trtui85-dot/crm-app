import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { useConfirm } from '../components/confirm.jsx';
import { Modal, Input, Select, Textarea, Badge, Spinner, EmptyState, SearchInput, TabBar } from '../components/ui.jsx';
import { Plus, GitBranch, DollarSign, GripVertical } from 'lucide-react';

export default function Pipeline() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', contact_id: '', company_id: '', stage_id: '', expected_revenue: 0, probability: 0, close_date: '', description: '' });
  const [dragging, setDragging] = useState(null);

  const load = async () => {
    setLoading(true);
    const [d, s, c, co] = await Promise.all([
      get(`/api/deals${search ? '?search=' + search : ''}`),
      get('/api/deals/stages'),
      get('/api/contacts?limit=200'),
      get('/api/companies?limit=200'),
    ]);
    setDeals(d); setStages(s); setContacts(c); setCompanies(co); setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const openNew = (stageId) => { setEditing(null); setForm({ title: '', contact_id: '', company_id: '', stage_id: stageId || stages[0]?.id || 1, expected_revenue: 0, probability: 0, close_date: '', description: '' }); setModalOpen(true); };
  const openEdit = (deal) => { setEditing(deal); setForm({ title: deal.title, contact_id: deal.contact_id || '', company_id: deal.company_id || '', stage_id: deal.stage_id, expected_revenue: deal.expected_revenue || 0, probability: deal.probability || 0, close_date: deal.close_date ? deal.close_date.split('T')[0] : '', description: deal.description || '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titre requis'); return; }
    try {
      if (editing) { await put(`/api/deals/${editing.id}`, form); toast.success(t('save') + ' ✓'); }
      else { await post('/api/deals', form); toast.success(t('create') + ' ✓'); }
      setModalOpen(false); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: t('delete'), message: t('confirm_delete'), type: 'danger', confirmText: t('delete'), cancelText: t('cancel') });
    if (!ok) return;
    try { await del(`/api/deals/${id}`); toast.success(t('delete') + ' ✓'); load(); } catch (e) { toast.error(e.message); }
  };

  const moveToStage = async (dealId, newStageId) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;
    try {
      await put(`/api/deals/${dealId}`, { ...deal, stage_id: newStageId });
      toast.success('Deal mis à jour'); load();
    } catch (e) { toast.error(e.message); }
  };

  const onDragStart = (e, dealId) => { setDragging(dealId); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (e, stageId) => { e.preventDefault(); if (dragging) { moveToStage(dragging, stageId); setDragging(null); } };

  const fmt = (v) => new Intl.NumberFormat('fr-MR').format(v || 0);
  const getColor = (s) => s.win_status ? '#22c55e' : s.loss_status ? '#ef4444' : '#6366f1';

  if (loading) return <Spinner />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('pipeline')}</h1>
          <p className="page-subtitle">{deals.length} deals · {fmt(deals.filter(d => !stages.find(s => s.id === d.stage_id)?.win_status && !stages.find(s => s.id === d.stage_id)?.loss_status).reduce((a, d) => a + Number(d.expected_revenue), 0))} MRU</p>
        </div>
        <div className="header-actions">
          <TabBar tabs={[{ value: 'kanban', label: t('kanban') }, { value: 'list', label: t('list') }]} active={view} onChange={setView} />
          <button className="btn btn-primary" onClick={() => openNew()}><Plus size={18} /> {t('new_deal')}</button>
        </div>
      </div>

      <div className="page-filters">
        <SearchInput value={search} onChange={setSearch} placeholder={t('search') + '...'} />
      </div>

      {view === 'kanban' ? (
        <div className="pipeline-board">
          {stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage_id === stage.id);
            const total = stageDeals.reduce((a, d) => a + Number(d.expected_revenue), 0);
            return (
              <div key={stage.id} className="pipeline-column" onDragOver={onDragOver} onDrop={e => onDrop(e, stage.id)}>
                <div className="pipeline-column-header">
                  <Badge color={stage.color} dot>{stage.name}</Badge>
                  <span className="pipeline-col-count">{stageDeals.length} · {fmt(total)} MRU</span>
                </div>
                <div className="pipeline-column-body">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className={`pipeline-card ${dragging === deal.id ? 'dragging' : ''}`}
                      draggable onDragStart={e => onDragStart(e, deal.id)} onClick={() => openEdit(deal)}>
                      <div className="pipeline-card-title">{deal.title}</div>
                      <div className="pipeline-card-contact">{deal.contact_name || '—'}</div>
                      <div className="pipeline-card-footer">
                        <span className="pipeline-card-value">{fmt(deal.expected_revenue)} MRU</span>
                        <span className="pipeline-card-prob">{deal.probability}%</span>
                      </div>
                      {deal.close_date && (
                        <div className="pipeline-card-date">
                          {new Date(deal.close_date).toLocaleDateString('fr')}
                        </div>
                      )}
                    </div>
                  ))}
                  {stageDeals.length === 0 && <div className="pipeline-empty">Glisser un deal ici</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="deals-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('deal')}</th>
                <th>{t('contact')}</th>
                <th>{t('stage')}</th>
                <th>{t('expected_revenue')}</th>
                <th>{t('probability')}</th>
                <th>{t('close_date')}</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} onClick={() => openEdit(d)} className="clickable-row">
                  <td className="font-medium">{d.title}</td>
                  <td>{d.contact_name || '—'}</td>
                  <td><Badge color={stages.find(s => s.id === d.stage_id)?.color}>{d.stage_name}</Badge></td>
                  <td>{fmt(d.expected_revenue)} MRU</td>
                  <td>{d.probability}%</td>
                  <td>{d.close_date ? new Date(d.close_date).toLocaleDateString('fr') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('new_deal')} size="lg">
        <div className="form-grid">
          <Input label={t('deal') + ' *'} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Select label={t('stage')} value={form.stage_id} onChange={e => setForm({ ...form, stage_id: Number(e.target.value) })}
            options={stages.map(s => ({ value: s.id, label: s.name }))} />
          <Select label={t('contact')} value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}
            options={contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} placeholder={t('all')} />
          <Select label={t('company')} value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
            options={companies.map(c => ({ value: c.id, label: c.name }))} placeholder={t('all')} />
          <Input label={t('expected_revenue')} type="number" value={form.expected_revenue} onChange={e => setForm({ ...form, expected_revenue: Number(e.target.value) })} />
          <Input label={t('probability') + ' %'} type="number" value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })} min={0} max={100} />
          <Input label={t('close_date')} type="date" value={form.close_date} onChange={e => setForm({ ...form, close_date: e.target.value })} />
          <div className="form-group full-width">
            <Textarea label={t('description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
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
