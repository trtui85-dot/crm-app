import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let successAudio = null;
if (typeof window !== 'undefined') {
  successAudio = new Audio('/sonsucces.mp3');
  successAudio.volume = 0.5;
}

function playSound(type) {
  if (type === 'success' && successAudio) {
    successAudio.currentTime = 0;
    successAudio.play().catch(() => {});
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    playSound(type);
    setToasts(prev => [...prev, { id, message, type, entering: true }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t));
    }, 50);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#34C759"/>
        <path d="M6 10.5L8.5 13L14 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#FF3B30"/>
        <path d="M7 7L13 13M13 7L7 13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#007AFF"/>
        <path d="M10 9V14M10 6.5V7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`apple-toast apple-toast-${t.type} ${t.entering ? 'entering' : ''} ${t.leaving ? 'leaving' : ''}`}
          >
            <div className="apple-toast-icon">{icons[t.type]}</div>
            <span className="apple-toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
