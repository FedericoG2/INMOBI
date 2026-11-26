import { useEffect, useState } from 'react';
import {
  CATEGORIA_RECLAMO_LABELS,
  ESTADO_CONTRATO_LABELS,
  ESTADO_RECLAMO,
  ESTADO_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { formatearFechaHora, reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import { useToast } from '../../../shared/components/Toast';
import { useReclamoDetalle } from '../hooks/useReclamos';
import { separarObservacion } from '../utils';
import { GestionarReclamo } from './GestionarReclamo';
import { ReclamoForm } from './ReclamoForm';
import './ReclamoDetalle.css';

const MAX_IMAGENES = 5;

// Recorrido normal de un reclamo, con lo que significa cada etapa.
const ETAPAS = [
  { estado: ESTADO_RECLAMO.PENDIENTE, ayuda: 'Sin atender' },
  { estado: ESTADO_RECLAMO.EN_PROCESO, ayuda: 'Analizando el problema' },
  { estado: ESTADO_RECLAMO.REVISION, ayuda: 'Personal trabajando' },
  { estado: ESTADO_RECLAMO.RESUELTO, ayuda: 'Terminado' },
];

// Qué pasó en cada registro del seguimiento, dicho en palabras.
function tituloEvento({ estado_anterior: anterior, estado_nuevo: nuevo }) {
  if (!anterior) return 'Reclamo Registrado';
  if (anterior === ESTADO_RECLAMO.RESUELTO) return 'Reclamo Reabierto';
  if (nuevo === ESTADO_RECLAMO.EN_PROCESO) return 'Analizando Reclamo';
  if (nuevo === ESTADO_RECLAMO.REVISION) return 'Trabajo en Curso';
  return 'Reclamo Resuelto';
}

// Los comentarios no son un estado: se agrupan dentro del paso en el que se cargaron.
function agruparAvances(eventos) {
  const pasos = [];
  eventos.forEach((evento) => {
    const esAvance = evento.estado_anterior === evento.estado_nuevo;
    if (esAvance && pasos.length > 0) pasos[pasos.length - 1].avances.push(evento);
    else pasos.push({ ...evento, avances: [] });
  });
  return pasos.reverse();
}

function Observacion({ valor }) {
  const { etiquetas, texto } = separarObservacion(valor);
  return (
    <>
      {etiquetas.length > 0 && (
        <div className="rc-etiquetas">
          {etiquetas.map((etiqueta) => <span className="rc-etiqueta is-fija" key={etiqueta}>{etiqueta}</span>)}
        </div>
      )}
      {texto && <p>{texto}</p>}
    </>
  );
}

export function ReclamoDetalle({ reclamoId, onCerrar, onActualizado }) {
  const { reclamo, eventos, imagenes, loading, error, recargar } = useReclamoDetalle(reclamoId);
  const [ventana, setVentana] = useState(null); // 'gestionar' | 'editar'
  const [previews, setPreviews] = useState({});
  const [procesando, setProcesando] = useState(false);
  const [accionError, setAccionError] = useState(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [imagenAQuitar, setImagenAQuitar] = useState(null);
  const toast = useToast();

  // Solo se descargan las imágenes que todavía no tienen vista previa.
  useEffect(() => {
    let vigente = true;
    imagenes.filter((imagen) => previews[imagen.id] === undefined).forEach((imagen) => {
      reclamosService.descargarImagen(imagen.ruta_storage)
        .then((blob) => URL.createObjectURL(blob))
        .catch(() => null)
        .then((url) => {
          if (vigente) setPreviews((actual) => ({ ...actual, [imagen.id]: url }));
          else if (url) URL.revokeObjectURL(url);
        });
    });
    return () => {
      vigente = false;
    };
    // previews queda afuera a propósito: cada descarga la modifica.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenes]);

  if (loading) return <div className="cd-vacio">Cargando reclamo...</div>;
  if (error) return <div className="form-error-global">Error: {error}</div>;
  if (!reclamo) return <div className="form-error-global">Reclamo no encontrado</div>;

  const resuelto = reclamo.estado === ESTADO_RECLAMO.RESUELTO;
  const contrato = reclamo.contratos;
  const propiedad = contrato?.propiedades;
  const libres = MAX_IMAGENES - imagenes.length;
  const etapaActual = ETAPAS.findIndex((etapa) => etapa.estado === reclamo.estado);
  const pasos = agruparAvances(eventos);

  // Actualiza el detalle y la lista que quedó detrás.
  async function refrescar() {
    await recargar();
    onActualizado();
  }

  async function agregarImagenes(archivos) {
    if (archivos.length === 0) return;
    setProcesando(true);
    setAccionError(null);
    try {
      await reclamosService.subirImagenes(reclamo.id, archivos, imagenes.length);
      toast.success(archivos.length === 1 ? 'Imagen adjuntada' : `${archivos.length} imágenes adjuntadas`);
    } catch (err) {
      setAccionError(err.message);
    } finally {
      // Aun si falla una, las anteriores pueden haber quedado subidas.
      await refrescar();
      setProcesando(false);
    }
  }

  async function quitarImagen() {
    const imagen = imagenAQuitar;
    setProcesando(true);
    setAccionError(null);
    try {
      await reclamosService.eliminarImagen(imagen);
      await refrescar();
      toast.success(`Imagen eliminada: ${imagen.nombre_archivo}`);
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setImagenAQuitar(null);
      setProcesando(false);
    }
  }

  async function eliminar() {
    setProcesando(true);
    setAccionError(null);
    try {
      await reclamosService.eliminar(reclamo.id);
      toast.success(`Reclamo eliminado: ${reclamo.titulo}`);
      onActualizado();
      onCerrar();
    } catch (err) {
      setConfirmarBorrado(false);
      setAccionError(err.message);
      setProcesando(false);
    }
  }

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`estado-tag rc-estado-${reclamo.estado}`}>{ESTADO_RECLAMO_LABELS[reclamo.estado]}</span>
        <span className={`estado-tag rc-prioridad-${reclamo.prioridad}`}>
          Prioridad {PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad].toLowerCase()}
        </span>
        <span className="cd-vigencia">
          <Icon name="calendar" size={16} />
          Registrado el {formatearFechaHora(reclamo.creado_en)}
        </span>
      </div>

      {accionError && <div className="form-error-global">{accionError}</div>}

      <ol className="rc-etapas" aria-label="Etapas del reclamo">
        {ETAPAS.map((etapa, indice) => {
          // Resuelto es el final, así que se muestra como completado.
          const hecha = indice < etapaActual || (resuelto && indice === etapaActual);
          return (
            <li
              key={etapa.estado}
              className={`${hecha ? 'is-hecha' : ''}${indice === etapaActual ? ' is-actual' : ''}`}
              aria-current={indice === etapaActual ? 'step' : undefined}
            >
              <span className="rc-etapa-numero">{hecha ? <Icon name="check" size={14} /> : indice + 1}</span>
              <strong>{ESTADO_RECLAMO_LABELS[etapa.estado]}</strong>
              <small>{etapa.ayuda}</small>
            </li>
          );
        })}
      </ol>

      {resuelto && (
        <div className="cd-info cd-info-warning" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>Un reclamo resuelto no se puede editar, eliminar ni sumar imágenes. Para eso hay que reabrirlo.</p>
        </div>
      )}

      <Tarjeta
        titulo="Reclamo"
        icono={<Icon name="alert" size={18} />}
        accion={!resuelto && (
          <Button size="small" variant="outline" onClick={() => setVentana('editar')} disabled={procesando}>
            <Icon name="edit" size={15} />
            Editar
          </Button>
        )}
      >
        <dl className="cd-datos">
          <Dato etiqueta="Título">{reclamo.titulo}</Dato>
          <Dato etiqueta="Categoría">{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</Dato>
          <Dato etiqueta="Descripción" ancho>{reclamo.descripcion}</Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Contrato" icono={<Icon name="file" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Inquilino">{nombreInquilino(contrato?.inquilinos)}</Dato>
          <Dato etiqueta="Inmueble">
            {propiedad?.codigo ? `${propiedad.codigo} - ` : ''}
            {propiedad ? direccionPropiedad(propiedad) : '—'}
          </Dato>
          <Dato etiqueta="Estado del contrato">{ESTADO_CONTRATO_LABELS[contrato?.estado] || '—'}</Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Imágenes" icono={<Icon name="clip" size={18} />} contador={`${imagenes.length}/${MAX_IMAGENES}`}>
        {imagenes.length === 0 ? (
          <p className="cd-vacio">No hay imágenes adjuntas.</p>
        ) : (
          <ul className="rc-imagenes">
            {imagenes.map((imagen) => (
              <li key={imagen.id}>
                {previews[imagen.id] ? (
                  <a href={previews[imagen.id]} target="_blank" rel="noreferrer" title="Abrir imagen">
                    <img src={previews[imagen.id]} alt={imagen.nombre_archivo} />
                  </a>
                ) : (
                  <span className="rc-sin-vista">{previews[imagen.id] === null ? 'Sin vista previa' : 'Cargando...'}</span>
                )}
                <div>
                  <small title={imagen.nombre_archivo}>{imagen.nombre_archivo}</small>
                  {!resuelto && (
                    <button
                      type="button"
                      className="cd-icono-btn cd-peligro"
                      onClick={() => setImagenAQuitar(imagen)}
                      disabled={procesando}
                      title="Eliminar imagen"
                      aria-label={`Eliminar ${imagen.nombre_archivo}`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!resuelto && libres > 0 && (
          <div className="rc-adjuntar">
            <SubirArchivos
              value={[]}
              onChange={agregarImagenes}
              multiple
              max={libres}
              mostrarContador={false}
              accept="image/*"
              disabled={procesando}
            />
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Seguimiento" icono={<Icon name="trend" size={18} />} contador={pasos.length}>
        <ol className="rc-linea">
          {pasos.map((evento) => (
            <li key={evento.id}>
              <span className={`rc-punto rc-estado-${evento.estado_nuevo}`} aria-hidden="true" />
              <div className="rc-evento">
                <div className="rc-evento-titulo">
                  <span className="rc-evento-nombre">
                    <strong>{tituloEvento(evento)}</strong>
                    <span className={`estado-tag rc-estado-${evento.estado_nuevo}`}>
                      {ESTADO_RECLAMO_LABELS[evento.estado_nuevo]}
                    </span>
                  </span>
                  <time>{formatearFechaHora(evento.creado_en)}</time>
                </div>
                <Observacion valor={evento.observacion} />

                {evento.avances.length > 0 && (
                  <div className="rc-avances">
                    <p className="rc-avances-titulo">Avances registrados ({evento.avances.length})</p>
                    <ol>
                      {evento.avances.map((avance) => (
                        <li key={avance.id}>
                          <time>{formatearFechaHora(avance.creado_en)}</time>
                          <Observacion valor={avance.observacion} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <div className="cd-acciones rc-acciones">
        <Button variant="secondary" onClick={onCerrar} disabled={procesando}>Cerrar</Button>
        {!resuelto && (
          <Button variant="danger" onClick={() => setConfirmarBorrado(true)} disabled={procesando}>Eliminar Reclamo</Button>
        )}
        <Button onClick={() => setVentana('gestionar')} disabled={procesando}>
          <Icon name="check" size={16} />
          {resuelto ? 'Reabrir Reclamo' : 'Gestionar Reclamo'}
        </Button>
      </div>

      {ventana === 'gestionar' && (
        <Modal
          isOpen
          onClose={() => setVentana(null)}
          title={resuelto ? 'Reabrir Reclamo' : 'Gestionar Reclamo'}
          subtitle={reclamo.titulo}
          icon={<Icon name="check" size={22} />}
        >
          <GestionarReclamo
            reclamo={reclamo}
            onCancelar={() => setVentana(null)}
            onGuardado={async ({ estado, reabierto, comentario }) => {
              await refrescar();
              setVentana(null);
              if (comentario) toast.success('Comentario agregado al seguimiento');
              else if (reabierto) toast.success('Reclamo reabierto: volvió a En proceso');
              else toast.success(`El reclamo pasó a ${ESTADO_RECLAMO_LABELS[estado]}`);
            }}
          />
        </Modal>
      )}

      {ventana === 'editar' && (
        <Modal
          isOpen
          onClose={() => setVentana(null)}
          title="Editar Reclamo"
          icon={<Icon name="edit" size={22} />}
          size="large"
        >
          <ReclamoForm
            reclamo={reclamo}
            onCancelar={() => setVentana(null)}
            onGuardado={async () => {
              await refrescar();
              setVentana(null);
              toast.success('Reclamo actualizado correctamente');
            }}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmarBorrado}
        title="Eliminar Reclamo"
        message={`Vas a eliminar el reclamo "${reclamo.titulo}".`}
        warning="Se borran también sus imágenes y su seguimiento. Esta acción no se puede deshacer."
        confirmLabel="Eliminar Reclamo"
        cancelLabel="Volver"
        variant="danger"
        busy={procesando}
        onConfirm={eliminar}
        onCancel={() => setConfirmarBorrado(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(imagenAQuitar)}
        title="Eliminar imagen"
        message={`Vas a eliminar la imagen ${imagenAQuitar?.nombre_archivo || ''}.`}
        confirmLabel="Eliminar imagen"
        cancelLabel="Volver"
        variant="danger"
        busy={procesando}
        onConfirm={quitarImagen}
        onCancel={() => setImagenAQuitar(null)}
      />
    </div>
  );
}
