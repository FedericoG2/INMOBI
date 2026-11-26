import { Button } from './Button';
import { Modal } from './Modal';
import './ConfirmDialog.css';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  children,
  note,
  warning,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  size = 'small',
  icon,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size={size} icon={icon}>
      <div className="confirm-dialog">
        <p>{message}</p>
        {children}
        {note && <p className="confirm-note">{note}</p>}
        {warning && <p className="confirm-warning">{warning}</p>}
        <div className="confirm-actions">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} disabled={busy}>
            {busy ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
