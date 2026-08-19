import { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, ...props }, ref) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input ref={ref} className={`form-input ${error ? 'error' : ''}`} {...props} />
    {error && <span className="form-error">{error}</span>}
  </div>
));

export const Select = forwardRef(({ label, error, options = [], placeholder, ...props }, ref) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <select ref={ref} className={`form-select ${error ? 'error' : ''}`} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <span className="form-error">{error}</span>}
  </div>
));

export const Textarea = forwardRef(({ label, error, ...props }, ref) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <textarea ref={ref} className={`form-textarea ${error ? 'error' : ''}`} {...props} />
    {error && <span className="form-error">{error}</span>}
  </div>
));

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = '#6b7280', dot }) {
  return (
    <span className="badge" style={{ background: color + '22', color, borderColor: color + '44' }}>
      {dot && <span className="badge-dot" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} className="empty-icon" />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Avatar({ name, color, size = 40 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: color || '#6366f1' }}>
      {initials}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = '#6366f1', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '18', color }}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="search-input-wrapper">
      <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.value}
          className={`tab ${active === tab.value ? 'active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
