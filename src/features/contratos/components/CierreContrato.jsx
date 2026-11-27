import { useState } from 'react';
import { MOTIVO_CIERRE, MOTIVO_CIERRE_LABELS } from '../../../constants/estados';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { ResumenOperacion } from '../../../shared/components/ResumenOperacion';
import '../../../shared/styles/forms.css';
import './CierreContrato.css';

const EFECTOS_COMUNES = [
  { icono: 'building', texto: 'La propiedad vuelve a estar disponible para alquilar.' },
  { icono: 'calendar', texto: 'Se eliminan los períodos futuros sin comprobantes. Los pagados y el mes en curso se conservan.' },
];

const OPCIONES = {
  finalizar: {
    titulo: 'Finalizar',
    resumen: 'Cierre normal del contrato',
    explicacion: 'Se usa cuando el contrato cumplió su plazo y termina como estaba previsto.',
    estado: 'Finalizado',
    motivos: [MOTIVO_CIERRE.VENCIMIENTO, MOTIVO_CIERRE.ACUERDO_PARTES, MOTIVO_CIERRE.OTRO],
    confirmacion: 'Confirmar Finalización',
    boton: 'Finalizar Contrato',
    variante: 'success',
  },
  rescindir: {
    titulo: 'Rescindir',
    resumen: 'Corte anticipado del contrato',
    explicacion: 'Se usa cuando el contrato se interrumpe antes de su fecha de fin, por acuerdo, falta de pago u otra causa.',
    estado: 'Rescindido',
    motivos: [MOTIVO_CIERRE.ACUERDO_PARTES, MOTIVO_CIERRE.FALTA_PAGO, MOTIVO_CIERRE.OTRO],
    confirmacion: 'Confirmar Rescisión',
    boton: 'Rescindir Contrato',
    variante: 'danger',
  },
};

// Cierre de un contrato activo en dos pasos: elegir cómo se cierra y confirmar.
export function CierreContrato({ inquilino, propiedad, fechaFin, antesDeTiempo, onConfirmar, onCancelar }) {
  const [accion, setAccion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const opcion = accion ? OPCIONES[accion] : null;

  function elegir(nueva) {
    setAccion(nueva);
    setMotivo(OPCIONES[nueva].motivos[0]);
  }

  async function confirmar() {
    setProcesando(true);
    try {
      await onConfirmar(accion, motivo, observaciones.trim() || null);
    } finally {
      setProcesando(false);
    }
  }

  if (confirmando) {
    return (
      <ConfirmDialog
        isOpen
        title={opcion.confirmacion}
        icon={<Icon name="file" size={22} />}
        size="medium"
        message={`El contrato pasa a estado ${opcion.estado}.`}
        warning="Una vez confirmado, el contrato no se puede reabrir."
        confirmLabel={opcion.boton}
        cancelLabel="Volver"
        variant={opcion.variante}
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
          efectos={EFECTOS_COMUNES}
        />
      </ConfirmDialog>
    );
  }

  return (
    <Modal isOpen onClose={onCancelar} title="Finalizar o Rescindir Contrato" icon={<Icon name="file" size={22} />} size="medium">
      <form
        className="cc"
        onSubmit={(event) => {
          event.preventDefault();
          if (opcion) setConfirmando(true);
        }}
      >
        <div className="cc-opciones" role="radiogroup" aria-label="Forma de cierre">
          {Object.entries(OPCIONES).map(([clave, item]) => (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={accion === clave}
              className={`cc-opcion cc-${clave}${accion === clave ? ' is-elegida' : ''}`}
              onClick={() => elegir(clave)}
            >
              <span className="cc-radio" aria-hidden="true" />
              <span>
                <strong>{item.titulo}</strong>
                <small>{item.resumen}</small>
              </span>
            </button>
          ))}
        </div>

        {!opcion ? (
          <p className="cc-vacio">Elegí una opción para ver de qué se trata.</p>
        ) : (
          <>
            <div className="cc-explicacion">
              <p>{opcion.explicacion}</p>
              <ul>
                <li>El contrato pasa a estado <strong>{opcion.estado}</strong>.</li>
                {EFECTOS_COMUNES.map((efecto) => <li key={efecto.texto}>{efecto.texto}</li>)}
              </ul>
            </div>

            {accion === 'finalizar' && antesDeTiempo && (
              <p className="cc-aviso">
                <Icon name="alert" size={16} />
                <span>Todavía no llegó la fecha de fin ({fechaFin}). Si se corta antes de tiempo, corresponde Rescindir.</span>
              </p>
            )}

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="motivo_cierre">Motivo del cierre *</label>
                <select id="motivo_cierre" value={motivo} onChange={(event) => setMotivo(event.target.value)}>
                  {opcion.motivos.map((valor) => (
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
          </>
        )}

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancelar}>Volver</Button>
          <Button type="submit" disabled={!opcion}>Continuar</Button>
        </div>
      </form>
    </Modal>
  );
}
