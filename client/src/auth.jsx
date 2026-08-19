import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, get } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('crm_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      get('/api/auth/me').then(u => setUser(u)).catch(() => { setUser(null); localStorage.removeItem('crm_user'); localStorage.removeItem('crm_token'); });
    }
  }, []);

  const login = useCallback(async (phone, pin) => {
    setLoading(true);
    try {
      const data = await post('/api/auth/login', { phone, pin });
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/');
    } finally { setLoading(false); }
  }, [navigate]);

  const logout = () => { localStorage.removeItem('crm_token'); localStorage.removeItem('crm_user'); setUser(null); navigate('/login'); };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
