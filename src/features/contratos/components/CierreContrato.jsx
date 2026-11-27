import { useState } from 'react';
import { MOTIVO_CIERRE, MOTIVO_CIERRE_LABELS } from '../../../constants/estados';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { ResumenOperacion } from '../../../shared/components/ResumenOperacion';
import '../../../shared/styles/forms.css';
import './CierreContrato.css';

const EFECTOS = [
  { icono: 'building', texto: 'La propiedad vuelve a estar disponible para alquilar.' },
  { icono: 'calendar', texto: 'Se eliminan los períodos futuros sin comprobantes. Los pagados y el mes en curso se conservan.' },
];

const MOTIVOS = [MOTIVO_CIERRE.ACUERDO_PARTES, MOTIVO_CIERRE.FALTA_PAGO, MOTIVO_CIERRE.OTRO];

// Rescisión de un contrato activo en dos pasos: completar el motivo y confirmar.
// La finalización por vencimiento la hace el sistema, no se carga a mano.
export function CierreContrato({ inquilino, propiedad, fechaFin, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [observaciones, setObservaciones] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  async function confirmar() {
    setProcesando(true);
    try {
      await onConfirmar('rescindir', motivo, observaciones.trim() || null);
    } finally {
      setProcesando(false);
    }
  }

  if (confirmando) {
    return (
      <ConfirmDialog
        isOpen
        title="Confirmar Rescisión"
        icon={<Icon name="file" size={22} />}
        size="medium"
        message="El contrato pasa a estado Rescindido."
        warning="Una vez confirmado, el contrato no se puede reabrir."
        confirmLabel="Rescindir Contrato"
        cancelLabel="Volver"
        variant="danger"
        busy={procesando}
        onConfirm={confirmar}
        onCancel={() => setConfirmando(false)}
      >
        <ResumenOperacion
          datos={[
            ['Inquilino', inquilino],
            ['Propiedad', propiedad],
            ['Motivo', MOTIVO_CIERRE_LABELS[motivo]],
            ...(observaciones.trim() ? [['Observaciones', observaciones.trim()]] : []),
          ]}
          efectos={EFECTOS}
        />
      </ConfirmDialog>
    );
  }

  return (
    <Modal isOpen onClose={onCancelar} title="Rescindir Contrato" icon={<Icon name="file" size={22} />} size="medium">
      <form
        className="cc"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmando(true);
        }}
      >
        <div className="cc-explicacion">
          <p>Se usa cuando el contrato se interrumpe antes de su fecha de fin ({fechaFin}).</p>
          <ul>
            <li>El contrato pasa a estado <strong>Rescindido</strong>.</li>
            {EFECTOS.map((efecto) => <li key={efecto.texto}>{efecto.texto}</li>)}
          </ul>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="motivo_cierre">Motivo de la rescisión *</label>
            <select id="motivo_cierre" value={motivo} onChange={(event) => setMotivo(event.target.value)}>
              {MOTIVOS.map((valor) => (
                <option key={valor} value={valor}>{MOTIVO_CIERRE_LABELS[valor]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="observaciones_cierre">Observaciones</label>
            <textarea
              id="observaciones_cierre"
              rows="3"
              value={observaciones}
              placeholder="Opcional"
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancelar}>Volver</Button>
          <Button type="submit" variant="danger">Continuar</Button>
        </div>
      </form>
    </Modal>
  );
}
