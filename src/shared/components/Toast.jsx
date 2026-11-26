import { createContext, useContext, useMemo, useState } from 'react';
import { Icon } from './Icons';
import './Toast.css';

const ToastContext = createContext(null);

const DURACION = { success: 7000, info: 8000, warning: 10000, error: 12000 };
const ICONOS = { success: 'check', info: 'alert', warning: 'alert', error: 'alert' };
const TITULOS = { success: 'Listo', info: 'Información', warning: 'Atención', error: 'Error' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const cerrar = (id) => setToasts((actual) => actual.filter((toast) => toast.id !== id));

  const api = useMemo(() => {
    const push = (tipo, mensaje) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((actual) => [...actual, { id, tipo, mensaje }]);
    };
    return {
      success: (mensaje) => push('success', mensaje),
      error: (mensaje) => push('error', mensaje),
      warning: (mensaje) => push('warning', mensaje),
      info: (mensaje) => push('info', mensaje),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tipo}`} role={toast.tipo === 'error' ? 'alert' : 'status'}>
            <span className="toast-icono"><Icon name={ICONOS[toast.tipo]} size={16} /></span>
            <div className="toast-cuerpo">
              <strong>{TITULOS[toast.tipo]}</strong>
              <span>{toast.mensaje}</span>
            </div>
            <button type="button" className="toast-cerrar" onClick={() => cerrar(toast.id)} aria-label="Cerrar aviso">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <span
              className="toast-progreso"
              style={{ animationDuration: `${DURACION[toast.tipo]}ms` }}
              onAnimationEnd={() => cerrar(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    return {
      success: () => {},
      error: (mensaje) => console.error(mensaje),
      warning: () => {},
      info: () => {},
    };
  }
  return contexto;
}
