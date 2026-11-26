import { useEffect } from 'react';
import './Modal.css';

export function Modal({ isOpen, onClose, title, subtitle, icon, children, size = 'medium', tall = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}${tall ? ' modal-tall' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-header${icon ? ' modal-header-rich' : ''}`}>
          <div className="modal-heading">
            {icon && <span className="modal-icon">{icon}</span>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
