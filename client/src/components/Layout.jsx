import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { ToastProvider } from './toast.jsx';
import {
  LayoutDashboard, Users, Building2, GitBranch, CalendarCheck, Settings,
  Menu, X, LogOut, Globe, UserCog
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard', perm: 'dashboard' },
  { path: '/contacts', icon: Users, labelKey: 'contacts', perm: 'contacts' },
  { path: '/companies', icon: Building2, labelKey: 'companies', perm: 'companies' },
  { path: '/pipeline', icon: GitBranch, labelKey: 'pipeline', perm: 'pipeline' },
  { path: '/activities', icon: CalendarCheck, labelKey: 'activities', perm: 'activities' },
  { path: '/settings', icon: Settings, labelKey: 'settings', perm: 'settings' },
];

const bottomNavItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard', perm: 'dashboard' },
  { path: '/contacts', icon: Users, labelKey: 'contacts', perm: 'contacts' },
  { path: '/pipeline', icon: GitBranch, labelKey: 'pipeline', perm: 'pipeline' },
  { path: '/activities', icon: CalendarCheck, labelKey: 'activities', perm: 'activities' },
  { path: '/settings', icon: Settings, labelKey: 'settings', perm: 'settings' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isRtl = i18n.language === 'ar';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const canSee = (perm) => isAdmin || user?.permissions?.[perm];

  const visibleNav = navItems.filter(n => canSee(n.perm));
  const visibleBottomNav = bottomNavItems.filter(n => canSee(n.perm));

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('crm_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const pageTitle = visibleNav.find(n => {
    if (n.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(n.path);
  });

  const renderSidebar = () => (
    <>
      <div className="sidebar-header">
        <div className="logo">
          <img src="/logo-192.png" alt="CRM" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">CRM</span>
        </div>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {visibleNav.map(item => (
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
        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <UserCog size={20} />
            <span>{t('users')}</span>
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar" style={{ background: user?.avatar_color || '#6366f1' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.phone}</div>
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
    </>
  );

  return (
    <ToastProvider>
      <div className={`app-layout ${isRtl ? 'rtl' : 'ltr'}`}>
        {!isMobile && (
          <>
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
              {renderSidebar()}
            </aside>
          </>
        )}
        <main className={`main-content ${isMobile ? 'no-sidebar' : ''}`}>
          {isMobile ? (
            <header className="topbar-mobile">
              <span className="topbar-mobile-title">{t(pageTitle?.labelKey || 'dashboard')}</span>
              <div className="topbar-mobile-actions">
                <button className="icon-btn" onClick={toggleLang}>
                  <Globe size={18} />
                </button>
                <button className="icon-btn" onClick={logout}>
                  <LogOut size={18} />
                </button>
              </div>
            </header>
          ) : (
            <header className="topbar">
              <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={22} />
              </button>
              <div className="topbar-spacer" />
            </header>
          )}
          <div className={`page-content ${isMobile ? 'page-content-mobile' : ''}`}>
            <Outlet />
          </div>
        </main>
        {isMobile && (
          <nav className="bottom-bar">
            {visibleBottomNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `bottom-bar-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </ToastProvider>
  );
}
