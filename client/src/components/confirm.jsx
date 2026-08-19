import { useState, useCallback, createContext, useContext } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleResult = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => handleResult(false)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-handle" />
            <div className={`confirm-icon confirm-icon-${state.type || 'danger'}`}>
              {state.type === 'info' ? <Info size={28} /> : <AlertTriangle size={28} />}
            </div>
            <h3 className="confirm-title">{state.title}</h3>
            <p className="confirm-msg">{state.message}</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-cancel" onClick={() => handleResult(false)}>
                {state.cancelText || 'Annuler'}
              </button>
              <button className={`confirm-btn confirm-ok confirm-ok-${state.type || 'danger'}`} onClick={() => handleResult(true)}>
                {state.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() { return useContext(ConfirmContext); }
