import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { Globe, User, Shield } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('crm_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('settings')}</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3><Globe size={18} /> {t('language')}</h3>
          <p className="settings-desc">Choisir la langue de l'interface</p>
          <div className="lang-options">
            <button className={`lang-btn ${i18n.language === 'fr' ? 'active' : ''}`} onClick={() => { i18n.changeLanguage('fr'); localStorage.setItem('crm_lang', 'fr'); }}>
              🇫🇷 Français
            </button>
            <button className={`lang-btn ${i18n.language === 'ar' ? 'active' : ''}`} onClick={() => { i18n.changeLanguage('ar'); localStorage.setItem('crm_lang', 'ar'); document.documentElement.dir = 'rtl'; }}>
              🇲🇷 العربية
            </button>
          </div>
        </div>

        <div className="settings-card">
          <h3><User size={18} /> {t('owner')}</h3>
          <div className="settings-user">
            <div className="user-avatar-lg" style={{ background: user?.avatar_color || '#6366f1' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="settings-user-name">{user?.name}</div>
              <div className="settings-user-email">{user?.email}</div>
              <div className="settings-user-role"><Shield size={14} /> {user?.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
