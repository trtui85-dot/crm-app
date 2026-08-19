import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { ToastProvider } from './toast.jsx';
import {
  LayoutDashboard, Users, Building2, GitBranch, CalendarCheck, Settings,
  Menu, X, LogOut, Globe
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard' },
  { path: '/contacts', icon: Users, labelKey: 'contacts' },
  { path: '/companies', icon: Building2, labelKey: 'companies' },
  { path: '/pipeline', icon: GitBranch, labelKey: 'pipeline' },
  { path: '/activities', icon: CalendarCheck, labelKey: 'activities' },
  { path: '/settings', icon: Settings, labelKey: 'settings' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRtl = i18n.language === 'ar';

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('crm_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <ToastProvider>
      <div className={`app-layout ${isRtl ? 'rtl' : 'ltr'}`}>
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">CRM</div>
            </div>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar" style={{ background: user?.avatar_color || '#6366f1' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
            <div className="sidebar-actions">
              <button className="icon-btn" onClick={toggleLang} title={t('language')}>
                <Globe size={18} />
              </button>
              <button className="icon-btn" onClick={logout} title={t('logout')}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <header className="topbar">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="topbar-spacer" />
          </header>
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
