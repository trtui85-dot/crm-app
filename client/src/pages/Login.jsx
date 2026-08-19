import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { Lock, Mail, Globe } from 'lucide-react';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const toggleLang = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('crm_lang', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !pin) { setError('Veuillez remplir tous les champs'); return; }
    try {
      await login(email, pin);
    } catch {
      setError('Identifiants incorrects');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">CRM</div>
          <h1>{t('login_title')}</h1>
          <p>{t('login_subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">{t('email_address')}</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                className="form-input"
                placeholder="admin@crm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('pin')}</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                className="form-input"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={8}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t('loading') : t('login')}
          </button>
        </form>
        <button className="lang-toggle" onClick={toggleLang}>
          <Globe size={16} /> {i18n.language === 'fr' ? 'العربية' : 'Français'}
        </button>
      </div>
    </div>
  );
}
