import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Spinner } from '../components/ui.jsx';
import {
  UserPlus, Shield, ShieldOff, Trash2, Edit3, Eye, EyeOff, X, Check
} from 'lucide-react';

const ALL_PAGES = ['dashboard', 'contacts', 'companies', 'pipeline', 'activities', 'settings'];

export default function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', pin: '', role: 'USER', permissions: {} });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await get('/api/users');
      setUsers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', pin: '', role: 'USER', permissions: { dashboard: true, contacts: true, companies: true, pipeline: true, activities: true, settings: true } });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name, phone: u.phone, pin: '', role: u.role,
      permissions: { ...u.permissions }
    });
    setError('');
    setShowModal(true);
  };

  const togglePerm = (page) => {
    setForm(f => ({
      ...f,
      permissions: { ...f.permissions, [page]: !f.permissions[page] }
    }));
  };

  const selectAll = () => {
    const all = {};
    ALL_PAGES.forEach(p => all[p] = true);
    setForm(f => ({ ...f, permissions: all }));
  };

  const selectNone = () => {
    const none = {};
    ALL_PAGES.forEach(p => none[p] = false);
    setForm(f => ({ ...f, permissions: none }));
  };

  const save = async () => {
    setError('');
    if (!form.name || !form.phone) { setError('Nom et téléphone requis'); return; }
    if (!editing && !form.pin) { setError('PIN requis'); return; }
    try {
      if (editing) {
        const body = { name: form.name, phone: form.phone, role: form.role, permissions: form.permissions };
        if (form.pin) body.pin = form.pin;
        await put(`/api/users/${editing.id}`, body);
      } else {
        await post('/api/users', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erreur');
    }
  };

  const toggleActive = async (u) => {
    try {
      await put(`/api/users/${u.id}`, { active: !u.active });
      load();
    } catch {}
  };

  const deleteUser = async (u) => {
    if (!confirm(`Supprimer ${u.name} ?`)) return;
    try {
      await del(`/api/users/${u.id}`);
      load();
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;
  if (user?.role !== 'ADMIN') return <div className="page-error">{t('access_denied')}</div>;

  const colors = { ADMIN: '#ef4444', MANAGER: '#f59e0b', USER: '#6366f1' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('users_management')}</h1>
          <p className="page-subtitle">{users.length} {t('users')}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <UserPlus size={16} /> {t('add_user')}
        </button>
      </div>

      <div className="users-list">
        {users.map(u => (
          <div key={u.id} className={`user-card ${!u.active ? 'user-inactive' : ''}`}>
            <div className="user-card-header">
              <div className="user-avatar" style={{ background: u.avatar_color || '#6366f1' }}>
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="user-card-info">
                <div className="user-card-name">{u.name}</div>
                <div className="user-card-phone">{u.phone}</div>
              </div>
              <span className="badge" style={{
                background: colors[u.role] + '15',
                color: colors[u.role],
                borderColor: colors[u.role] + '30'
              }}>
                {u.role}
              </span>
            </div>
            <div className="user-card-perms">
              {ALL_PAGES.map(p => (
                <span key={p} className={`perm-dot ${u.permissions?.[p] ? 'perm-on' : 'perm-off'}`}>
                  {u.permissions?.[p] ? <Eye size={10} /> : <EyeOff size={10} />}
                  {t(p)}
                </span>
              ))}
            </div>
            <div className="user-card-actions">
              <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>
                <Edit3 size={12} /> {t('edit')}
              </button>
              <button className={`btn btn-sm ${u.active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleActive(u)}>
                {u.active ? <><ShieldOff size={12} /> {t('deactivate')}</> : <><Shield size={12} /> {t('activate')}</>}
              </button>
              {u.role !== 'ADMIN' && (
                <button className="btn btn-sm btn-danger-outline" onClick={() => deleteUser(u)}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? t('edit_user') : t('add_user')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">{t('name')}</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('phone')}</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g,'').slice(0,8)})} maxLength={8} inputMode="numeric" />
              </div>
              <div className="form-group">
                <label className="form-label">{editing ? t('new_pin_optional') : t('pin')}</label>
                <input className="form-input" type="password" inputMode="numeric" value={form.pin} onChange={e => setForm({...form, pin: e.target.value.replace(/\D/g,'').slice(0,6)})} maxLength={6} placeholder={editing ? '••••' : ''} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('role')}</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="USER">{t('user')}</option>
                  <option value="MANAGER">{t('manager')}</option>
                  <option value="ADMIN">{t('admin')}</option>
                </select>
              </div>
              <div className="form-group">
                <div className="perm-header">
                  <label className="form-label">{t('page_access')}</label>
                  <div className="perm-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={selectAll}>{t('all')}</button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={selectNone}>{t('none')}</button>
                  </div>
                </div>
                <div className="perm-grid">
                  {ALL_PAGES.map(p => (
                    <button key={p} type="button" className={`perm-toggle ${form.permissions[p] ? 'perm-active' : ''}`} onClick={() => togglePerm(p)}>
                      {form.permissions[p] ? <Check size={14} /> : <X size={14} />}
                      {t(p)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button className="btn btn-primary" onClick={save}>{editing ? t('save') : t('create')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
