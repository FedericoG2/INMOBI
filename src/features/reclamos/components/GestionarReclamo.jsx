import { useState } from 'react';
import { ESTADO_RECLAMO, ESTADO_RECLAMO_LABELS } from '../../../constants/estados';
import { estadosSiguientes, reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import '../../../shared/styles/forms.css';
import { unirObservacion } from '../utils';

// Etiquetas fijas para describir cada cambio, según el estado desde el que se avanza.
const ETIQUETAS = {
  [ESTADO_RECLAMO.PENDIENTE]: ['Evaluación Inicial', 'Inquilino Contactado', 'Visita Programada', 'Propietario Notificado'],
  [ESTADO_RECLAMO.EN_PROCESO]: ['Personal Asignado', 'Presupuesto Solicitado', 'Presupuesto Aprobado', 'Trabajo Iniciado'],
  [ESTADO_RECLAMO.REVISION]: ['Trabajo Finalizado', 'Solución Verificada', 'Inquilino Conforme'],
  [ESTADO_RECLAMO.RESUELTO]: ['Problema Persistente', 'Nueva Falla', 'Inquilino Disconforme'],
};

// En Revisión además se pueden registrar avances sin cambiar de estado.
const ETIQUETAS_AVANCE = ['Visita Técnica', 'Presupuesto Solicitado', 'Presupuesto Aprobado', 'Repuesto Pendiente', 'Trabajo Iniciado', 'Trabajo Demorado'];

const OPCIONES_REVISION = [
  {
    valor: true,
    titulo: 'Registrar Avance',
    ayuda: 'El trabajo continúa: sumás una novedad.',
    icono: 'edit',
    destino: ESTADO_RECLAMO.REVISION,
    resultado: 'Sigue en Revisión',
  },
  {
    valor: false,
    titulo: 'Resolver Reclamo',
    ayuda: 'El trabajo terminó: cerrás el reclamo.',
    icono: 'check',
    destino: ESTADO_RECLAMO.RESUELTO,
    resultado: 'Pasa a Resuelto',
  },
];

const DESCRIPCION_ESTADO = {
  [ESTADO_RECLAMO.EN_PROCESO]: 'Se analiza cuál es el problema.',
  [ESTADO_RECLAMO.REVISION]: 'Hay personal asignado trabajando; se registran las gestiones.',
  [ESTADO_RECLAMO.RESUELTO]: 'El trabajo terminó y el problema quedó solucionado.',
};

// Nombre de cada paso, igual que en el diagrama de transición de estados.
const ACCION_ESTADO = {
  [ESTADO_RECLAMO.PENDIENTE]: 'Iniciar Gestión',
  [ESTADO_RECLAMO.EN_PROCESO]: 'Enviar a Revisión',
  [ESTADO_RECLAMO.REVISION]: 'Resolver Reclamo',
  [ESTADO_RECLAMO.RESUELTO]: 'Reabrir Reclamo',
};

export function GestionarReclamo({ reclamo, onGuardado, onCancelar }) {
  const reabrir = reclamo.estado === ESTADO_RECLAMO.RESUELTO;
  const opciones = estadosSiguientes(reclamo.estado);
  // Hay un solo paso posible desde cada estado, así que viene elegido.
  const [estadoNuevo] = useState(opciones[0]);
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const enRevision = reclamo.estado === ESTADO_RECLAMO.REVISION;
  const [soloAvance, setSoloAvance] = useState(enRevision);
  const comentando = enRevision && soloAvance;
  const sinContenido = etiquetas.length === 0 && !observacion.trim();

  function elegirModo(avance) {
    setSoloAvance(avance);
    // Cada modo tiene sus propias etiquetas.
    setEtiquetas([]);
    setError(null);
  }

  function alternarEtiqueta(etiqueta) {
    setEtiquetas((actuales) => (actuales.includes(etiqueta)
      ? actuales.filter((otra) => otra !== etiqueta)
      : [...actuales, etiqueta]));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const detalle = unirObservacion(etiquetas, observacion);
      if (comentando) await reclamosService.agregarComentario(reclamo.id, detalle);
      else await reclamosService.cambiarEstado(reclamo.id, estadoNuevo, detalle);
      await onGuardado({ estado: estadoNuevo, reabierto: reabrir, comentario: comentando });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error-global">{error}</div>}

      {enRevision && (
        <div className="rc-eleccion">
          <p id="modo_reclamo">¿Qué querés hacer?</p>
          <div className="rc-modos" role="radiogroup" aria-labelledby="modo_reclamo">
            {OPCIONES_REVISION.map((opcion) => (
              <button
                key={opcion.titulo}
                type="button"
                role="radio"
                aria-checked={soloAvance === opcion.valor}
                className={`rc-modo ${opcion.valor ? 'rc-modo-avance' : 'rc-modo-resolver'}${soloAvance === opcion.valor ? ' is-elegido' : ''}`}
                onClick={() => elegirModo(opcion.valor)}
                disabled={guardando}
              >
                <span className="rc-modo-icono" aria-hidden="true"><Icon name={opcion.icono} size={20} /></span>
                <span className="rc-modo-texto">
                  <strong>{opcion.titulo}</strong>
                  <small>{opcion.ayuda}</small>
                  <span className={`estado-tag rc-estado-${opcion.destino}`}>{opcion.resultado}</span>
                </span>
                <span className="rc-modo-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!comentando && <div className="rc-transicion">
        <div className="rc-paso">
          <small>Estado actual</small>
          <span className={`estado-tag rc-estado-${reclamo.estado}`}>{ESTADO_RECLAMO_LABELS[reclamo.estado]}</span>
        </div>
        <svg className="rc-flecha" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
        <div className="rc-paso">
          <small>{reabrir ? 'Vuelve a' : 'Pasa a'}</small>
          <span className={`estado-tag rc-estado-${estadoNuevo}`}>{ESTADO_RECLAMO_LABELS[estadoNuevo]}</span>
        </div>
        <p>{DESCRIPCION_ESTADO[estadoNuevo]}</p>
      </div>}

      <div className="form-section">
        <p className="form-section-title">Detalle del avance</p>
        <div className="form-group">
          <span className="rc-etiquetas-titulo" id="etiquetas_reclamo">{comentando ? 'Etiquetas' : 'Etiquetas (opcional)'}</span>
          <div className="rc-etiquetas rc-etiquetas-grilla" role="group" aria-labelledby="etiquetas_reclamo">
            {(comentando ? ETIQUETAS_AVANCE : ETIQUETAS[reclamo.estado]).map((etiqueta) => {
              const elegida = etiquetas.includes(etiqueta);
              return (
                <button
                  key={etiqueta}
                  type="button"
                  className={`rc-etiqueta${elegida ? ' is-elegida' : ''}`}
                  aria-pressed={elegida}
                  onClick={() => alternarEtiqueta(etiqueta)}
                  disabled={guardando}
                >
                  <span className="rc-marca" aria-hidden="true">{elegida && <Icon name="check" size={12} />}</span>
                  {etiqueta}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="observacion_reclamo">{comentando ? 'Comentario de gestión' : 'Observación de seguimiento (opcional)'}</label>
          <textarea
            id="observacion_reclamo"
            rows="3"
            value={observacion}
            placeholder={reabrir ? 'Por qué se reabre' : comentando ? 'Ej: El técnico pidió un repuesto, vuelve el viernes' : 'Qué se hizo o qué falta'}
            onChange={(event) => setObservacion(event.target.value)}
            disabled={guardando}
          />
        </div>
      </div>

      {/* El botón toma el color del estado al que pasa el reclamo. */}
      <div className={`form-actions rc-accion-${reabrir ? 'reabrir' : comentando ? reclamo.estado : estadoNuevo}`}>
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={guardando}>Volver</Button>
        <Button type="submit" disabled={guardando || (comentando && sinContenido)}>
          {guardando ? 'Guardando...' : comentando ? 'Agregar Comentario' : ACCION_ESTADO[reclamo.estado]}
        </Button>
      </div>
    </form>
  );
}
